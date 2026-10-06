# Alex Bitcoin

Real Bitcoin mining control and monitoring system.

## Official Project Contact

**Alex Bitcoin**  
Mining Infrastructure & Technology  
Real Bitcoin Mining Infrastructure  
Stratum • Mining Operations • Monitoring • Routing • Settlement

**Official email:** alexbitcoin.tech@proton.me  
**GitHub:** https://github.com/AligasSRM/Alex-Bitcoin

Alex Bitcoin is a technology and infrastructure project focused on real Bitcoin mining operations and verified external mining capacity. The project does not claim to be a legally incorporated company unless and until a legal entity is formally established.

## Real Mining Flow

ASIC Miner → Mining Pool → BTC → Wallet

This project does not simulate mining or fabricate rewards.

## Current Stage

STAGE 4A.6 — CORE MINING WORK BRIDGE + STRATUM BRIDGE: GREEN / CLOSED

## Principles

- Production-ready
- Fail-closed for sensitive operations
- Secrets never committed
- Real miner and pool data only
- Test before lock
- Binance is not a dependency

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
- Stage 4A.4 — Bitcoin Block Assembly Core: GREEN / CLOSED
- Stage 4A.5 — Bitcoin Core RPC / Regtest Boundary: GREEN / CLOSED
- Stage 4A.6 — Core Mining Work Bridge + Stratum Bridge: GREEN / CLOSED
- SHA-256d double-hash execution: PASS
- Bitcoin target comparison: PASS
- Real nonce scanning: PASS
- Worker runtime lifecycle: PASS
- Worker job assignment and rollover: PASS
- Worker stop-signal handling: PASS
- Real measured hashrate telemetry: PASS
- Transaction ID / double-SHA-256 calculation: PASS
- Merkle root construction: PASS
- 80-byte Bitcoin block-header serialization: PASS
- Full block assembly and transaction-count encoding: PASS
- Merkle mismatch rejected fail-closed: PASS
- Bitcoin Core JSON-RPC getblocktemplate boundary: PASS
- Bitcoin Core JSON-RPC submitblock boundary: PASS
- Regtest RPC authentication and response validation: PASS
- Invalid block submission rejected fail-closed: PASS
- Invalid engine parameters fail closed: PASS

## Production Activation Gate

The software mining engine is verified through Stage 4A.6. Live Bitcoin mining is **not** claimed yet. Production activation still requires an actual ASIC miner, a real mining-pool account/endpoint, and a real Bitcoin wallet address to be configured through runtime configuration/secrets. Until those external dependencies are present and verified, the system remains fail-closed and does not fabricate mining activity or BTC rewards.

## Final Sequence

DESIGN → BUILD → TEST → INTEGRATION TEST → REGRESSION TEST → SECURITY CHECK → FINAL VERIFY → LOCK

## Official Project Baseline & Stop Point

This section is the single source of truth for the current Alex Bitcoin execution state.

### Locked Stages — Do Not Reopen Without a Proven Technical Failure

- Stage 4A.1 — GREEN / CLOSED
- Stage 4A.2 — GREEN / CLOSED
- Stage 4A.3 — GREEN / CLOSED
- Stage 4A.4 — GREEN / CLOSED
- Stage 4A.5 — GREEN / CLOSED
- Stage 4A.6 — GREEN / CLOSED

### Current Work

- Stage 4A.6 — Core Mining Work Bridge + Stratum Bridge
- Code implemented.
- Integration test exercises Stratum subscribe → authorize → submit.
- Windows runtime verification completed successfully.
- Stage 4A.6 is officially GREEN / CLOSED.
- Do not reopen Stage 4A.6 unless a proven technical failure or regression is found.

### Dashboard

The dashboard runtime contract and dashboard work are part of the project. The existing dashboard UI is not to be rebuilt from scratch or replaced without a proven need. The next dashboard action is deployment of the existing UI to a verified public web/PWA endpoint after its actual frontend files are identified in the project environment.

### Partnership Outreach — No Duplicate Contact

| Partner | Contact | Status | Date |
|---|---|---|---|
| Open Mine | max@openmine.io | SENT / WAITING | 2026-10-03 |
| HashEra | g.cyr@hashera.io | SENT / WAITING | 2026-10-03 |
| HashStrike | hashstrike@mineshop.eu | SENT / WAITING | 2026-10-03 |

No additional outreach to these three partners should be sent unless a new response or a specific follow-up condition exists.

### Production Activation Dependencies

The following are external dependencies, not reasons to rewrite already-locked core stages:

1. Verified external mining operator / ASIC capacity.
2. Real mining-pool account and Stratum endpoint.
3. Real Bitcoin wallet destination.
4. Commercial/KYC/legal requirements imposed by the selected partner.
5. Verified monitoring, accounting and settlement path for the selected production partner.

### Repository Hygiene Rule

Do not delete or rewrite project files solely because they look unused. A file may be part of a locked contract, test, compatibility boundary, documentation record, or future integration. Cleanup requires evidence that a file is duplicate, obsolete, generated, secret-bearing, corrupted, or otherwise outside the approved project architecture.

### Execution Rule

Inspect → Decide → Execute → Test → Verify → Lock → Next.

Never invent a stage number, integration result, deployment URL, partner response, production hashrate, or financial result.
