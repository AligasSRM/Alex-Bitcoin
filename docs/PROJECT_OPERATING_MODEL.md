# Alex Bitcoin — Canonical Operating Model

Status: ACTIVE / REFERENCE
Current locked stop point: Section 22 GREEN / CLOSED
Next engineering section: 23

## 1. What this system is

Alex Bitcoin is a real Bitcoin-mining system, not a simulation and not cloud-mining. The intended production flow is:

ASIC hardware → Alex Bitcoin → real Mining Pool → accepted shares → BTC credited by the pool → real BTC wallet.

The software does not invent hashrate, rewards, balances, or payouts. Real production activation requires real ASIC hardware, a real pool account/endpoint, and a real BTC wallet.

## 2. End-to-end operating flow

Program start
→ load configuration
→ validate security/secrets
→ connect to required Bitcoin Core / network boundaries
→ connect to the Mining Pool
→ establish Stratum session
→ subscribe
→ authorize worker
→ receive mining job
→ build mining work
→ distribute work
→ ASIC performs real SHA-256d hashing
→ share/solution found
→ validate share
→ submit share to pool
→ pool accepts/rejects
→ record telemetry/logs
→ handle new jobs, stale jobs, disconnects and reconnects
→ continue mining.

## 3. Mining work and hashing

A pool job supplies the information needed to construct mining work, including job ID, previous block information, coinbase parameters, merkle branches, version, nBits and nTime as applicable.

The mining engine constructs the block header and performs Bitcoin SHA-256d. The ASIC is responsible for the actual high-rate hashing and nonce search. The software manages the work lifecycle, routing, validation, submission and monitoring.

## 4. Share lifecycle

A share is not automatically a mined Bitcoin block. The pool sets a share difficulty. When the miner finds a hash satisfying the pool's share target, the software validates and submits it.

Validation must include, as applicable:
- active/current job
- authorized worker identity
- extranonce2 format
- nTime format/boundary
- nonce format
- duplicate protection
- correct routing/session state

The result is tracked as accepted, rejected, stale, duplicate, or another explicit failure category where applicable.

## 5. Job lifecycle

Jobs are stateful.

When a new job replaces an old job:
- the old job becomes retired/stale
- the new job becomes active
- stale work must not be accepted as current work
- downstream submission must not be polluted by invalid routing
- job/session generation boundaries must prevent old callbacks from resurrecting retired work.

## 6. Stratum/session lifecycle

The Stratum layer manages:
- mining.subscribe
- mining.authorize
- mining.submit
- difficulty notifications
- job notifications
- worker identity
- active/retired jobs
- session/job generation.

The worker identity used for submit must match the authorized worker identity.

Section 19.7 adds the Stratum difficulty state boundary:
- difficulty notifications are validated before becoming runtime state
- only finite, positive difficulty values are accepted
- the active difficulty is persisted in the session
- a valid update replaces the previous active difficulty
- an invalid update fails closed and cannot overwrite the last valid difficulty
- runtime consumers can read the current difficulty through the session boundary.

Section 19.8 adds the Stratum difficulty lifecycle boundary:
- difficulty updates are only accepted after the Stratum session has subscribed
- pre-subscription difficulty changes fail closed
- the existing positive/finite validation remains enforced
- valid post-subscription updates replace the active difficulty
- tests verify that no difficulty state is created before subscription.

Section 19.9 adds the Stratum difficulty-to-target boundary:
- validated Stratum difficulty can be converted deterministically to a 32-byte share target
- conversion uses integer arithmetic to avoid floating-point target construction
- difficulty 1 maps to the Bitcoin difficulty-1 maximum target
- sub-difficulty values are bounded to that maximum target
- reverse conversion is available for verification and preserves the supported precision boundary
- invalid difficulty and target inputs fail closed.


Section 20 adds the Stratum runtime share-target binding:
- the active Stratum difficulty is exposed as a deterministic 32-byte share target through the session boundary
- share submission can receive the active runtime share target without mutating the stored mining job
- the Stratum mining bridge passes the current session share target into share validation
- when no Stratum difficulty has been established, existing job target validation remains authoritative
- runtime target enforcement is covered by direct submission and bridge integration tests
- invalid/stale/duplicate/session boundaries remain fail-closed through the existing validation chain.

## 7. Upstream pool lifecycle

The upstream binding manages:
- disconnected
- connecting
- connected
- degraded states as defined by the runtime contract
- connection generation
- upstream job registration
- share submission
- accepted/rejected counters
- fail-closed behavior when disconnected or when a job is unknown.

Reconnect must explicitly tear down the previous generation, retire active jobs, invalidate stale callbacks, and establish a new session generation before accepting new work.

