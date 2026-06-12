# Codex 작업 지시서

현재 React Flow 기반 설정 비교 그래프에서 layout 문제와 mapping 문제가 섞여 있다. UI 위치만 조정하지 말고, 먼저 canonical graph builder와 relation resolver를 분리해서 구조를 고쳐라.

목표:
전체 네트워크 설정을 입력받아 다음 관계를 정확하게 구성하고 React Flow에서는 보기 좋게 표시한다.

PORT → LAG → L3_INTERFACE → PEER_NH → STATIC_ROUTE / BGP_NEIGHBOR / PIM

작업 원칙:
1. React Flow는 renderer로만 사용한다.
2. 관계 판단은 parser/resolver 계층에서 끝낸다.
3. canonical graph에는 직접 edge만 넣는다.
4. 화면 가독성을 위한 node 복제는 view graph에서만 허용한다.
5. 모든 edge는 confidence와 evidence를 가져야 한다.
6. 모호한 관계는 자동 연결하지 말고 ambiguous로 분류한다.

1차 작업: 코드 구조 파악
- 현재 parser, graph builder, React Flow renderer 관련 파일을 찾아라.
- graph node/edge 생성 로직이 어디에 있는지 정리해라.
- 변경 계획을 먼저 제시한 뒤 구현하라.
- 임의로 노드 좌표만 조정하는 수정은 하지 마라.

2차 작업: 타입과 canonical ID 추가
다음 node kind를 명시적으로 정의하라.
- PORT
- LAG
- L3_INTERFACE
- PEER_NH
- STATIC_ROUTE
- BGP_NEIGHBOR
- PIM

canonical node id는 label이 아니라 다음 키로 만든다.
- PORT: deviceId + canonical interface name
- LAG: deviceId + lag number
- L3_INTERFACE: deviceId + vrf + canonical interface name
- PEER_NH: deviceId + vrf + ip
- STATIC_ROUTE: deviceId + vrf + prefix + nextHop
- BGP_NEIGHBOR: deviceId + vrf + neighborIp
- PIM: deviceId + vrf + interface + optional neighborIp

3차 작업: 허용 edge만 생성
canonical graph에서 허용되는 직접 edge는 아래뿐이다.
- PORT MEMBER_OF LAG
- LAG HAS_INTERFACE L3_INTERFACE
- L3_INTERFACE HAS_PEER PEER_NH
- PEER_NH USED_BY_STATIC STATIC_ROUTE
- PEER_NH USED_BY_BGP BGP_NEIGHBOR
- L3_INTERFACE HAS_PIM PIM

아래 edge는 생성하지 마라.
- PORT → STATIC_ROUTE
- PORT → BGP_NEIGHBOR
- PORT → PIM
- LAG → STATIC_ROUTE
- LAG → BGP_NEIGHBOR
- LAG → PIM

4차 작업: static route resolver 구현
static route mapping 규칙:
- route.deviceId와 interface.deviceId가 같아야 한다.
- route.vrf와 interface.vrf가 같아야 한다.
- route.nextHop이 없으면 연결하지 않는다.
- route.outgoingInterface가 명시되어 있고 interface와 일치하면 confidence 100.
- route.nextHop이 interface peer IP와 일치하면 confidence 95.
- route.nextHop이 interface connected subnet 안에 있으면 confidence 70.
- 최고 점수 후보가 하나면 PEER_NH → STATIC_ROUTE edge를 생성한다.
- 최고 점수 후보가 둘 이상이면 edge를 만들지 말고 ambiguous로 분류한다.
- 후보가 없으면 unresolved로 분류한다.

5차 작업: BGP/PIM resolver 구현
- BGP neighbor IP가 PEER_NH와 일치하거나 interface connected subnet 안에 있으면 PEER_NH → BGP_NEIGHBOR를 생성한다.
- eBGP multihop 또는 loopback neighbor는 해당 neighbor까지의 reachability가 static/IGP route로 증명될 때만 연결한다.
- PIM은 interface enable과 neighbor를 구분한다.
- 설정만으로 interface에 PIM enable이 확인되면 L3_INTERFACE → PIM edge를 만든다.
- PIM neighbor IP가 확인될 때만 PEER_NH → PIM_NEIGHBOR 형태로 연결한다.

6차 작업: evidence/confidence 구조 추가
모든 edge는 아래 metadata를 포함해야 한다.
- relation
- confidence
- evidence.source: config | state | derived
- evidence.file 또는 source identifier
- lineStart/lineEnd가 가능하면 포함
- reason

7차 작업: view projection과 fixed column layout 추가
React Flow에 canonical graph를 직접 넘기지 말고 view graph를 넘겨라.
기본 view는 다음 column 순서와 x 좌표를 사용한다.
- PORT: 0
- LAG: 260
- L3_INTERFACE: 560
- PEER_NH: 860
- STATIC_ROUTE: 1160
- BGP_NEIGHBOR: 1480
- PIM: 1760

view node는 다음 규칙을 따른다.
- 같은 canonical node를 여러 chain row에 복제해도 된다.
- 단 data.canonicalId는 원본 canonical node id를 유지해야 한다.
- 클릭/hover/highlight는 canonicalId 기준으로 동작해야 한다.

8차 작업: static route aggregate
- 하나의 next-hop에 static route가 여러 개면 기본 view에서는 “Static Routes: N” aggregate node로 표시한다.
- 사용자가 expand/focus할 때만 개별 static route node를 펼친다.

9차 작업: 테스트 추가
최소한 아래 테스트를 추가하고 통과시켜라.
- 하나의 physical port가 channel-group 11이면 PORT → LAG 11 edge만 있어야 한다.
- 같은 port가 LAG 12, LAG 13에 연결되면 테스트 실패 또는 conflict 처리.
- static route next-hop이 interface peer IP와 같을 때 PEER_NH → STATIC_ROUTE edge가 생성되어야 한다.
- static route 후보 interface가 여러 개이고 점수가 같으면 ambiguous로 분류해야 한다.
- PORT → STATIC_ROUTE, LAG → STATIC_ROUTE 같은 transitive edge는 생성되지 않아야 한다.
- BGP neighbor가 peer IP와 같으면 PEER_NH → BGP_NEIGHBOR가 생성되어야 한다.
- PIM enable만 있는 경우에는 L3_INTERFACE → PIM만 생성하고 neighbor edge는 만들지 않는다.

완료 조건:
- 기본 화면에서 PORT | LAG | INTERFACE | PEER/NH | STATIC | BGP | PIM column이 고정되어 보인다.
- 매핑 오류가 unresolved/ambiguous/conflict로 분리되어 표시된다.
- React Flow renderer는 relation inference를 하지 않는다.
- 테스트가 모두 통과한다.
- 변경 사항 설명에 어떤 파일을 어떻게 바꿨는지와 검증 방법을 포함한다.
