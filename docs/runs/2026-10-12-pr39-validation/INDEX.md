# Independent PR 39 validation

[Report](../../PR39-VALIDATION.md) · [Preview/recovery design](../../PR39-PREVIEW-RECOVERY.md)

The raw full-suite JSON and text logs are individually gzip-compressed in
[evidence](evidence/), with an explicit manifest and SHA256SUMS. Decompress with
`gzip -dc evidence/fixed-unit.json.gz` or `gzip -dc evidence/base-unit.json.gz`.
The manifest records exact base/original-head identity and the corrected full
run. The original input metadata is retained as historical evidence; its initial
comment-only migration hash was superseded by the final rollback-header wording
recorded in the manifest. No executable migration SQL changed. All outputs are
fictional-only. Total published evidence is below 512 KiB.

Production, hosted SQL, real-data backup and credential creation were not
performed. PR branch publication is authorized; production release stays paused
for recovery and functional-preview gates.
