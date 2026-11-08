import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9225;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new globalThis.WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) rej(msg.error);
          else res(msg.result);
        } else if (msg.method) {
          const listeners = this.eventListeners.get(msg.method) || [];
          listeners.forEach(l => l(msg.params));
        }
      };
    });
  }

  on(event, cb) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(cb);
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((res, rej) => {
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function run() {
  console.log('--- Launching Edge Headless to diagnose live site ---');
  const edgeProcess = spawn(EDGE_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${CDP_PORT}`,
    'about:blank'
  ]);

  await sleep(1500);

  try {
    const pages = await getJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const targetPage = pages.find((p) => p.type === 'page') || pages[0];
    const cdp = new CDPClient(targetPage.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Network.enable');
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    const networkRequests = [];
    cdp.on('Network.requestWillBeSent', (p) => {
      networkRequests.push({
        url: p.request.url,
        method: p.request.method,
        timestamp: p.timestamp
      });
    });

    const consoleLogs = [];
    cdp.on('Runtime.consoleAPICalled', (p) => {
      consoleLogs.push({
        type: p.type,
        args: p.args.map(a => a.value || a.description).join(' ')
      });
    });

    console.log('Navigating to live production marketplace: https://greenloop-9tm5.onrender.com/marketplace');
    await cdp.send('Page.navigate', { url: 'https://greenloop-9tm5.onrender.com/marketplace' });

    console.log('Observing activity for 8 seconds...');
    await sleep(8000);

    console.log(`\n--- NETWORK ACTIVITY SUMMARY (${networkRequests.length} total requests) ---`);
    const urlCounts = {};
    networkRequests.forEach(r => {
      const urlBase = r.url.split('?')[0];
      urlCounts[urlBase] = (urlCounts[urlBase] || 0) + 1;
    });
    for (const [url, count] of Object.entries(urlCounts)) {
      console.log(`[${count}x] ${url}`);
    }

    console.log(`\n--- CONSOLE LOGS (${consoleLogs.length} total logs) ---`);
    consoleLogs.slice(0, 20).forEach(log => {
      console.log(`[${log.type}] ${log.args}`);
    });
    if (consoleLogs.length > 20) {
      console.log(`... and ${consoleLogs.length - 20} more logs`);
    }

    // Check DOM mutation or skeleton count over 2 seconds
    const skeletonChecks = [];
    for (let i = 0; i < 5; i++) {
      const evalRes = await cdp.send('Runtime.evaluate', {
        expression: `({
          skeletonCount: document.querySelectorAll('.animate-pulse').length,
          listingCards: document.querySelectorAll('[class*="group hover:shadow-md"]').length,
          title: document.title
        })`,
        returnByValue: true
      });
      skeletonChecks.push(evalRes?.result?.value);
      await sleep(500);
    }
    console.log('\n--- SKELETON / CARD OSCILLATION SAMPLES (every 500ms) ---');
    console.log(skeletonChecks);

  } finally {
    try { edgeProcess.kill(); } catch {}
  }
}

run().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
