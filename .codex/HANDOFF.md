# Handoff

## 현재 목표

개발 방향을 MVP로 재정렬했다.

제품 목표:
- Nokia Classic -> Nokia MD-CLI migration config를 의미 기준으로 비교한다.
- 실제 누락 설정을 정상으로 판단하지 않는 것이 최우선이다.
- MVP 핵심 section은 Interface, Static-route, BGP neighbor다.

기준 문서:
- `docs/mvp-product-definition.md`
- `docs/mvp-development-priority.md`
- `docs/legacy-core-stability-map.md`

## 이번 커밋에 포함된 작업

문서:
- MVP 제품 정의 추가
- MVP 개발 우선순위 추가
- 집/다른 환경에서 이어받기 위한 구현 handoff 추가

테스트:
- `tests/mvp-core-scope.test.js` 추가
- Interface / Static-route / BGP neighbor 핵심 계약을 테스트로 고정

코드:
- `src/core/comparisonPlan.js`
- visible compare field에 `interface` 추가
- address/prefix로 매칭된 interface에서도 interface name 변경이 fieldSummary에 `changed`로 표시됨
- `src/core/semanticFieldNormalizer.js`
- `src/core/parsers/nokiaClassicParser.js`
- `src/core/parsers/nokiaMdCliParser.js`
- `src/core/matchers/objectMatcher.js`
- Interface identity에 non-Base router/routing context 반영
- Classic direct `configure router ... interface` context 보존
- MD-CLI block/one-line interface context 보존
- context가 다른 같은 IP/prefix interface 자동 매칭 차단
- 실제 fixture `New_interface_1.txt`의 duplicate address service interface 병합 문제 수정
- 같은 service/address라도 interface name이 다르면 별도 객체로 보존
- Static-route identity에 non-Base router/routing context 반영
- Classic direct `configure router ... static-routes route` context 보존
- MD-CLI block/one-line static route context 보존
- context가 다른 같은 prefix/next-hop static-route 자동 매칭 차단
- `src/core/summaryAnalytics.js`
- `src/core/summaryRenderer.js`
- `src/core/reportExport.js`
- `src/core/legacyCore.js`
- `src/components/ConfigInputPanel.jsx`
- MVP section summary cards 추가
- Excel-compatible CSV report export 추가

## 실제 사용 시 변경점

Interface:
- 기존 interface name과 신규 interface name이 달라도 IP/prefix가 같으면 같은 interface로 매칭된다.
- 동시에 interface 이름 변경이 비교 결과에 표시된다.
- 예: `to-Dobong-MNC#1` -> `Te1/1/1` 이 `interface changed`로 남는다.
- 같은 IP/prefix라도 router context가 다르면 같은 interface로 자동 확정하지 않는다.
- MD-CLI block과 one-line 모두 non-Base router context를 identity에 포함한다.
- target fixture의 `To-MNC#2-1` / `To-MNC#2-2`처럼 같은 주소를 가진 service interface도 서로 덮어쓰지 않는다.
- target에 같은 address/prefix가 없는 interface old-only는 matcherIssue가 아니라 realMissingTarget으로 분류한다.
- `missing-target-address-with-description-evidence` 20건은 10G -> 100G 변경으로 사라지는 `to-mnt#*` 회선이다. target 신규 interface에 IP address가 없으므로 description 근거만으로 매치하지 않는다.
- IP가 없는 interface는 같은 target name이 있을 때만 matcherIssue 후보로 남긴다.
- Classic config 안의 같은 interface name 주소 없는 stub은 주소 있는 interface object로 병합한다.

Static-route:
- 같은 prefix인데 next-hop이 바뀌면 자동 동일 처리하지 않는다.
- candidate / 검토 필요 경로로 남긴다.
- 같은 prefix/next-hop이라도 router context가 다르면 같은 static-route로 자동 확정하지 않는다.
- MD-CLI block과 one-line 모두 non-Base router context를 static-route identity에 포함한다.

Port/LAG:
- Web top diff `legacyCore` endpoint alignment mirrors the same compact-old vs split-target LAG endpoint logic, so `lag 184` maps to `lag-B-4206` by `Dobong-TOU-FD19_7/1` vs `Dobong-TOU-FD19, Po11(Te7/1)`.
- target에 같은 physical id, member overlap, description endpoint 증거가 없는 port/lag old-only는 matcherIssue가 아니라 realMissingTarget으로 분류한다.
- LAG/port description endpoint matcher는 compact old 표기와 split target 표기, `to-` 방향 접두어, 괄호 안 물리 포트, 포트 없는 underscore 장비 토큰을 같은 endpoint 증거로 본다.
- Classic `port-list` TCP/UDP 항목인 DHCP `port 67/68`은 physical port 객체로 파싱하지 않는다.

