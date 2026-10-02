# REAL MINING END-TO-END ACTIVATION

This stage is the production boundary between verified software components and real mining operation.

## Required real evidence

Production activation is fail-closed until all of these are observed from a real run:

1. Real ASIC identity verified.
2. Real Stratum subscription completed.
3. Real worker authorization completed.
4. A real mining job received from the upstream pool.
5. A real share submitted upstream.
6. The upstream pool accepted at least one real share.
7. Pool-side telemetry confirms the active worker/hashrate state.

Unit tests may verify the gate logic, but they do **not** satisfy these evidence fields.

## GREEN rule

- **ENGINE GREEN:** gate logic and regression tests pass.
- **REAL ACTIVATION GREEN:** only after the seven real observations above are captured from an actual ASIC + actual pool session.
- No synthetic fixtures, mocked pool responses, or telemetry-only claims may be used as real activation evidence.

Until REAL ACTIVATION GREEN, the system must remain fail-closed for production mining.
