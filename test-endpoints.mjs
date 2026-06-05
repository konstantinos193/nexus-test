/**
 * Endpoint timing test script for https://api.nexus-web3.com/
 * Tests all GET and POST endpoints and reports response times + status codes.
 *
 * Usage:
 *   node test-endpoints.mjs
 *   node test-endpoints.mjs --api-key YOUR_API_KEY
 */

const BASE_URL = 'https://api.nexus-web3.com';
const args = process.argv.slice(2);
const apiKeyIndex = args.indexOf('--api-key');
const API_KEY = apiKeyIndex !== -1 ? args[apiKeyIndex + 1] : null;

// ANSI color codes
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const CYAN   = '\x1b[36m';
const DIM    = '\x1b[2m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

function colorStatus(status) {
  if (status >= 200 && status < 300) return `${GREEN}${status}${RESET}`;
  if (status >= 300 && status < 400) return `${YELLOW}${status}${RESET}`;
  return `${RED}${status}${RESET}`;
}

function msColor(ms) {
  if (ms < 300)  return `${GREEN}${ms.toFixed(0)}ms${RESET}`;
  if (ms < 1000) return `${YELLOW}${ms.toFixed(0)}ms${RESET}`;
  return `${RED}${ms.toFixed(0)}ms${RESET}`;
}

