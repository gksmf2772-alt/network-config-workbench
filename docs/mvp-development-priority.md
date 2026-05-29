# MVP Development Priority

기준 문서: `docs/mvp-product-definition.md`

## 목표

Nokia Classic -> Nokia MD-CLI migration 검수를 위해 Interface, Static-route, BGP neighbor 비교 정확도를 먼저 안정화한다.

## P0. 현재 기능 재고 조사

목표:
- 현재 parser/normalizer/matcher가 MVP 핵심 section을 얼마나 지원하는지 확인한다.
- 이미 되는 기능과 새로 필요한 기능을 분리한다.

확인 대상:
- Nokia Classic interface/static-route/BGP parser
- Nokia MD-CLI block interface/static-route/BGP parser
- Nokia MD-CLI one-line interface/static-route/BGP parser
- normalizer canonical field
- object matcher key/score
- summary/report status 분류

산출물:
- 테스트와 코드 기준 gap 목록

## P1. Section 추출 안정화

목표:
- 전체 config에서 Interface, Static-route, BGP neighbor를 안정적으로 추출한다.
- MD-CLI block과 full-context one-line을 모두 지원한다.

우선순위:
1. Interface
2. Static-route
3. BGP neighbor

비대상:
- Port/LAG 상세 migration 검증
- 정책/filter/qos 완전 분석
- 관계 그래프

## P2. 객체 매칭 기준 재정렬

Interface:
- routing context/VRF + IP address/prefix 우선
- interface name은 보조 근거
- description은 보조 근거

Static-route:
- routing context/VRF + destination prefix 우선
- next-hop 변경/증감은 검토 필요

BGP neighbor:
- routing context/VRF + peer IP 우선
- 하위 옵션 차이는 변경 또는 검토 필요

## P3. 상태 분류 정리

필수 상태:
- 동일
- 변경
- 검토 필요
- 누락
- 추가
- 미매칭

원칙:
- 확실하지 않으면 동일 처리하지 않는다.
- 실제 누락을 정상으로 판단하는 것을 최우선으로 방지한다.

## P4. Section별 요약/상세 흐름

목표:
- 전체 요약을 먼저 보여준다.
- Interface / Static-route / BGP neighbor 상세로 들어갈 수 있게 한다.

진행:
- Summary dashboard에 Interface / Static-route / BGP neighbor card 추가 완료
- total / matched / review-needed / changed / missing / added / average overlap 표시 완료
- card click은 기존 object type filter 재사용

주의:
- UI 대개편 금지.
- 기존 비교 화면을 가능한 재사용한다.

## P5. Excel 리포트

기본 컬럼:
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

`변경`과 `검토 필요`는 반드시 분리한다.

진행:
- 실제 `.xlsx` multi-sheet export 완료
- sheet 구성: All / Interface / Static Route / BGP / Port LAG / Service / Other
- 기존 CSV builder는 호환용으로 유지
- ignored / structure-converted / inheritance-unresolved noise는 active export에서 제외
- 실제 fixture 기준 CSV row 생성 확인 완료

## P6. 실제 fixture matrix 검증

진행:
- `network-config-workbench-home\예제 및 테스트 설정` 자동 탐색 완료
- case mapping 완료: 027 -> New_*_1, 028 -> New_*_2, 029 -> New_*_3, 030 -> New_*_4
- scope별 검증 완료: full, bgp, static, interface, lag, port, pim
- PIM identity 매칭 gap 수정 완료
- Added MD-CLI `MDconfig.log` / `MDfullcontext.log` full-log check: case 1/2 unmatchedMatcherIssue 0, parserGap 0, lowConfidence 0
- Nokia-only GRE source redundancy conversion 완료: `gre-source` -> `gre-source-1` primary match, `gre-source-2`는 신규 이중화 회선으로 유지
- port/lag realMissingTarget reason split 완료: disabled port, active port with description, lag members with description
- interface realMissingTarget reason split 완료: MNT description-evidence 20, GRE address 16, system/loopback address 2
- static-route realMissingTarget reason split 완료: default, indirect tunnel, loopback host, multi next-hop
- policy placeholder realMissingTarget reason split 완료: community members/expression, ip-prefix-list/prefix-list, route-policy deny/drop/iCOD/peer
- BGP realMissingTarget reason split 완료: SER-PEER missing target peer case 1/2 각 1건

## 보류 항목

다음은 MVP 안정화 전까지 진행하지 않는다.

- 수동 매핑
- 사용자 정의 alias/rule
- 관계 그래프 고도화
- 라인 연결선 고도화
- 색상/박스 UI 미세수정
- Juniper/Cisco/Arista 지원
- C 전환
- 복잡한 profile editor

## 첫 개발 단위

첫 개발 단위는 UI가 아니라 테스트다.

1. Nokia Classic/MD-CLI interface fixture 테스트
2. Nokia Classic/MD-CLI static-route fixture 테스트
3. Nokia Classic/MD-CLI BGP neighbor fixture 테스트
4. block MD-CLI와 one-line MD-CLI 결과가 같은 canonical object/field로 정규화되는지 검증
5. 실제 fixture matrix에서 lowConfidence/matcherIssue가 남는 영역만 다음 parser/matcher 작업으로 선정

테스트로 실패 지점을 고정한 뒤 parser/normalizer/matcher를 최소 수정한다.
