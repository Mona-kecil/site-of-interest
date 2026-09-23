# Data conflicts

## SINI market record on 2026-09-08

Two Sectors daily-data responses report different open, high, and low values for SINI on 2026-09-08. The original stored observation reports 0 for each field. The response retrieved during the 2026-09-23 backfill reports 15,075 for each field. Both responses report a close of 15,075, volume of 0, and market cap of 18,127,687,500,000 IDR.

The original observation remains at `data/market-flow/market/SINI/2026-09-08.json`. The later response is cached for `/v2/daily/SINI/?start=2026-08-01&end=2026-09-23`. The collector reported the disagreement and kept the stored file unchanged. Its explicit `--skip-conflicts` option then imported other dates from the cached response.

The relative-volume rule uses only volume, so this disagreement does not change the 2026-09-08 volume input. Do not treat either OHLC version as resolved until the provider clarifies the revision or a source policy selects one version.
