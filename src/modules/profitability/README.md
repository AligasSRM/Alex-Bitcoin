# Profitability Core

The Profitability Core calculates mining economics from externally verified inputs.

Inputs:
- miner hashrate;
- miner power draw;
- BTC/USD price;
- BTC-per-hash production factor supplied by the verified network/pool data layer;
- electricity price per kWh.

Outputs:
- estimated BTC per day;
- estimated daily revenue;
- estimated daily electricity cost;
- estimated daily profit.

This module does not invent BTC prices, mining rewards, pool performance, or electricity costs. Production values must come from verified external data sources.
