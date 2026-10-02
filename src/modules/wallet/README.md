# Wallet Core

The Wallet Core is the Bitcoin payout-address and balance-observation integration boundary.

It does not create BTC, fabricate balances, sign transactions, or pretend that a payout happened. A concrete adapter must use a verified Bitcoin wallet/blockchain data source before production balance monitoring is enabled.

Responsibilities:
- represent verified wallet status;
- validate wallet status;
- keep the payout address explicit and network-aware;
- expose a stable wallet adapter contract;
- isolate blockchain/wallet-provider specifics from the rest of the application.

No exchange is required. Binance is not a dependency.