Policy placeholders:
- target에 같은 route-policy/prefix-list/community identity가 없으면 parserGap가 아니라 realMissingTarget으로 분류한다.
- Classic policy community placeholder는 `community ... members/expression` 정의만 포함한다. SNMP community, notify-community, `community add` action은 정의 객체로 만들지 않는다.

BGP neighbor:
- peer IP 기준으로 같은 neighbor를 매칭한다.
- import/export policy 차이는 changed로 노출된다.
- Classic nested `group "..."` context is applied to child neighbors.
- BGP group reference rename is classified as `structure-converted`, not `changed`.
- Review rows display BGP admin state as `admin-state`, not `state`.
- BGP `structure-converted` group rows and unresolved inherited `peer-as`/`export.policy` rows are suppressed in object grouping, not active issues.
- Actual fixture check:
  - Classic BGP neighbor raw/parsed counts match: 57, 57, 51, 51.
  - New_bgp_1..4 neighbor raw/parsed counts match: 56, 56, 44, 44.
  - Classic child neighbors carry inherited group/peer-as/export fields.
  - Active object grouping has 0 `structure-converted`/`inheritance-unresolved` rows across BGP examples.
  - Suppressed BGP grouping counts: group 56/56/44/44, inheritance 164/164/132/132.

PIM:
- Classic `pim` block interfaces parse as PIM objects.
- Classic `pim` block 중간의 misindented child `exit`는 PIM context를 닫지 않는다.
- MD-CLI `/configure { router "Base" pim interface ... }` parses as PIM, not generic router interface.
- Classic PIM normalized identity is canonical lower-case, so Classic/MD-CLI case differences auto-match.
- Target에 generic interface만 있고 PIM 설정이 없는 old PIM은 매치하지 않고 `missing-target-pim-config-with-interface-evidence`로 분리한다.
- Actual fixture raw/parsed counts match:
  - Classic: 15, 55, 49, 48
  - New_PIM_1..4: 50, 50, 44, 44
- Current PC fixture PIM matched counts: case 1/2 = 47/47.

Fixture matrix:
- `scripts/validateCompareFixtures.js --all-cases --scope full` uses the real example directory in sibling `network-config-workbench-home`.
- Case mapping: 027 -> New_*_1, 028 -> New_*_2, 029 -> New_*_3, 030 -> New_*_4.
- Scope support: full, bgp, static, interface, lag, port, pim.
- Override path: `NCW_FIXTURE_DIR` or `--fixture-dir`.
- If exact target part names are missing, the validator accepts one suffixed variant.
  - Example: `New_static_1_순서수정.txt`, `New_PIM_1_확인완료.txt`.
- Validator JSON now includes `fixtureScope.byType` and `fixtureScope.byReason` breakdowns for partial target, matcherIssue, parserGap, and realMissingTarget diagnostics.
- Current PC fixture path:
  - `C:\Users\gksmf\바탕 화면\실험실\코덱스\자료\테스트 config`
  - Only cases 1/2 have complete target part files in this directory.

Status labels:
- User-facing compare status labels now use MVP terms:
  - `동일`
  - `변경`
  - `검토 필요`
  - `누락`
  - `추가`
  - `미매칭`
- Internal statuses (`matched`, `candidate`, `old-only`, `new-only`) remain unchanged for matching, policies, CSS classes, and data attributes.

Section summary:
- Summary dashboard now has Interface / Static-route / BGP neighbor cards.
- Cards show total, matched, review-needed, changed, missing, added, and average overlap.
- Card click reuses the existing object type filter.

Excel export:
- Export button now downloads real `.xlsx` multi-sheet workbook.
- Sheet 구성: All / Interface / Static Route / BGP / Port LAG / Service / Other.
- CSV builder remains for compatibility tests/helpers.
- Fixed columns:
  - section
  - old object
  - new object
  - status
  - field
  - old value
  - new value
  - reason
  - severity
  - action needed
- `structure-converted`, `inheritance-unresolved`, ignored/suppressed fields are not exported as active rows by default.
- Actual fixture check:
  - Source: `Gangbu-SEA027H_config.txt`
  - Target: `New_interface_1.txt` + `New_static_1.txt` + `New_bgp_1.txt`
  - Export rows: 1036
  - Status counts: 변경 416, 추가 143, 누락 477
