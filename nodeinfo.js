// nodeinfo.js

function $(id) {
    return document.getElementById(id);
  }
  
  function setupMenu() {
    const menuButton = $('menuButton');
    const overlay = $('sidebarOverlay');
    const closeBtn = $('sidebarClose');
  
    if (!menuButton || !overlay || !closeBtn) return;
  
    const close = () => overlay.classList.remove('active');
  
    menuButton.addEventListener('click', () => {
      overlay.classList.add('active');
    });
  
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }
  
  async function loadNodeStatus() {
    const statusDot = $('statusDot');
    const statusText = $('statusText');
    const overviewPre = $('overviewPre');
    const connectionsPre = $('connectionsPre');
    const mempoolPre = $('mempoolPre');
    const pendingPre = $('pendingPre');
    const walletTableBody = $('walletTable').querySelector('tbody');
  
    try {
      statusText.textContent = 'Querying node...';
  
      const res = await fetch('/api/node/status', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
  
      const data = await res.json();
  
      const connected = !!data.connected;
      if (connected) {
        statusDot.classList.add('online');
        statusText.textContent = 'Node: ONLINE';
      } else {
        statusDot.classList.remove('online');
        statusText.textContent = 'Node: OFFLINE';
      }
  
      // Overview
      const overviewLines = [];
      if (data.version !== undefined) overviewLines.push('Version: ' + data.version);
      if (data.protocolversion !== undefined)
        overviewLines.push('Protocol: ' + data.protocolversion);
      if (data.blocks !== undefined) overviewLines.push('Blocks: ' + data.blocks);
      if (data.bestblockhash !== undefined)
        overviewLines.push('Best Block: ' + data.bestblockhash);
      if (data.difficulty !== undefined)
        overviewLines.push('Difficulty: ' + data.difficulty);
      overviewPre.textContent =
        overviewLines.length > 0 ? overviewLines.join('\n') : 'No overview data.';
  
      // Connections
      const connLines = [];
      if (data.connections !== undefined)
        connLines.push('Peer connections: ' + data.connections);
      if (data.localaddresses && data.localaddresses.length) {
        connLines.push('\nLocal addresses:');
        data.localaddresses.forEach((a) => {
          connLines.push('  ' + (a.address || '-') + ':' + (a.port || '-'));
        });
      }
      connectionsPre.textContent =
        connLines.length > 0 ? connLines.join('\n') : 'No connection data.';
  
      // Mempool
      const memLines = [];
      if (data.mempoolTxCount !== undefined)
        memLines.push('TXs in mempool: ' + data.mempoolTxCount);
      if (data.mempoolBytes !== undefined)
        memLines.push('Bytes in mempool: ' + data.mempoolBytes);
      mempoolPre.textContent =
        memLines.length > 0 ? memLines.join('\n') : 'No mempool data.';
  
      // Wallets
      walletTableBody.innerHTML = '';
      const wallets = Array.isArray(data.wallets) ? data.wallets : [];
      if (!wallets.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 3;
        td.textContent = 'No wallet data.';
        tr.appendChild(td);
        walletTableBody.appendChild(tr);
      } else {
        wallets.forEach((w) => {
          const tr = document.createElement('tr');
          const nameTd = document.createElement('td');
          const balTd = document.createElement('td');
          const unconfTd = document.createElement('td');
  
          nameTd.textContent = w.name || 'wallet';
          balTd.textContent =
            w.balance !== undefined ? w.balance.toString() : '0';
          unconfTd.textContent =
            w.unconfirmed !== undefined ? w.unconfirmed.toString() : '0';
  
          tr.appendChild(nameTd);
          tr.appendChild(balTd);
          tr.appendChild(unconfTd);
          walletTableBody.appendChild(tr);
        });
      }
  
      // Pending TXs
      const pending = Array.isArray(data.pendingTxs) ? data.pendingTxs : [];
      if (!pending.length) {
        pendingPre.textContent = 'No pending transactions.';
      } else {
        const lines = [];
        pending.forEach((tx, i) => {
          lines.push(
            `${i + 1}. ${tx.txid || '-'} | amt: ${
              tx.amount !== undefined ? tx.amount : '?'
            } | ${tx.category || ''}`
          );
        });
        pendingPre.textContent = lines.join('\n');
      }
    } catch (err) {
      console.error(err);
      statusDot.classList.remove('online');
      statusText.textContent = 'Node: ERROR';
      overviewPre.textContent = 'Error: ' + err.message;
      connectionsPre.textContent = 'Error.';
      mempoolPre.textContent = 'Error.';
      pendingPre.textContent = 'Error.';
      const walletTableBody = $('walletTable').querySelector('tbody');
      walletTableBody.innerHTML = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 3;
      td.textContent = 'Error loading wallet data.';
      tr.appendChild(td);
      walletTableBody.appendChild(tr);
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    const yearSpan = $('yearSpan');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  
    setupMenu();
    loadNodeStatus();
  });
  