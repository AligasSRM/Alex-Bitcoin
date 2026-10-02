# Alex Bitcoin — Canonical Operating Model

Status: ACTIVE / REFERENCE
Current locked stop point: Section 19.3 GREEN / CLOSED
Next engineering section: 19.4

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

## 8. Failure/reconnect model

Pool/network failure must not cause the system to silently continue submitting stale work.

Expected model:

Connected
→ failure
→ disconnected
→ invalidate old session/jobs
→ reconnect
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

## 12. Current locked position

Section 19.1 — Stratum Session + Job Lifecycle Boundary: GREEN / CLOSED.
Section 19.2 — Upstream Session Lifecycle: GREEN / CLOSED.
Section 19.3 — Upstream Reconnect Boundary: GREEN / CLOSED.

Current stop point: after 19.3.
Next planned work: Section 19.4.

This document is the canonical reference for the operating model and modification/verification method. It does not replace the source code, tests, CI evidence, or individual section records.
