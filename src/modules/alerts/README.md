# Alerts Core

The Alerts Core creates validated operational alerts from verified system events.

Sources:
- miner;
- pool;
- wallet;
- profitability;
- system.

Severity:
- info;
- warning;
- critical.

The module does not invent telemetry or claim an external service failed unless an upstream verified event reports that condition. Alert creation is deterministic except for the generated alert identifier.
