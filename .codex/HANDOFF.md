# Handoff

## 이번 작업
- 미연결 설정(old-only/new-only/unmatched 계열) 배경을 orange/yellow token으로 통일.
- `profile.exceptions` 안에 `type: comparison-exclusion` 규칙을 추가해 설정 비교 제외를 canonical plan 상태에 반영.
- `activeIssues`에서 제외하고 `excludedIssues`/`review.excluded`/`counts.excluded`로 분리.
- 비교 탭 하단 기존/신규 객체 위/아래/삭제 수동 정렬 패널 기본 렌더링 제거.
- 일반 UI 용어를 객체/필드 중심에서 설정/설정 항목 중심으로 변경.

## 원인
- unmatched 상태 token은 있었지만 일부 CSS가 old-only/new-only를 분홍/빨강 계열 또는 matched와 비슷한 배경으로 덮음.
- 프로파일 예외는 field/line suppression에만 적용되고, 반대편 설정이 없는 plan item 자체를 excluded canonical 상태로 옮기는 규칙이 없었음.
- Summary/Report/Graph/common field analysis가 `policySuppressed` 중심으로만 필터링해 별도 비교 제외 상태를 표현하지 못함.
- 비교 탭 하단 수동 정렬 toolbar가 기본 UI에서 계속 렌더링됨.

## 수정 파일
- `src/core/policyEvaluator.js`
- `src/core/comparisonPlan.js`
- `src/core/summaryAnalytics.js`
- `src/core/objectReviewGroups.js`
- `src/core/compareRenderer.js`
- `src/core/legacyCore.js`
- `src/styles/global.css`
- `src/components/ConfigInputPanel.jsx`
- `src/components/HeaderBar.jsx`
- `src/components/SemanticSummaryPanel.jsx`
- `src/components/ObjectMatchTable.jsx`
- `src/components/PolicyViolationPanel.jsx`
- `src/components/ProfileEditor.jsx`
- `src/components/ProfileMappingWorkbench.jsx`
- `tests/comparison-exclusion.test.js`

## 테스트
- unmatched visual status/class/token
- new-only 설정 단건 비교 제외
- old-only 설정 단건 비교 제외
- profile-wide BGP new-only 비교 제외
- 비교 제외 해제 후 active 복원
- common field analysis/graph excluded 반영
- 하단 수동 정렬 패널 제거
- 주요 렌더러 용어 설정/연결 안 됨 확인

## 검증 결과
- `npm.cmd test`: 통과, 74개
- `npm.cmd run build`: 통과
- `npm.cmd run validate:all`: 통과
- `npm.cmd run validate:stress`: 통과, 1000/1000
- Browser 플러그인 IAB 연결 실패. Chrome CDP 실제 브라우저로 대체 확인:
  - unmatched 카드 배경 `rgb(255, 237, 213)`, left border `rgb(249, 115, 22)`
  - `이 설정만 비교 제외` 클릭 후 excluded 카드 1개 생성, active unmatched 2 -> 1
  - 하단 기존 객체/신규 객체 toolbar title 없음
  - visible text에서 일반 `객체` 용어 없음, `설정` 용어 표시
  - `비교 제외 해제` 버튼 DOM 확인

## 남은 문제
- Browser 플러그인 IAB 백엔드가 현재 환경에서 발견되지 않아 in-app Browser가 아니라 Chrome CDP로 확인함.
- 기존 코드 내부 변수/클래스명 `object`는 유지.

## 다음 작업
- 사용자가 실제 운영 config로 profile-wide 제외 범위를 추가할 때 예상 적용 개수 확인 UX를 더 다듬을 수 있음.
