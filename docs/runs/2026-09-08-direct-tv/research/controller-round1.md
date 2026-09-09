# Native controller review round1

Native Sol high identified P1: revision based on max surviving event ID can decrease after permanent deletion cascades its highest event. Existing reducer rejects lower revisions, delaying authoritative removal. Root accepted the finding and assigned immutable follow-up migration007 to Terra high. Root also identified millisecond truncation in the server ordering check, which can reject valid submillisecond SQL ordering. Both receive regressions.

The initial direct-TV release was temporarily rolled back to dpl_FxVEJGZq1m4miD8rDHCdicm7uFpf while the correction is verified. The additive006 bridge remains installed but unused by the rollback frontend/API. This preserves deployed migration history. No production data was deleted or seeded.
