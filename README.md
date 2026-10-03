# Alex Bitcoin

Real Bitcoin mining control and monitoring system.

## Real Mining Flow

ASIC Miner → Mining Pool → BTC → Wallet

This project does not simulate mining or fabricate rewards.

## Current Stage

STAGE 4A.3 — REAL MINER WORKER RUNTIME: GREEN / CLOSED

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
- Stage 4A.1 — Miner Core Architecture: GREEN / CLOSED
- Stage 4A.2 — Real SHA-256d Mining Engine: GREEN / CLOSED
- Stage 4A.3 — Real Miner Worker Runtime: GREEN / CLOSED
- SHA-256d double-hash execution: PASS
- Bitcoin target comparison: PASS
- Real nonce scanning: PASS
- Worker runtime lifecycle: PASS
- Worker job assignment and rollover: PASS
- Worker stop-signal handling: PASS
- Real measured hashrate telemetry: PASS
- Invalid engine parameters fail closed: PASS

## Production Activation Gate

The software mining engine is verified through Stage 4A.3. Live Bitcoin mining is **not** claimed yet. Production activation still requires an actual ASIC miner, a real mining-pool account/endpoint, and a real Bitcoin wallet address to be configured through runtime configuration/secrets. Until those external dependencies are present and verified, the system remains fail-closed and does not fabricate mining activity or BTC rewards.

Final sequence:

DESIGN → BUILD → TEST → INTEGRATION TEST → REGRESSION TEST → SECURITY CHECK → FINAL VERIFY → LOCK
