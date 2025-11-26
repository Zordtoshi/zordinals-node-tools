#!/usr/bin/env node
const axios = require("axios");
const dotenv = require("dotenv");
const zcashcore = require("bitcore-lib-zcash");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");

dotenv.config();
const { Script, Transaction } = zcashcore;

// ---------------- RPC CONFIG (local node) ----------------
const NODE_RPC_URL  = process.env.NODE_RPC_URL;
const NODE_RPC_USER = process.env.NODE_RPC_USER;
const NODE_RPC_PASS = process.env.NODE_RPC_PASS;

if (!NODE_RPC_URL || !NODE_RPC_USER || !NODE_RPC_PASS) {
  console.error("ERROR: Please set NODE_RPC_URL, NODE_RPC_USER and NODE_RPC_PASS in .env for your local node.");
  process.exit(1);
}

const rpcClient = axios.create({
  baseURL: NODE_RPC_URL,
  auth: {
    username: NODE_RPC_USER,
    password: NODE_RPC_PASS,
  },
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

async function rpc(method, params = [], id = "zordinals") {
  const body = { jsonrpc: "2.0", id, method, params };

  try {
    const res = await rpcClient.post("", body);

    if (res.data.error) {
      const err = new Error(res.data.error.message || JSON.stringify(res.data.error));
      err._method = method;
      err._params = params;
      err._raw = res.data.error;
      throw err;
    }
    return res.data.result;
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      console.error("ERROR: Cannot connect to local node at", NODE_RPC_URL);
      console.error("Make sure your zcashd node is running and RPC is enabled.");
    }
    throw err;
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------- TX Decode ----------------
async function getTxDecoded(txid) {
  try { return await rpc("getrawtransaction", [txid, 1]); } catch (_) {}
  try { return await rpc("getrawtransaction", [txid, true]); } catch (_) {}

  console.log(`(fallback) decoding raw tx ${txid}`);
  const rawHex = await rpc("getrawtransaction", [txid]);
  const txObj = new Transaction(rawHex);

  return {
    txid,
    version: txObj.version,
    locktime: txObj.nLockTime,
    vin: txObj.inputs.map(inp => ({
      txid: inp.prevTxId.toString("hex"),
      vout: inp.outputIndex,
      scriptSig: { hex: inp.script.toHex() }
    })),
    vout: txObj.outputs.map((out, index) => ({
      n: index,
      value: out.satoshis / 1e8,
      scriptPubKey: { hex: out.script.toHex() }
    }))
  };
}

// ---------------- ORD PARSING ----------------
function chunkToNumber(chunk) {
  if (chunk.opcodenum === 0) return 0;
  if (chunk.opcodenum === 1 && chunk.buf) return chunk.buf[0];
  if (chunk.opcodenum === 2 && chunk.buf)
    return chunk.buf[1] * 255 + chunk.buf[0];
  if (chunk.opcodenum > 80 && chunk.opcodenum <= 96)
    return chunk.opcodenum - 80;
  return undefined;
}

function parseOrdScript(hex) {
  if (!hex) return null;
  let script;
  try { script = Script.fromHex(hex); } catch { return null; }

  const c = script.chunks;
  if (!c.length || !c[0].buf) return null;
  if (c[0].buf.toString("utf8") !== "ord") return null;

  const totalPieces = chunkToNumber(c[1]);
  if (totalPieces === undefined) return null;
  const mimeType = c[2].buf.toString("utf8");

  const pieces = {};
  let i = 3;
  while (i + 1 < c.length) {
    const idx = chunkToNumber(c[i]);
    const data = c[i + 1];
    if (idx === undefined || !data.buf) break;
    pieces[idx] = data.buf;
    i += 2;
  }

  return { totalPieces, mimeType, pieces };
}

function parseOrdPieces(hex, expectedPieces, expectedMime) {
  if (!hex) return null;
  let script;
  try { script = Script.fromHex(hex); } catch { return null; }

  const c = script.chunks;
  if (!c.length) return null;

  let i = 0;
  let totalPieces = expectedPieces;
  let mimeType = expectedMime;

  if (c[0].buf && c[0].buf.toString("utf8") === "ord") {
    const t = chunkToNumber(c[1]);
    if (t === undefined || !c[2].buf) return null;
    totalPieces = t;
    mimeType = c[2].buf.toString("utf8");
    i = 3;
  }

  const pieces = {};
  while (i + 1 < c.length) {
    const idx = chunkToNumber(c[i]);
    const data = c[i + 1];
    if (idx === undefined || !data.buf) break;
    if (idx >= 0 && idx < totalPieces) pieces[idx] = data.buf;
    i += 2;
  }

  return Object.keys(pieces).length ? { totalPieces, mimeType, pieces } : null;
}

// ---------------- CHAIN WALK ----------------
async function getTxHeight(tx) {
  if (!tx.blockhash) return null;
  const blk = await rpc("getblock", [tx.blockhash]);
  return blk.height;
}

async function findSpender(txid, vout, startHeight, depth) {
  for (let h = startHeight; h <= startHeight + depth; h++) {
    let hash;
    try { hash = await rpc("getblockhash", [h]); }
    catch { return null; }

    const blk = await rpc("getblock", [hash, 2]);
    for (const tx of blk.tx) {
      for (let i = 0; i < tx.vin.length; i++) {
        const vin = tx.vin[i];
        if (vin.txid === txid && vin.vout === vout) {
          return { txid: tx.txid, vinIndex: i, height: h };
        }
      }
    }
    await sleep(1000);
  }
  return null;
}

// Walk backwards until first ord inscription
async function findGenesis(desc) {
  let current = desc;

  while (true) {
    const tx = await getTxDecoded(current);
    const vin0 = tx.vin[0];
    if (!vin0 || !vin0.scriptSig) return { genesisTxid: current, tx };

    const ord = parseOrdScript(vin0.scriptSig.hex);
    if (ord) {
      const parent = await getTxDecoded(vin0.txid);
      if (parseOrdScript(parent.vin[0]?.scriptSig?.hex))
        current = vin0.txid;
      else
        return { genesisTxid: current, tx, ord };
    } else {
      current = vin0.txid;
    }
  }
}

// ---------------- RECONSTRUCTION ----------------
function allPieces(agg, total) {
  for (let i = 0; i < total; i++)
    if (!agg[i]) return false;
  return true;
}

async function reconstruct(txidInput) {
  txidInput = txidInput.replace(/i\d+$/, "");

  const { genesisTxid, tx: genTx, ord } = await findGenesis(txidInput);
  const header = ord || parseOrdScript(genTx.vin[0].scriptSig.hex);
  if (!header) return console.error("No ord header found.");

  const { totalPieces, mimeType } = header;
  console.log(`Genesis: ${genesisTxid}, pieces=${totalPieces}, mime=${mimeType}`);

  const aggregated = {};

  // Collect genesis pieces
  for (const k in header.pieces)
    aggregated[k] = header.pieces[k];

  // Follow spender chain
  let height = await getTxHeight(genTx);
  let curTx = genesisTxid;
  let vout = 0;

  while (!allPieces(aggregated, totalPieces)) {
    const spender = await findSpender(curTx, vout, height, 2000);
    if (!spender) break;

    const child = await getTxDecoded(spender.txid);
    const vin = child.vin[spender.vinIndex];

    const p = parseOrdPieces(vin.scriptSig?.hex, totalPieces, mimeType);
    if (p) {
      for (const k in p.pieces)
        if (!aggregated[k]) aggregated[k] = p.pieces[k];
    }

    curTx = spender.txid;
    height = spender.height;
  }

  // Build output using DESCENDING ORDER
  const order = Array.from({ length: totalPieces }, (_, i) => i).reverse();

  const resultBuf = Buffer.concat(order.map(i => aggregated[i] || Buffer.alloc(0)));

  const outDir = path.join(process.cwd(), "Zords");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const ext = mime.extension(mimeType) || "bin";
  const out = path.join(outDir, `${genesisTxid}.${ext}`);

  fs.writeFileSync(out, resultBuf);
  console.log(`✔ Saved image → Zords/${genesisTxid}.${ext}`);
  console.log(`Size: ${resultBuf.length} bytes`);
}

// ---------------- CLI ----------------
const [, , txid] = process.argv;
if (!txid) {
  console.error("Usage: node decode.js <txid>");
  process.exit(1);
}

reconstruct(txid).catch(err => {
  console.error("ERROR:", err.message);
  if (err._method) console.error("RPC", err._method, err._params, err._raw);
});
