# Validation audit

Status: passed
Generated: 2026-05-29T14:11:34.405Z

## Counts
- passed: 2
- failed: 0
- skipped: 0
- blocked: 1

## Cases
### juniper-to-nokia-mdcli-22
- status: blocked
- synthetic: false
- reason: missing-source-config
- messageKo: 현재 레포지토리 내 Juniper 원본 설정이 없어 실제 Juniper → Nokia MD-CLI 22 검증은 보류합니다.
### synthetic-juniper-set-smoke
- status: passed
- synthetic: true
- parsed objects: old 5, new 4
- semantic: matched 4, old-only 1, new-only 0, coverage 100%
- audit: active 7, suppressed 2
- graph: nodes 21, edges 11
### nokia-classic15-to-nokia-mdcli-22
- status: passed
- synthetic: false
- parsed objects: old 503, new 351
- semantic: matched 336, old-only 167, new-only 15, coverage 64%
- audit: active 469, suppressed 59
- graph: nodes 407, edges 300