- Smoke contracts:
  - `Excel 저장` is a visible text button.
  - Export click builds XLSX workbook and writes `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
  - Section summary cards filter object list and switch to the objects tab.

MD-CLI:
- block config와 full-context one-line config가 같은 interface identity로 정규화되는 계약을 테스트로 고정했다.

전체 입력:
- 하나의 config 안에 Interface / Static-route / BGP / Port가 섞여 있어도 MVP 핵심 객체 3종이 같이 추출되고 매칭되는 테스트를 추가했다.

## 다음 개발 우선순위

1. MVP 핵심 section별 실제 대형 config 샘플로 parser gap 확인
2. Interface parser 보강
   - VRF/routing context 반영: non-Base router 완료
   - service/router context 보존: Classic direct / MD-CLI block/one-line router 완료
   - address/prefix 누락 케이스 확인: `New_interface_1..4` address interface raw/parsed count 일치 확인
   - target address/name 증거가 없는 interface old-only는 realMissingTarget으로 분류
   - Classic duplicate interface stub 병합 완료
3. Static-route parser/matcher 보강
   - routing context + prefix 기준 확정: non-Base router 완료
   - next-hop 변경/증감은 검토 필요로 명확히 표시
   - prefix가 같은 static-route의 next-hop 변경/증감은 `candidate` 유지, low-confidence 중복 집계는 제거
   - target에 같은 prefix가 없는 static-route old-only는 matcherIssue가 아니라 realMissingTarget으로 분류
4. BGP neighbor parser/matcher 보강
   - peer IP 기준 매칭 유지
   - group inheritance와 import/export 차이 표시 안정화
   - Classic nested group context: done
   - group rename noise: done
   - admin-state display: done
   - unresolved MD-CLI group definitions and active/suppressed row grouping: done
5. 상태 분류 라벨 정리
   - 동일 / 변경 / 검토 필요 / 누락 / 추가 / 미매칭: main compare result labels done
6. section 요약 UI: done
7. Excel export: done, real `.xlsx` multi-sheet
8. smoke contracts for section card filtering and CSV download: done
9. Fixture matrix validation: done
10. 다음: realMissingTarget 상세 분해 또는 UI polish

## 지금 하지 말 것

- 관계 그래프 고도화
- 라인 연결선/anchor/bridge UI 수정
- 색상/박스 미세 수정
- 수동 매핑 재설계
- 사용자 정의 alias/rule 구현
- Juniper/Cisco/Arista 확장
- C 전환
- legacyCore.js 대규모 수정

## 검증 결과

- branch: `work/mvp-interface-stabilization`
- `npm.cmd run guard:legacy-core` pass
- `npm.cmd test` pass: 197 pass, 1 skip
- `npm.cmd run build` pass
- `node scripts/validateCompareFixtures.js --all-cases --scope full --iterations 1` pass
- `node scripts/validateCompareFixtures.js --all-cases --scope pim --iterations 1` pass
- `node scripts/validateCompareFixtures.js --all-cases --md-full-logs --iterations 1` pass
- `node scripts/validateCompareFixtures.js --available-cases --scope full --iterations 1` pass
- `node scripts/validateCompareFixtures.js --available-cases --md-full-logs --iterations 1` pass
- `node scripts/validateCompareFixtures.js --case 1 --scope full --iterations 1 --fixture-dir "C:\Users\gksmf\바탕 화면\실험실\코덱스\자료\테스트 config"` pass
- `node scripts/validateCompareFixtures.js --case 2 --scope full --iterations 1 --fixture-dir "C:\Users\gksmf\바탕 화면\실험실\코덱스\자료\테스트 config"` pass
- Current PC fixture case 1/2 full/static lowConfidence: 0
- Current PC fixture case 1/2 static unmatchedMatcherIssue: 0
- Current PC fixture case 1/2 port/lag unmatchedMatcherIssue: 0
- Current PC fixture case 1/2 interface unmatchedMatcherIssue: 0
- Current PC fixture case 1/2 full unmatchedMatcherIssue: 0
- Current PC fixture case 1/2 full parserGap: 0
- Added full MD-CLI log check from `C:\Users\gksmf\바탕 화면\실험실\코덱스\자료\테스트 config`:
  - automated by `--md-full-logs`: case 1/2 `MDconfig` and `MDfullcontext` are discovered by SEA id + log type.
  - case 1 `MDconfig.log`: matched 357, oldOnly 118, newOnly 569, unmatchedMatcherIssue 0, parserGap 0, realMissingTarget 118, lowConfidence 0
  - case 1 `MDfullcontext.log`: matched 350, oldOnly 120, newOnly 376, unmatchedMatcherIssue 0, parserGap 0, realMissingTarget 120, lowConfidence 0
  - case 2 `MDconfig.log`: matched 355, oldOnly 125, newOnly 575, unmatchedMatcherIssue 0, parserGap 0, realMissingTarget 125, lowConfidence 0
  - case 2 `MDfullcontext.log`: matched 348, oldOnly 127, newOnly 382, unmatchedMatcherIssue 0, parserGap 0, realMissingTarget 127, lowConfidence 0
- MD-CLI full-log GRE source conversion:
  - case 1: `gre-source` `220.116.146.97/30` / `tunnel-1.public:1` -> `gre-source-1` `112.188.18.2/30` / `pxc-1.b:1`
  - case 2: `gre-source` `220.116.146.101/30` / `tunnel-1.public:1` -> `gre-source-1` `112.188.18.66/30` / `pxc-1.b:1`
  - Nokia-only `nokia-gre-source-primary-conversion`으로 자동 매치한다. `gre-source-2`는 신규 이중화 회선으로 남긴다.
- Current PC fixture full realMissingTarget by type:
  - case 1: port 66, interface 38, static-route 10, pim 8, route-policy 8, prefix-list 7, community 5, lag 4, bgp 1
  - case 2: port 70, interface 38, static-route 9, pim 8, route-policy 8, prefix-list 7, community 6, lag 6, bgp 1
- Current PC fixture static-route realMissingTarget by reason:
  - case 1: missing-target-default-route 1, missing-target-indirect-tunnel-route 4, missing-target-loopback-host-route 3, missing-target-multi-next-hop-route 2
  - case 2: missing-target-default-route 1, missing-target-indirect-tunnel-route 4, missing-target-loopback-host-route 2, missing-target-multi-next-hop-route 2
- Current PC fixture policy placeholder realMissingTarget by reason:
  - case 1: community expression 1, community members 4, ip-prefix-list 5, prefix-list 2, route-policy deny/drop 2, route-policy iCOD 2, route-policy peer 4
  - case 2: community expression 1, community members 5, ip-prefix-list 5, prefix-list 2, route-policy deny/drop 2, route-policy iCOD 2, route-policy peer 4
- Current PC fixture BGP realMissingTarget by reason:
  - case 1: missing-target-bgp-ser-peer 1
  - case 2: missing-target-bgp-ser-peer 1
- Current PC fixture port/lag realMissingTarget by reason:
  - case 1: lag missing-target-lag-members-with-description 4; port missing-target-disabled-port 65, missing-target-active-port-with-description 1
  - case 2: lag missing-target-lag-members-with-description 6; port missing-target-disabled-port 67, missing-target-active-port-with-description 3
- Current PC fixture interface realMissingTarget by reason:
  - case 1: missing-target-address-with-description-evidence 20, missing-target-gre-address 16, missing-target-system-loopback-address 2
  - case 2: missing-target-address-with-description-evidence 20, missing-target-gre-address 16, missing-target-system-loopback-address 2
  - description-evidence 20건은 10G -> 100G 전환으로 사라지는 회선. target interface IP가 없으면 매치 금지.
- Current PC fixture PIM realMissingTarget by reason:
  - case 1: missing-target-pim-config-with-interface-evidence 4, missing-target-type 4
  - case 2: missing-target-pim-config-with-interface-evidence 4, missing-target-type 4

## 집에서 이어받는 절차

```powershell
git pull
git checkout work/mvp-interface-stabilization
npm.cmd install
npm.cmd test
npm.cmd run build
node scripts/validateCompareFixtures.js --all-cases --scope full --iterations 1
node scripts/validateCompareFixtures.js --all-cases --md-full-logs --iterations 1
```

그 다음 작업은 코드 수정 전에 이 순서로 진행한다.

1. `docs/mvp-product-definition.md` 확인
2. `docs/mvp-development-priority.md` 확인
3. `tests/mvp-core-scope.test.js` 확인
4. Interface / Static-route / BGP 중 하나만 골라 테스트 먼저 추가
5. 테스트 실패 지점을 최소 코드로 수정
