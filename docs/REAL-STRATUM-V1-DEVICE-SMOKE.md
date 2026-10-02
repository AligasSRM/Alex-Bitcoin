# Real Stratum V1 Device Smoke Runner

This runner is the device-side boundary for **REAL MINING END-TO-END ACTIVATION**.

It uses a real TCP connection to a Stratum V1 pool, performs:

1. `mining.subscribe`
2. `mining.authorize`
3. receives a real `mining.notify` job
4. builds Bitcoin mining work
5. performs bounded real SHA-256d CPU scanning
6. submits a share only when the local share target is actually met
7. records the pool's accepted/rejected response

Stratum V1 uses newline-delimited JSON-RPC-style messages and the normal flow includes subscribe, authorize, job notification, and submit. See the Bitcoin developer guide and protocol references.

## Required environment

- `STRATUM_HOST` — pool hostname
- `STRATUM_PORT` — pool TCP port
- `STRATUM_WORKER` — worker identity in the exact format required by the selected pool
- `STRATUM_PASSWORD` — pool worker password; defaults to `x` when the pool does not require one
- `BTC_ADDRESS` — public BTC receiving address used for pool/account configuration when required

Optional:

- `MAX_HASHES_PER_JOB` — bounded CPU scan, default 100000
- `MAX_JOBS` — number of jobs to process, default 1
- `STRATUM_TIMEOUT_MS` — RPC/socket timeout, default 15000

## Safety rules

- Never put a seed phrase or private key in these variables.
- Never commit pool credentials or wallet secrets to Git.
- The runner exits non-zero when no accepted share was observed.
- A connection, authorization, or received job alone is **not** REAL ACTIVATION GREEN.
- A real accepted share is required for the pool-share evidence boundary.
- CPU mining at a public pool's assigned difficulty may find no share during a bounded test; that result is reported honestly and is not treated as failure of the protocol implementation.

## Run

From the repository root:

```bash
export STRATUM_HOST='POOL_HOST'
export STRATUM_PORT='POOL_PORT'
export STRATUM_WORKER='POOL_SPECIFIC_WORKER_ID'
export STRATUM_PASSWORD='POOL_PASSWORD'
export BTC_ADDRESS='YOUR_PUBLIC_BTC_RECEIVING_ADDRESS'
npm run real:stratum-smoke
```

On Windows PowerShell:

```powershell
$env:STRATUM_HOST='POOL_HOST'
$env:STRATUM_PORT='POOL_PORT'
$env:STRATUM_WORKER='POOL_SPECIFIC_WORKER_ID'
$env:STRATUM_PASSWORD='POOL_PASSWORD'
$env:BTC_ADDRESS='YOUR_PUBLIC_BTC_RECEIVING_ADDRESS'
npm run real:stratum-smoke
```

Do not substitute a worker format until the selected pool's current instructions are checked.
