
<p align="center">
  <a href="https://x.com/Zordtoshi" target="_blank">
    <img src="https://unavatar.io/x/Zordtoshi"
         alt="Zordtoshi on X"
         width="120" />
  </a>
</p>

<p align="center">
  <a href="https://x.com/Zordtoshi" target="_blank">
    <img src="https://img.shields.io/badge/Follow-@Zordtoshi-000000?style=for-the-badge&logo=x&logoColor=white"
         alt="Follow @Zordtoshi on X" />
  </a>
</p>

# Zordinals Viewer & ZNode Tools

Zordinals Viewer is a **local, self‑hosted toolkit** for **Zcash full node runners**, featuring:

- **Zordinals inscription viewer** (pulls content via decode.js / inspect.js)
- **Explorer** for browsing your local `/Zords` directory  
- **ZNode Status dashboard** with balances, UTXOs, mempool, history, & sending  
- **Dev CLI Console** – an interactive interface for `zcash-cli` commands  
- **Info page** w/ usage documentation  
- 100% local execution — **no 3rd‑party APIs**

---

## 🚀 Features Overview

### 🔍 1. Zordinals Viewer (`assets-page/index.html`)
Enter an inscription ID (`<txid>i0`) and load:

- Loads instantly if `<inscriptionid>.*` exists in `/Zords`
- Otherwise runs `decode.js <id>` → stores → displays
- Supports:
  - Image / text / HTML / SVG inscriptions  
  - **Fullscreen viewer**  
  - **Download button**  
  - **Terminal-style raw info** using `inspect.js`, cached in `/Zords/rawdata/<id>.json`

---

### 🗂️ 2. Explore Zords (`assets-page/explore.html`)
Auto-scanning reader for the `/Zords` directory:

- Grid with scaled previews  
- Each item opens modal:
  - Full view, type, size  
  - Copy TXID / Download / Copy content  
- JSON shown as readable formatted text

---

### 🔧 3. ZNode Status (`assets-page/znode-status.html`)
A full-featured wallet/node dashboard:

- Node Overview:  
  chain, height, difficulty, version  
- Connections  
- Mempool viewer  
- Wallet Balances + Unconfirmed  
- **Import Private Key**  
  - Label support  
  - Rescan toggle  
  - Success toast ("Zwallet Zimported Zuccessfully")  
- **Send ZEC**  
  - Fee-aware max calculator  
  - Multi‑UTXO coin control (checkbox picker)  
  - Confirmation checker (turns neon green when >0)  
- Wallet UTXOs:  
  - Filter by label  
  - Row-click modal with details/time/json  
- Wallet Transactions:  
  - Scrollable  
  - TX detail modal with copy buttons  

---

### 🖥️ 4. Dev CLI Console (`assets-page/dev-cli.html`)
Developer-friendly wrapper for `zcash-cli`:

- Each command is a card → modal  
- Inputs for parameters  
- Shows description + example CLI command  
- Runs through backend `/api/dev/cli/run`  
- Shows raw JSON & copy button  

Commands include:

```
getblockchaininfo
getnetworkinfo
getconnectioncount
validateaddress
dumpprivkey
importprivkey
getbalance
listunspent
gettransaction
getrawtransaction
decoderawtransaction
getblockhash
getblock

```

---

### ℹ️ 5. Info Page (`assets-page/info.html`)
Documentation page covering:

- How Viewer works  
- How Explorer works  
- How Node Status works  
- How CLI Controls work  
- Sending & receiving tips  
- Tip jar address:
  ```
  t1J5WgQtT3zetUjCsxknsBxMZQexMUAT9PL
  ```

---

## 📁 Project Structure

```
.
├─ viewer.js
├─ decode.js
├─ inspect.js
├─ .env
├─ Zords/
│  ├─ <inscriptionid>.png/html/...
│  └─ rawdata/
│      └─ <id>.json
└─ assets-page/
   ├─ index.html
   ├─ explore.html
   ├─ znode-status.html
   ├─ dev-cli.html
   └─ info.html
```

---

## ⚙️ Requirements

- **Zcash full node (`zcashd`)**
- **RPC enabled** in `zcash.conf`
- **Node.js (≥18)**

**Important:** your `~/.zcash/zcash.conf` MUST include:

```
rpcuser=youruser
rpcpassword=yourpass
rpcallowip=127.0.0.1
txindex=1
server=1
```

`txindex=1` is required so raw transaction lookups always work.

---

## 🔧 Setup

### 1. Clone

```
git clone https://github.com/Zordtoshi/zordinals-node-tools.git
cd ordinals-node-tools
```

### 2. Install

```
npm install
```

### 3. Configure `.env`

```
PORT=4000
NODE_RPC_URL=http://127.0.0.1:8232
NODE_RPC_USER=youruser
NODE_RPC_PASSWORD=yourpass
ZORDS_DIR=./Zords
```

### 4. Start your Zcash node

```
zcashd
zcash-cli getblockchaininfo
```

### 5. Run Viewer

```
node viewer.js
```

Then visit:

```
http://localhost:4000
```

---

## 🔒 Security Notes

- Never expose this server publicly  
- Do NOT expose RPC creds  
- Commands like:
  - `dumpprivkey`
  - `z_exportwallet`
    ...must be treated like nuclear material  

---

## ❤️ Credits

Created by **Zordtoshi**.  
If this toolkit helped you, tips appreciated:

```
t1J5WgQtT3zetUjCsxknsBxMZQexMUAT9PL
```
