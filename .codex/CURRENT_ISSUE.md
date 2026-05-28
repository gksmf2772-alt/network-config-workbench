# Current Issue

## Current connector scroll clipping fix

영향 boundary:
- `legacyCore.js` DOM rendering and connector path control.
- `diffRenderer.js` SVG layer wrapper.
- `global-diff.css` connector overlay clipping.

허용 범위:
- connector SVG clipPath 적용.
- connector wrapper overflow clipping.
- visible viewport 기준 line connector path filtering.
- characterization test 추가.

금지 범위:
- parser/normalizer 변경 금지.
- semantic compare/object match 변경 금지.
- line relation 데이터 의미 변경 금지.
- manual mapping/profile exception/comparison exclusion 변경 금지.
- summary/report/graph count 변경 금지.
- scroll sync 로직 변경 금지.

테스트 결과:
- npm.cmd run guard:legacy-core pass
- npm.cmd test pass
- npm.cmd run build pass

수정 후 영향 받은 기능 체크리스트:
- Semantic match: 변경 없음.
- Manual mapping: 변경 없음.
- Profile exception: 변경 없음.
- Comparison exclusion: 변경 없음.
- Summary/report/graph count: 변경 없음.
- Diff scroll sync: 스크롤 동기화 로직 변경 없음.
- Line connector rendering: viewport clip/filter만 변경.

## Current MD-CLI one-line port legacyCore fix

영향 boundary:
- `legacyCore.js` hot path 중 parser/paired diff row 입력.
- `parseConfig -> buildCanonicalObject -> mergeObjectsByCanonicalKey -> compareObjects -> buildPairedObjectDiffRows`.

허용 범위:
- MD-CLI `/configure { port <id> ... }` 한 줄 설정의 root object key를 `port:<id>`로 유지.
- 같은 port prefix의 rawLines/canonicalFields/fieldOccurrences 누적.
- port canonical field 보강: `admin-state`, `ethernet.mode`, `ethernet.mtu`, `ethernet.down-on-internal-error`, `ethernet.crc-monitor.signal-degrade.threshold`, `ethernet.egress.scheduler-policy`, queue-group/host-match.
- semantic debug mode에서 parser/matched pair/render input `console.table` 추가.
- characterization test 추가.

금지 범위:
- semantic object match 정책 변경 금지.
- manual mapping 변경 금지.
- profile exception/comparison exclusion 변경 금지.
- summary/report/graph count 변경 금지.
- connector/line rendering UI, bridge, anchor, SVG geometry 변경 금지.
- golden regression 기대값 임의 변경 금지.

테스트 결과:
- npm.cmd run guard:legacy-core pass
- npm.cmd test pass
- npm.cmd run build pass

수정 후 영향 받은 기능 체크리스트:
- Semantic match: matcher 코드 변경 없음.
- Manual mapping: 저장/병합 코드 변경 없음.
- Profile exception: 저장/삭제/매칭 코드 변경 없음.
- Comparison exclusion: 저장/삭제/매칭 코드 변경 없음.
- Summary/report/graph count: 요약 모듈 변경 없음.
- Diff scroll sync: 변경 없음.
- Line connector rendering: 변경 없음.

## 문제
프로파일 탭 하단 저장된 예외/비교 제외 규칙 row가 1~4번 아코디언 row와 다른 DOM 구조로 렌더링됨.

## 기대 동작
하단 row도 1~4번과 같은 `profile-section collapsible-section` wrapper, `app-button app-button--ghost collapsible-header` header, `collapsible-content` content 구조를 사용함.

## 반드시 검증
- npm.cmd test
- npm.cmd run build
- npm.cmd run validate:all
- npm.cmd run validate:stress

## legacyCore stability rule

Before editing `src/core/legacyCore.js`, read
`docs/legacy-core-stability-map.md` and state which boundary is affected.

허용 범위 / Allowed edit scope:
- Documentation, guide, checklist, and characterization-test planning.
- Small single-boundary fixes after identifying the owner layer in the stability map.
- Runtime edits only when the user explicitly asks for behavior changes.

금지 범위 / Forbidden unless explicitly requested:
- Semantic object match behavior.
- Manual mapping behavior or storage/merge order.
- Profile exception matching or suppression semantics.
- Comparison exclusion matching or canonical excluded state.
- Summary/report/graph counts.
- Diff scroll sync behavior.
- Line connector rendering, SVG connector geometry, relation keys, or connector DOM data contract.

