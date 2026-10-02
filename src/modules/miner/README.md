# Miner Core

The Miner Core is the real-device integration boundary.

It does not simulate mining, generate fake rewards, or pretend to communicate with hardware. A concrete adapter must implement the MinerAdapter contract for a verified ASIC protocol/API before production connection is enabled.

Responsibilities:
- represent verified miner telemetry;
- validate incoming telemetry;
- expose a stable adapter contract;
- isolate hardware/protocol specifics from the rest of the application.

Protocol-specific implementation is intentionally deferred until a real ASIC model/protocol is identified.
