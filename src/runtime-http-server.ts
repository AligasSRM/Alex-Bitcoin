import http from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './core/config';
import { CgMinerAdapter } from './integrations/cgminer-adapter';
import { HttpPoolAdapter } from './integrations/http-pool-adapter';
import { BitcoinAddressWalletAdapter } from './integrations/bitcoin-address-wallet-adapter';
import { ProductionMiningControl } from './services/production-mining-control';
import { AlexControlBoundary } from './services/alex-control';
import { createExternalAdapters } from './services/adapters';
import { createRuntime } from './services/runtime';

const dashboardDir = join(dirname(fileURLToPath(import.meta.url)), 'dashboard');
type RuntimeControl = AlexControlBoundary;
let control: RuntimeControl | null = null;
let startupError: string | null = null;

function getControl(): RuntimeControl | null {
  if (control) return control;
  try {
    const config = loadConfig();
    const poolTelemetryUrl = process.env.POOL_TELEMETRY_URL;
    if (!poolTelemetryUrl) throw new Error('Missing required configuration: POOL_TELEMETRY_URL');
    const adapters = createExternalAdapters({
      miner: new CgMinerAdapter({ host: config.miner.host, port: Number(process.env.MINER_API_PORT ?? '4028'), username: config.miner.username, password: config.miner.password, minerId: process.env.MINER_ID, model: process.env.MINER_MODEL }),
      pool: new HttpPoolAdapter({ telemetryUrl: poolTelemetryUrl, poolId: process.env.POOL_ID ?? 'production-pool', endpoint: config.pool.url }),
      wallet: new BitcoinAddressWalletAdapter({ address: config.wallet.btcPayoutAddress, network: 'bitcoin-mainnet', apiBaseUrl: process.env.WALLET_API_BASE_URL ?? 'https://blockstream.info/api' }),
    });
    const runtime = createRuntime(config, adapters, {
      btcPriceUsd: Number(process.env.BTC_PRICE_USD ?? '0'),
      electricityPriceUsdPerKwh: Number(process.env.ELECTRICITY_PRICE_USD_PER_KWH ?? '0'),
      dailyNetworkBtc: Number(process.env.DAILY_NETWORK_BTC ?? '0'),
      networkHashrateHps: Number(process.env.NETWORK_HASHRATE_HPS ?? '0'),
    });
    control = new AlexControlBoundary({
      core: runtime.core,
      productionControl: new ProductionMiningControl(adapters),
      secretsStatus: async () => 'configured',
    });
    startupError = null;
    return control;
  } catch (error) {
    startupError = error instanceof Error ? error.message : String(error);
    return null;
  }
}

function authorized(req: http.IncomingMessage): boolean {
  const token = process.env.ALEX_CORE_TOKEN;
  return Boolean(token) && req.headers.authorization === `Bearer ${token}`;
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function serveDashboard(res: http.ServerResponse, pathname: string): void {
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const allowed = new Set(['index.html', 'styles.css', 'app.js', 'runtime-bridge.js']);
  if (!allowed.has(requested)) return sendJson(res, 404, { ok: false, reason: 'not_found' });
  try {
    const body = readFileSync(join(dashboardDir, requested));
    const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8' };
    res.writeHead(200, { 'content-type': types[extname(requested)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    sendJson(res, 503, { ok: false, reason: 'dashboard_unavailable' });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (req.method === 'GET' && (pathname === '/' || pathname === '/styles.css' || pathname === '/app.js' || pathname === '/runtime-bridge.js')) return serveDashboard(res, pathname);
    if (pathname === '/health' && req.method === 'GET') return sendJson(res, 200, { service: 'Alex Bitcoin Core', status: 'online', runtimeConfigured: Boolean(getControl()), failClosed: true });
    if (!authorized(req)) return sendJson(res, 401, { ok: false, reason: 'core_auth_required' });
    const runtimeControl = getControl();
    if (!runtimeControl) return sendJson(res, 503, { ok: false, reason: 'core_runtime_not_configured', failClosed: true, detail: startupError });
    if (pathname === '/api/runtime' && req.method === 'GET') return sendJson(res, 200, await runtimeControl.inspect());
    if (pathname === '/api/mining/start' && req.method === 'POST') return sendJson(res, 200, await runtimeControl.startMining());
    if (pathname === '/api/mining/stop' && req.method === 'POST') return sendJson(res, 200, await runtimeControl.stopMining());
    return sendJson(res, 404, { ok: false, reason: 'not_found' });
  } catch (error) {
    console.error('core-runtime-error', error);
    return sendJson(res, 503, { ok: false, reason: 'core_runtime_unavailable', failClosed: true });
  }
});

const port = Number(process.env.PORT ?? process.env.API_PORT ?? '8080');
server.listen(port, '0.0.0.0', () => console.log(`Alex Bitcoin Core runtime listening on ${port}`));
