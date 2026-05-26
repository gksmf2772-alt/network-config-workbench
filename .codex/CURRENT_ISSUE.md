# Current Issue

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
