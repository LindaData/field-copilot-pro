# Manufacturer Source Library

Reviewed on: 2026-06-29

This demo now includes a curated source library for common HVAC manufacturers represented in the seeded equipment list. These records are stored in `src/lib/manufacturerSources.ts` and are linked to matching demo equipment by manufacturer and equipment type.

The current records are source pointers, not completed spec extractions. Exact MCA, MOP, refrigerant charge, dimensions, wiring details, fault-code meaning, and replacement part numbers must still be reviewed against the exact installed model document or nameplate before becoming verified specs in the application.

Current source coverage includes Goodman, Amana, Carrier, Bryant, Trane, American Standard, Lennox, Rheem, Ruud, York, Coleman, Daikin, Mitsubishi Electric, Fujitsu, Bosch, Honeywell/Resideo, and ecobee.

The simulated Copilot can summarize which official documents are linked to an equipment profile. It does not perform live AI/RAG retrieval yet and should not be represented as production AI.
