# Alex Bitcoin

Real Bitcoin mining control and monitoring system.

## Real Mining Flow

ASIC Miner → Mining Pool → BTC → Wallet

This project does not simulate mining or fabricate rewards.

## Current Stage

STAGE 3 — REAL EXTERNAL INTEGRATION: VERIFIED

## Principles

- Production-ready
- Fail-closed for sensitive operations
- Secrets never committed
- Real miner and pool data only
- Test before lock
- Binance is not a dependency

## Integrated External Adapters

- CGMiner-compatible ASIC telemetry adapter over TCP
- HTTP pool telemetry adapter with timeout and payload validation
- Bitcoin address balance adapter using a real public Bitcoin API
- External adapter integration tests using local protocol-compatible services
- No simulated production hashrate, rewards, or balances

## Current Verified Status

- Stage 0 — Real Mining Feasibility: CLOSED
- Stage 1 — Architecture: VERIFIED
- Stage 2.1–2.23 — Core, modules, services, external contracts, lifecycle, health, retry, polling, readiness and runtime status: IMPLEMENTED
- Stage 2.24 — Final Verification & Lock: GREEN
- Stage 3.1 — Real Miner Adapter Contract: VERIFIED
- Stage 3.2 — Real Pool Adapter: VERIFIED
- Stage 3.3 — Real Wallet Adapter: VERIFIED
- Stage 3.4 — External Telemetry Integration: VERIFIED
- Stage 3.5 — Secrets/Security Boundary: VERIFIED
- Stage 3.6 — Integration + Regression Tests: GREEN
- Latest verified workflow run: 37005814600
- Latest verified commit: d8612aaf5b33f95fd95c9d02eb068ca4bdb7677c
- Typecheck: PASS
- Core test suite: PASS
- External adapter integration tests: PASS
- Dependency audit in CI: 0 vulnerabilities reported

## Production Activation Gate

The software integration layer is verified and locked at Stage 3.

Live Bitcoin mining is **not** claimed yet. Production activation still requires an actual ASIC miner, a real mining-pool account/endpoint, and a real Bitcoin wallet address to be configured through runtime configuration/secrets. Until those external dependencies are present and verified, the system remains fail-closed and does not fabricate mining activity or BTC rewards.

Final sequence:

DESIGN → BUILD → TEST → INTEGRATION TEST → REGRESSION TEST → SECURITY CHECK → FINAL VERIFY → LOCK
