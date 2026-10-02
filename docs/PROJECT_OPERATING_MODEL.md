# Alex Bitcoin — Canonical Operating Model

Status: ACTIVE / REFERENCE
Current locked stop point: Section 19.4 GREEN / CLOSED
Next engineering section: 19.5

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

## 8. Failure/reconnect model

Pool/network failure must not cause the system to silently continue submitting stale work.

Expected model:

Connected
→ failure
→ disconnected
→ invalidate old session/jobs
→ bounded reconnect attempts
→ backoff between attempts
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

The dashboard work starts only after the core mining system has been completed and the relevant engineering sections are GREEN/CLOSED. The dashboard is therefore a later phase, not part of the current 19.5 work unless explicitly re-planned.

## 13. Current locked position

Section 19.1 — Stratum Session + Job Lifecycle Boundary: GREEN / CLOSED.
Section 19.2 — Upstream Session Lifecycle: GREEN / CLOSED.
Section 19.3 — Upstream Reconnect Boundary: GREEN / CLOSED.
Section 19.4 — Fail-Closed Upstream Reconnect Retry Boundary: GREEN / CLOSED.

Current stop point: after 19.4.
Next planned work: Section 19.5.

This document is the canonical reference for the operating model, modification/verification method, and the deferred control-dashboard architecture. It does not replace the source code, tests, CI evidence, or individual section records.