async function testEndpoint({ method, path, body, headers = {}, formData, label, expectStatus }) {
  const url = `${BASE_URL}${path}`;
  const opts = { method, headers: { ...headers } };

  if (formData) {
    opts.body = formData;
    // Let fetch set Content-Type with boundary automatically
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const start = performance.now();
  let status, snippet;
  try {
    const res = await fetch(url, opts);
    const elapsed = performance.now() - start;
    status = res.status;
    let text = '';
    try { text = await res.text(); } catch {}
    snippet = text.slice(0, 90).replace(/\n/g, ' ');
    return { label, method, path, status, elapsed, snippet, error: null, expectStatus };
  } catch (err) {
    const elapsed = performance.now() - start;
    return { label, method, path, status: null, elapsed, snippet: '', error: err.message, expectStatus };
  }
}

// Build a minimal multipart FormData with a tiny test file
function makeFileForm(fieldName = 'file', filename = 'test.txt', content = 'test') {
  const fd = new FormData();
  fd.append(fieldName, new Blob([content], { type: 'text/plain' }), filename);
  return fd;
}

// ─── Endpoint definitions ────────────────────────────────────────────────────

const IPFS_HEADERS = API_KEY ? { 'x-api-key': API_KEY } : {};

// A real pinned CID from the /pins response (use the first one if available, else fallback)
const KNOWN_CID = 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn';

const ENDPOINTS = [
  // ── Root / Docs ──────────────────────────────────────────────────────────
  { method: 'GET',  path: '/',                                            label: 'Root (landing page HTML)' },
  { method: 'GET',  path: '/api/docs',                                    label: 'Swagger docs UI' },
  { method: 'GET',  path: '/api/docs-json',                               label: 'Swagger OpenAPI JSON' },

  // ── Health ───────────────────────────────────────────────────────────────
  { method: 'GET',  path: '/health',                                      label: 'Health check (DB + Solana)' },

  // ── Solana ───────────────────────────────────────────────────────────────
  { method: 'GET',  path: '/api/solana/config',                           label: 'Solana: client config' },
  { method: 'GET',  path: '/api/solana/network',                          label: 'Solana: network info' },
  { method: 'GET',  path: '/api/solana/contracts/status',                 label: 'Solana: contracts status' },
  { method: 'GET',  path: '/api/solana/balance/11111111111111111111111111111111', label: 'Solana: balance (system program addr)' },
  { method: 'GET',  path: '/api/solana/validate-address/11111111111111111111111111111111', label: 'Solana: validate address (valid)' },
  { method: 'GET',  path: '/api/solana/validate-address/notanaddress',    label: 'Solana: validate address (invalid)' },
  { method: 'GET',  path: '/api/solana/verify-transaction/fake_sig_test', label: 'Solana: verify-transaction (fake sig)' },

  // ── Collections GET ───────────────────────────────────────────────────────
  { method: 'GET',  path: '/api/collections/featured',                    label: 'Collections: featured' },
  { method: 'GET',  path: '/api/collections/discover',                    label: 'Collections: discover (default)' },
  { method: 'GET',  path: '/api/collections/discover?tab=trending',       label: 'Collections: discover trending' },
  { method: 'GET',  path: '/api/collections/discover?tab=new',            label: 'Collections: discover new' },
  { method: 'GET',  path: '/api/collections/discover?tab=ending_soon',    label: 'Collections: discover ending_soon' },
  { method: 'GET',  path: '/api/collections/discover?tab=free_mint',      label: 'Collections: discover free_mint' },
  { method: 'GET',  path: '/api/collections',                             label: 'Collections: list all' },
  { method: 'GET',  path: '/api/collections?status=active',               label: 'Collections: filter status=active' },
  { method: 'GET',  path: '/api/collections?sortBy=newest&limit=5',       label: 'Collections: sortBy newest, limit=5' },
  { method: 'GET',  path: '/api/collections?search=test',                 label: 'Collections: search=test' },
  { method: 'GET',  path: '/api/collections/nonexistent-slug-xyz-404',    label: 'Collections: get by slug (expect 404)', expectStatus: 404 },
  { method: 'GET',  path: '/api/collections/onchain/11111111111111111111111111111111', label: 'Collections: onchain by address' },

  // ── Collections POST ──────────────────────────────────────────────────────
  { method: 'POST', path: '/api/collections/sync',
    label: 'Collections: trigger sync',
    body: {} },

  { method: 'POST', path: '/api/collections/deploy',
    label: 'Collections: deploy (missing fields → expect 400)',
    expectStatus: 400,
    body: {} },

  { method: 'POST', path: '/api/collections/nonexistent-id/confirm',
    label: 'Collections: confirm deploy (bad id → expect 500)',
    expectStatus: 500,
    body: { signature: 'fake_sig' } },

  // ── IPFS GET (all public) ─────────────────────────────────────────────────
  { method: 'GET',  path: '/api/ipfs/health',                             label: 'IPFS: health' },
  { method: 'GET',  path: '/api/ipfs/info',                               label: 'IPFS: node info' },
  { method: 'GET',  path: '/api/ipfs/pins',                               label: 'IPFS: list pins' },
  { method: 'GET',  path: `/api/ipfs/check/${KNOWN_CID}`,                 label: 'IPFS: check pin (known CID)' },
  { method: 'GET',  path: '/api/ipfs/check/QmNonExistentHashTest123',     label: 'IPFS: check pin (unknown CID)' },
  { method: 'GET',  path: `/api/ipfs/metadata/${KNOWN_CID}`,              label: 'IPFS: get metadata (known CID)' },
  { method: 'GET',  path: `/api/ipfs/retrieve/${KNOWN_CID}`,              label: 'IPFS: retrieve file (known CID)' },
  { method: 'GET',  path: `/api/ipfs/view/${KNOWN_CID}`,                  label: 'IPFS: view/redirect (known CID → 302)', expectStatus: 302 },

  // ── IPFS POST (all require API key) ──────────────────────────────────────
  {
    method: 'POST', path: '/api/ipfs/upload/metadata',
    label: API_KEY ? 'IPFS: upload metadata (with key)' : 'IPFS: upload metadata (no key → expect 401)',
    expectStatus: API_KEY ? 201 : 401,
    headers: IPFS_HEADERS,
    body: {
      metadata: {
        name: 'Timing Test NFT',
        description: 'Auto-generated timing test',
        image: 'ipfs://QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn',
        attributes: [],
      },
      pin: false,
    },
  },
  {
    method: 'POST', path: '/api/ipfs/upload/file',
    label: API_KEY ? 'IPFS: upload file (with key)' : 'IPFS: upload file (no key → expect 401)',
    expectStatus: API_KEY ? 201 : 401,
    headers: IPFS_HEADERS,
    formData: API_KEY ? makeFileForm('file', 'test.txt', 'timing-test-file') : undefined,
    body: API_KEY ? undefined : {},
  },
  {
    method: 'POST', path: '/api/ipfs/upload/files',
    label: API_KEY ? 'IPFS: upload multiple files (with key)' : 'IPFS: upload files (no key → expect 401)',
    expectStatus: API_KEY ? 201 : 401,
    headers: IPFS_HEADERS,
    formData: API_KEY ? (() => { const fd = new FormData(); fd.append('files', new Blob(['file1'], { type: 'text/plain' }), 'f1.txt'); fd.append('files', new Blob(['file2'], { type: 'text/plain' }), 'f2.txt'); return fd; })() : undefined,
    body: API_KEY ? undefined : {},
  },
  {
    method: 'POST', path: '/api/ipfs/upload/directory',
    label: API_KEY ? 'IPFS: upload directory (with key)' : 'IPFS: upload directory (no key → expect 401)',
    expectStatus: API_KEY ? 201 : 401,
    headers: IPFS_HEADERS,
    formData: API_KEY ? (() => { const fd = new FormData(); fd.append('0.json', new Blob(['{"name":"0"}'], { type: 'application/json' }), '0.json'); return fd; })() : undefined,
    body: API_KEY ? undefined : {},
  },
  {
    method: 'POST', path: `/api/ipfs/pin/${KNOWN_CID}`,
    label: API_KEY ? 'IPFS: pin hash (with key)' : 'IPFS: pin hash (no key → expect 401)',
    expectStatus: API_KEY ? 200 : 401,
    headers: IPFS_HEADERS,
  },
  {
    method: 'POST', path: `/api/ipfs/unpin/${KNOWN_CID}`,
    label: API_KEY ? 'IPFS: unpin hash (with key)' : 'IPFS: unpin hash (no key → expect 401)',
    expectStatus: API_KEY ? 200 : 401,
    headers: IPFS_HEADERS,
  },
];

// ─── Runner ──────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n${BOLD}${CYAN}Nexus API — Full Endpoint Timing Test${RESET}`);
  console.log(`${DIM}Base URL  : ${BASE_URL}${RESET}`);
  console.log(`${DIM}API Key   : ${API_KEY ? '*** provided ***' : 'not provided (IPFS POST endpoints will return 401)'}${RESET}`);
  console.log(`${DIM}Endpoints : ${ENDPOINTS.length}${RESET}\n`);

  const LINE = 130;
  const header = [
    'METHOD'.padEnd(6),
    'PATH'.padEnd(55),
    'STATUS'.padEnd(7),
    'TIME'.padEnd(9),
    'RESPONSE SNIPPET',
  ].join('  ');
  console.log(`${BOLD}${header}${RESET}`);
  console.log('─'.repeat(LINE));

  const results = [];

  for (const ep of ENDPOINTS) {
    const r = await testEndpoint(ep);
    results.push(r);

    const methodPad = r.method.padEnd(6);
    const pathPad   = r.path.length > 55 ? r.path.slice(0, 52) + '...' : r.path.padEnd(55);
    const unexpected = r.expectStatus && r.status !== r.expectStatus;

    let statusStr;
    if (r.error) {
      statusStr = `${RED}ERR${RESET}    `;
    } else {
      const colored = colorStatus(r.status);
      statusStr = unexpected ? `${colored}${YELLOW}!${RESET}` : colored;
      statusStr = statusStr.padEnd(7);
    }

    const timeStr   = msColor(r.elapsed).padEnd(9);
    const info      = r.error ? `${RED}${r.error}${RESET}` : `${DIM}${r.snippet}${RESET}`;

    console.log(`${methodPad}  ${pathPad}  ${statusStr}  ${timeStr}  ${info}`);
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  const ok      = results.filter(r => r.status && r.status < 400);
  const client  = results.filter(r => r.status && r.status >= 400 && r.status < 500);
  const server  = results.filter(r => r.status && r.status >= 500);
  const netErr  = results.filter(r => r.error);
  const unexpected = results.filter(r => r.expectStatus && r.status !== r.expectStatus && !r.error);
  const times   = results.map(r => r.elapsed);
  const avg     = times.reduce((a, b) => a + b, 0) / times.length;
  const slowest = results.reduce((a, b) => a.elapsed > b.elapsed ? a : b);

  // P50, P90, P99
  const sorted = [...times].sort((a, b) => a - b);
  const p = (pct) => sorted[Math.floor(sorted.length * pct / 100)];

  console.log('\n' + '─'.repeat(LINE));
  console.log(`${BOLD}Summary${RESET}`);
  console.log(`  Total endpoints  : ${results.length}`);
  console.log(`  ${GREEN}2xx/3xx OK${RESET}       : ${ok.length}`);
  console.log(`  ${YELLOW}4xx Client Err${RESET}   : ${client.length}`);
  console.log(`  ${RED}5xx Server Err${RESET}   : ${server.length}`);
  console.log(`  ${RED}Network Errors${RESET}   : ${netErr.length}`);
  if (unexpected.length) {
    console.log(`  ${YELLOW}Unexpected status${RESET} : ${unexpected.length} (marked with !)`);
  }

  console.log(`\n  Avg latency : ${msColor(avg)}`);
  console.log(`  P50         : ${msColor(p(50))}`);
  console.log(`  P90         : ${msColor(p(90))}`);
  console.log(`  P99         : ${msColor(p(99))}`);
  console.log(`  Slowest     : ${slowest.label}  (${msColor(slowest.elapsed)})`);

  if (server.length > 0) {
    console.log(`\n${RED}${BOLD}5xx Details:${RESET}`);
    server.forEach(r => console.log(`  ${r.method} ${r.path} → ${r.status}  ${r.snippet}`));
  }

  if (netErr.length > 0) {
    console.log(`\n${RED}${BOLD}Network Errors:${RESET}`);
    netErr.forEach(r => console.log(`  ${r.method} ${r.path} → ${r.error}`));
  }

  console.log();
}

run().catch(err => {
  console.error(`${RED}Fatal: ${err.message}${RESET}`);
  process.exit(1);
});
