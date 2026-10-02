# Dashboard

Operator-facing mobile-first control dashboard structure.

## Current scope
This commit defines the external dashboard structure only. It does not connect controls or metrics to production runtime yet.

## Sections
1. Runtime state and START/STOP controls.
2. Mining phase strip: Configuration → Security → Pool → Stratum → Authorize → Job → ASIC → Mining.
3. Primary telemetry: hashrate, temperature, power, efficiency.
4. Share performance: accepted, rejected, stale, uptime, hashrate graph.
5. Pool/Stratum/current-job/wallet connection status.
6. Live event log and detail entry.
7. BTC/profitability area.
8. Mobile-first responsive shell.

## Data rule
Until real runtime contracts are connected, unavailable values are rendered as N/A or NOT CONNECTED. The dashboard must never fabricate production telemetry, BTC rewards, profitability, connection state, or green status.

## Future integration
The dashboard will consume the existing runtime/status, pool, miner, wallet, alert, and production-activation boundaries. UI integration and real mining verification are separate from this structural build.

## Explicitly not included
- Real ASIC control
- Real pool activation
- Real mining start/stop execution
- Central → branch synchronization
- Assistant diagnostic/control tool
