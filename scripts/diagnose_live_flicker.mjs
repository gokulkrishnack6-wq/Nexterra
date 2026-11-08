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

    for (const path of ['/marketplace', '/', '/bins']) {
      const url = `https://greenloop-9tm5.onrender.com${path}`;
      console.log(`\n========================================`);
      console.log(`Navigating to live production: ${url}`);
      networkRequests.length = 0;

      await cdp.send('Page.navigate', { url });

      console.log('Observing activity for 5 seconds...');
      await sleep(5000);

      const supabaseReqs = networkRequests.filter(r => r.url.includes('supabase.co'));
      console.log(`Supabase requests on ${path} in 5s: ${supabaseReqs.length}`);

      const skeletonChecks = [];
      for (let i = 0; i < 4; i++) {
        const evalRes = await cdp.send('Runtime.evaluate', {
          expression: `({
            skeletonCount: document.querySelectorAll('.animate-pulse').length,
            title: document.title
          })`,
          returnByValue: true
        });
        skeletonChecks.push(evalRes?.result?.value?.skeletonCount ?? 0);
        await sleep(500);
      }
      console.log(`Skeleton count samples (every 500ms):`, skeletonChecks.join(' -> '));
      const stable = skeletonChecks.every(v => v === skeletonChecks[0]);
      console.log(`Status on ${path}: ${stable ? '✅ 100% STABLE (Zero flicker)' : '❌ OSCILLATING'}`);
    }

  } finally {
    try { edgeProcess.kill(); } catch {}
  }
}

run().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