Section 19.4 adds a bounded reconnect retry policy:
- explicit maximum attempts
- bounded exponential backoff
- injectable delay/sleep for deterministic verification
- final failure is surfaced instead of silently continuing
- retries always operate after the previous generation has been disconnected and invalidated.

Section 19.5 adds the upstream recovery supervisor:
- recovery requests are serialized/coalesced
- concurrent recovery triggers share one recovery operation
- competing reconnect generations are prevented
- recovery state is observable through isRecovering()
- the supervisor reuses the bounded 19.4 policy instead of creating a second retry mechanism.

Section 19.6 adds the degraded-state recovery boundary:
- share submission remains fail-closed unless upstream is fully connected
- a connected upstream does not trigger unnecessary recovery
- degraded/disconnected state can trigger the serialized recovery supervisor
- recovery establishes a fresh connection generation through the existing bounded retry policy.

## 8. Failure/reconnect model

Pool/network failure must not cause the system to silently continue submitting stale work.

Expected model:

Connected
→ failure
→ disconnected
→ invalidate old session/jobs
→ bounded reconnect attempts
→ backoff between attempts
→ serialized recovery supervisor
→ new connection generation
→ subscribe/authorize
→ receive new job
→ resume.

## 9. How every modification is performed

No change is considered complete merely because code was edited.

Required execution sequence:

1. Inspect the current repository/state first.
2. Identify the exact problem and responsible component.
3. Make the smallest production-relevant change.
4. Add or update tests for the changed behavior.
5. Commit.
6. Run/check GitHub CI.
7. If CI fails:
   - inspect the workflow run
   - inspect its jobs
   - identify the failed job/step
   - read the job logs
   - determine the exact root cause
   - fix that root cause
   - rerun/recheck CI.
8. Only when verification is GREEN, merge the PR.
9. Check the merge commit/status where an independent workflow exists.
10. Mark the section GREEN/CLOSED only after the evidence supports it.

Never claim GREEN from assumption.

## 10. How the user can see what was changed

For every completed engineering section, the record should identify:
- section number
- problem addressed
- files/components changed
- behavior added/changed
- tests added/changed
- CI result
- PR number
- merge commit
- final status
- any limitation, such as no independent merge-commit workflow run.

The explanation must answer:
“What changed, where, why, how was it tested, and what was the result?”

## 11. Stage discipline

Work one section at a time.

Section start
→ inspect
→ implement
→ test
→ verify
→ GREEN/CLOSED
→ next section.

Locked sections are not reopened unless there is a real technical failure, regression, or other concrete engineering reason.

## 12. Control Dashboard / Operator Panel — LOCKED FOR LATER PHASE

The project will include a real operator control dashboard, but it is intentionally deferred until the mining system/runtime is fully built and the relevant engineering sections are GREEN/CLOSED.

The dashboard is not a decorative UI and must not simulate mining state.

### Purpose

The dashboard is the operator's eyes and hands:
- show the real runtime state
- show live mining metrics
- provide safe operator controls
- expose the live event/log stream
- make state transitions visible without requiring a terminal.

### Planned live metrics

At minimum, the dashboard should be able to display real runtime data such as:
- current system state: READY / STARTING / MINING / STOPPING / STOPPED / ERROR
- live hashrate and a time-series hashrate graph
- temperature
- power and efficiency when the hardware exposes them
- pool connection state
- Stratum/session state
- current job
- accepted, rejected, stale and duplicate shares where available
- mining uptime
- connection/reconnect information
- live system events and errors.

Metrics must come from the real runtime/telemetry boundary. The UI must never fabricate a value merely to make the screen look active.

### Planned operator controls

The primary controls are:
- START MINING
- STOP MINING

Additional controls such as reconnect/restart may be added only when their runtime semantics and safety boundaries are explicitly implemented.

START MINING must be a real control path, not a local UI toggle. The intended sequence is:

START
→ configuration validation
→ security/secrets validation
→ pool connection
→ Stratum subscribe
→ worker authorization
→ receive a valid job
→ start mining runtime
→ ASIC hashing
→ share validation
→ share submission
→ pool accepted/rejected result
→ live telemetry.

STOP MINING must stop the actual mining runtime and make the stopped state visible. The dashboard must not report MINING while the runtime is stopped or disconnected.

### Visual model

The dashboard should use a clear operator-first layout:
- large live primary metric (especially hashrate)
- compact status cards for temperature/power/efficiency
- pool/Stratum/job status
- share counters
- live time-series graphs
- uptime/elapsed-time counters that actually advance from runtime state
- prominent START/STOP controls
- live event log.

Where useful, gauges/needle-style indicators can visualize instantaneous values, but graphs and numeric values remain the authoritative display for trends and exact readings.