Required post-edit checklist:
- 영향 boundary / Affected stability-map boundary: Profile tab DOM rendering only; comparison hot path untouched.
- Files changed: src/core/legacyCore.js, src/core/profileEditor.js, src/styles/global-base.css, src/styles/global-profile.css, tests/profile-editor.test.js.
- Runtime behavior changed: UI wrapper/toggle markup only; compare behavior no.
- Semantic match checked: no code path changed.
- Manual mapping checked: no code path changed.
- Profile exception checked: save/delete/match semantics unchanged; overview removal handler retained.
- Comparison exclusion checked: save/delete/match semantics unchanged; overview counts retained.
- Summary/report/graph count checked: no code path changed.
- Diff scroll sync checked: no code path changed.
- Line connector rendering checked: no code path changed.
- 테스트 결과 / Tests run: npm.cmd run guard:legacy-core pass; npm.cmd test pass; npm.cmd run build pass.

## validate:all fixture note

Current `npm.cmd run validate:all` can fail because the primary local fixture is
missing:

- `예제 및 테스트 설정/Gangbuk-SEA028_config.txt`

This is test data absence, not a confirmed feature regression. Suggested future
improvement only: make quality analysis handle missing primary fixtures the same
way manifest validation handles blocked cases, so `validate:all` can report
blocked/missing-fixture instead of crashing. Do not implement this unless asked.

## Current scheduler policy line mapping fix

Affected stability-map boundary:
- Diff row and line relation model.

Allowed edit scope:
- Reuse existing `oldSourceLines` / `newSourceLines` from line comparison data
  when building semantic line row mapping indexes.
- Infer Nokia port scheduler-policy raw lines as the existing canonical field
  only for compare-pane line relation rendering.
- Adjust line connector anchor measurement to use full visible command text
  bounds before relation-token bounds.
- Add characterization tests for Nokia Classic to MD-CLI scheduler-policy line
  source relation and anchor measurement contract.

Forbidden:
- Semantic object match behavior.
- Manual mapping behavior.
- Profile exception behavior.
- Comparison exclusion behavior.
- Summary/report/graph counts.
- Diff scroll sync behavior.
- Connector path routing, bridge structure, visual styling, and relation key format.

Post-edit checklist:
- Semantic match checked: no matcher logic change.
- Manual mapping checked: no storage/merge code touched.
- Profile exception checked: no exception save/delete/match code touched.
- Comparison exclusion checked: no exclusion save/delete/match code touched.
- Summary/report/graph count checked: no count code touched.
- Diff scroll sync checked: no scroll sync code touched.
- Line connector rendering checked: anchor measurement only; no SVG path/style change.
- Tests run: npm.cmd run guard:legacy-core pass; npm.cmd test pass; npm.cmd run build pass.

## Current Nokia MD-CLI one-line port grouping/source fix

Affected stability-map boundary:
- Parser/normalizer module only: `src/core/parsers/nokiaMdCliParser.js`,
  `src/core/parsers/nokiaClassicParser.js`.
- Line relation source lookup only: `src/core/lineDiff.js`.

Allowed edit scope:
- Keep MD-CLI one-line objects merged by same semantic identity.
- Add port canonical field `ethernet.mtu` for Classic block and MD-CLI
  one-line/block parser output.
- Preserve MD-CLI one-line raw `/configure { port ... }` as source lines for
  canonical port fields in line comparison.
- Add characterization tests for one-line port grouping and source line
  preservation.

Forbidden:
- Semantic object match behavior.
- Manual mapping behavior.
- Profile exception behavior.
- Comparison exclusion behavior.
- Summary/report/graph counts outside intended new `ethernet.mtu` field.
- Diff scroll sync behavior.
- Connector/line rendering UI, SVG geometry, relation keys, or bridge styling.

Post-edit checklist:
- Semantic match checked: object matcher code untouched.
- Manual mapping checked: no storage/merge code touched.
- Profile exception checked: no exception save/delete/match code touched.
- Comparison exclusion checked: no exclusion save/delete/match code touched.
- Summary/report/graph count checked: no summary module change.
- Diff scroll sync checked: no scroll sync code touched.
- Line connector rendering checked: source-line lookup only; connector code untouched.
- Tests run: npm.cmd run guard:legacy-core pass; npm.cmd test pass; npm.cmd run build pass.
