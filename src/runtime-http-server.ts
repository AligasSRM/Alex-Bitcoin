import http from 'node:http';
import { loadConfig } from './core/config';
import { CgMinerAdapter } from './integrations/cgminer-adapter';
import { HttpPoolAdapter } from './integrations/http-pool-adapter';
import { BitcoinAddressWalletAdapter } from './integrations/bitcoin-address-wallet-adapter';
import { ProductionMiningControl } from './services/production-mining-control';
import { AlexControlBoundary } from './services/alex-control';
import { createExternalAdapters } from './services/adapters';
import { createRuntime } from './services/runtime';

const config = loadConfig();

const poolTelemetryUrl = process.env.POOL_TELEMETRY_URL;
if (!poolTelemetryUrl) throw new Error('Missing required configuration: POOL_TELEMETRY_URL');

const adapters = createExternalAdapters({
  miner: new CgMinerAdapter({
    host: config.miner.host,
    port: Number(process.env.MINER_API_PORT ?? '4028'),
    username: config.miner.username,
    password: config.miner.password,
    minerId: process.env.MINER_ID,
    model: process.env.MINER_MODEL,
  }),
  pool: new HttpPoolAdapter({
    telemetryUrl: poolTelemetryUrl,
    poolId: process.env.POOL_ID ?? 'production-pool',
    endpoint: config.pool.url,
  }),
  wallet: new BitcoinAddressWalletAdapter({
    address: config.wallet.btcPayoutAddress,
    network: 'bitcoin-mainnet',
    apiBaseUrl: process.env.WALLET_API_BASE_URL ?? 'https://blockstream.info/api',
  }),
});

const profitabilityInput = {
  btcPriceUsd: Number(process.env.BTC_PRICE_USD ?? '0'),
  electricityPriceUsdPerKwh: Number(process.env.ELECTRICITY_PRICE_USD_PER_KWH ?? '0'),
  dailyNetworkBtc: Number(process.env.DAILY_NETWORK_BTC ?? '0'),
  networkHashrateHps: Number(process.env.NETWORK_HASHRATE_HPS ?? '0'),
};

const runtime = createRuntime(config, adapters, profitabilityInput);
const control = new AlexControlBoundary({
  core: runtime.core,
  productionControl: new ProductionMiningControl(adapters),
  secretsStatus: async () => 'configured',
});

const token = process.env.ALEX_CORE_TOKEN;

function authorized(req: http.IncomingMessage): boolean {
  if (!token) return false;
  return req.headers.authorization === `Bearer ${token}`;
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/health' && req.method === 'GET') {
      return send(res, 200, { service: 'Alex Bitcoin Core', status: 'online' });
    }

    if (!authorized(req)) {
      return send(res, 401, { ok: false, reason: 'core_auth_required' });
    }

    if (req.url === '/api/runtime' && req.method === 'GET') {
      return send(res, 200, await control.inspect());
    }

    if (req.url === '/api/mining/start' && req.method === 'POST') {
      return send(res, 200, await control.startMining());
    }

    if (req.url === '/api/mining/stop' && req.method === 'POST') {
      return send(res, 200, await control.stopMining());
    }

    return send(res, 404, { ok: false, reason: 'not_found' });
  } catch (error) {
    console.error('core-runtime-error', error);
    return send(res, 503, { ok: false, reason: 'core_runtime_unavailable' });
  }
});

const port = Number(process.env.PORT ?? config.apiPort);
server.listen(port, '0.0.0.0', () => {
  console.log(`Alex Bitcoin Core runtime listening on ${port}`);
});