The design should work well on the user's Android phone as well as larger screens.

### Safety boundary

Architecture target:

CONTROL DASHBOARD
→ CONTROL/API BOUNDARY
→ MINING RUNTIME
→ STRATUM / MINER / TELEMETRY
→ POOL / ASIC / LOGS

The dashboard must not bypass security, worker/session lifecycle, job lifecycle, or fail-closed runtime rules.

A disconnected/error state must be visible. No fake GREEN status is allowed.

### Reference research

The planned dashboard model is informed by established mining-monitoring patterns: Braiins Manager documents dashboards with hashrate, power, temperature, uptime, worker status and time-series views; Braiins also documents mining-pool monitoring and worker/share status. A local-first open-source mining dashboard, MinerWatch, demonstrates live miner cards, hashrate charts, temperature/power/fan data, pool accepted/rejected shares and phone/browser operation. These references are design input only; Alex Bitcoin remains its own architecture and implementation.

### Timing rule

The dashboard work starts only after the core mining system has been completed and the relevant engineering sections are GREEN/CLOSED. The dashboard is therefore a later phase, not part of the current 19.9 work unless explicitly re-planned.

## 13. Section 22 — Operator Dashboard Runtime Integration

Section 22 formalizes the operator dashboard phase already implemented in the repository after Section 21.

Scope verified in the repository:
- mobile-first operator dashboard structure
- fail-closed typed runtime snapshot contract
- browser runtime binding through `window.AlexBitcoinRuntime` and `alexbitcoin:runtime`
- verified core-health → dashboard runtime mapping
- operator telemetry panels for hashrate, temperature, power, efficiency, shares, pool/Stratum/job/wallet, ASIC/network telemetry, live events, and verified financial fields
- unavailable or unverified production values remain `N/A` / `NOT CONNECTED`
- dashboard does not fabricate telemetry, profitability, mining state, or production control actions
- dashboard control buttons remain disabled until a real production control boundary exists

Verification evidence:
- dashboard runtime contract regression test is included in the repository test chain
- core-to-dashboard mapper has dedicated regression coverage
- fail-closed browser runtime publisher and loading order are implemented
- latest `main` CI run for commit `ae56b438405bc59fe95171effa2f45cde353f7da` completed successfully
- the dashboard work predates the current locked main baseline and is unchanged by the subsequent Stage 4A.6 verification commits

Section 22 boundary:
- dashboard presentation and runtime observation are GREEN/CLOSED
- real ASIC control, real pool activation, real mining start/stop execution, and production financial activation remain outside this section
- those capabilities require their own verified runtime/control/external-dependency boundaries and must not be implied by the dashboard UI.


## 14. Section 23 — Mining Control Boundary

Section 23 establishes the fail-closed control boundary for real mining START/STOP commands.

Implemented:
- typed mining control state machine: stopped / starting / mining / stopping / error
- explicit START boundary that requires a miner adapter start capability
- explicit STOP boundary that requires a miner adapter stop capability
- duplicate START rejection while starting/mining
- duplicate STOP rejection while stopped
- failed or unavailable control paths never report successful mining
- control failures transition to an explicit error state
- dedicated regression coverage included in the repository test chain

Section 23 boundary:
- this is the control contract and safety boundary only
- it does not claim that a physical ASIC is connected
- it does not claim a live pool session or real Bitcoin mining
- production activation remains gated by the existing production activation boundary and real external dependencies

## 15. Current locked position

Section 19.1 — Stratum Session + Job Lifecycle Boundary: GREEN / CLOSED.
Section 19.2 — Upstream Session Lifecycle: GREEN / CLOSED.
Section 19.3 — Upstream Reconnect Boundary: GREEN / CLOSED.
Section 19.4 — Fail-Closed Upstream Reconnect Retry Boundary: GREEN / CLOSED.
Section 19.5 — Upstream Recovery Supervisor: GREEN / CLOSED.
Section 19.6 — Degraded Upstream Recovery Boundary: GREEN / CLOSED.
Section 19.7 — Stratum Difficulty State Boundary: GREEN / CLOSED.
Section 19.8 — Stratum Difficulty Lifecycle Boundary: GREEN / CLOSED.
Section 19.9 — Stratum Difficulty Target Boundary: GREEN / CLOSED.
Section 20 — Stratum Runtime Share-Target Binding: GREEN / CLOSED.
Section 21 — Share Validation Boundary: GREEN / CLOSED.
Section 22 — Operator Dashboard Runtime Integration: GREEN / CLOSED.
Section 23 — Mining Control Boundary: GREEN / CLOSED.

Current stop point: after Section 23 — GREEN / CLOSED.
