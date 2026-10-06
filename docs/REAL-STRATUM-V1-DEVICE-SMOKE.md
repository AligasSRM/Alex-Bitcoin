# Real Stratum V1 Device Smoke Runner

This runner is the device-side boundary for REAL MINING END-TO-END ACTIVATION.

It uses a real TCP connection to a Stratum V1 pool and performs subscribe, authorize, receives notify, builds work, performs bounded SHA-256d scanning, and submits a share only when the local target is met.

## Required environment

- STRATUM_HOST
- STRATUM_PORT
- STRATUM_WORKER
- STRATUM_PASSWORD (defaults to x)
- BTC_ADDRESS (public address only)

Optional: MAX_HASHES_PER_JOB, MAX_JOBS, STRATUM_TIMEOUT_MS.

## Safety

Never put a seed phrase or private key in these variables. Never commit credentials. A connection, authorization, or received job is not REAL ACTIVATION GREEN. A real accepted share is required for the pool-share evidence boundary.

## Run

PowerShell:

```powershell
$env:STRATUM_HOST='POOL_HOST'
$env:STRATUM_PORT='POOL_PORT'
$env:STRATUM_WORKER='POOL_SPECIFIC_WORKER_ID'
$env:STRATUM_PASSWORD='POOL_PASSWORD'
$env:BTC_ADDRESS='YOUR_PUBLIC_BTC_RECEIVING_ADDRESS'
npm run real:stratum-smoke
```

Do not substitute worker formatting until the selected pool's current instructions are checked.
