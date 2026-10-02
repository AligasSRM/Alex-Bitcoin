# Alex Bitcoin — Architecture

## Real Flow

ASIC Miner → Mining Pool → BTC Payout → Wallet

The application is a control and monitoring layer above real Bitcoin mining infrastructure. It must never present simulated mining, fabricated hashrate, or fabricated rewards as real.

## Layers

### Core
Shared domain contracts, validation, configuration, state, errors, and security rules.

### Modules
Miner, Pool, Wallet, Profitability, Alerts.

### Services
External integrations and transport adapters with explicit timeouts, safe failure handling, and no secret leakage.

### Dashboard
Presentation and operator controls. It must not contain business logic or secrets.

## Security

- Real credentials belong in environment or secret storage.
- Never commit real credentials.
- Private wallet keys must never be stored by the dashboard.
- Sensitive operations fail closed.
- Validate external responses before treating them as authoritative.
- Never report success without verified evidence.

## Testing

DESIGN → BUILD → TEST → INTEGRATION TEST → REGRESSION TEST → SECURITY CHECK → FINAL VERIFY → LOCK
