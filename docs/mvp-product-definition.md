# MVP Product Definition

## 목적

이 도구는 Nokia Classic config와 Nokia MD-CLI config를 의미 기준으로 비교해 migration 검수 위험을 줄이는 로컬 비교 도구다.

WinMerge 같은 문자열 diff를 대체하는 것이 출발점이지만, 최종 목적은 단순 텍스트 차이가 아니라 벤더 문법과 설정 구조가 달라도 실제 의미가 같은지 판단하는 것이다.

## 초기 범위

### 지원 벤더/방향

- 기존 config: Nokia Classic
- 신규 config: Nokia MD-CLI

### 지원 MD-CLI 입력 형식

- block config
- full-context one-line config

예:

```text
/configure { router "Base" interface "to-site" ipv4 primary address 10.0.0.1 prefix-length 30 }
/configure { router "Base" static-routes route 10.10.0.0/16 route-type unicast next-hop "10.0.0.2" }
/configure { router "Base" bgp neighbor 192.0.2.1 peer-as 65000 }
```

## MVP 핵심 Section

1. Interface
2. Static-route
3. BGP neighbor

## 보조 Section

- Port
- LAG

Port/LAG는 migration 중 ID가 자연스럽게 바뀔 수 있으므로 1차 핵심 검수 대상이 아니다. description/endpoint 기반 보조 매칭 근거로만 우선 사용한다.

## 상태 정의

### 동일

같은 객체의 같은 의미 field가 의미상 동일한 경우.

예:

- Classic `no shutdown`
- MD-CLI `admin-state enable`

### 변경

같은 객체/같은 역할로 확실히 매칭됐고, 이름이나 값이 바뀐 것을 인식한 경우.

예:

- interface name: `to-Dobong-MNC#1` -> `Te1/1/1`
- policy name: `UP-Peer` -> `UP-Export`

단, 변경이 무조건 안전하다는 뜻은 아니다. 변경으로 인식했지만 영향 검토가 필요하면 `검토 필요`로 분류한다.

### 검토 필요

같은 객체일 가능성이 높거나 migration 과정에서 바뀔 수 있는 값이지만, 자동으로 정상 처리하면 위험한 경우.

예:

- static-route next-hop 변경
- static-route next-hop 개수 증가/감소
- BGP neighbor의 import/export policy 변경
- policy alias/rule 근거 없이 이름이 바뀐 경우
- 객체 매칭 근거가 부족한 경우

### 누락

old에는 있는데 new에서 대응 field/object를 찾지 못한 경우.

### 추가

new에만 있는 field/object인 경우.

### 미매칭

객체 자체를 old/new 사이에서 연결하지 못한 경우.

## 핵심 판단 원칙

확실하지 않으면 `동일` 처리하지 않는다.

우선순위:

1. 실제 누락을 놓치지 않는다.
2. 객체를 잘못 매칭하지 않는다.
3. 애매한 항목은 `검토 필요`로 남긴다.
4. 오탐은 이후 사용자 정의 rule/alias로 줄인다.

## 객체 매칭 기준

### Interface

우선순위:

1. routing context/VRF + IP address/prefix
2. interface name
3. description/endpoint

interface name은 절대 키가 아니다. migration 중 물리 포트 형식이나 표준 이름으로 바뀔 수 있다.

같은 IP가 VRF/context 없이 중복될 가능성은 낮지만, VRF/context가 있으면 반드시 매칭 키에 포함한다.

### Static-route

우선순위:

1. routing context/VRF + destination prefix
2. route type
3. next-hop 후보

next-hop 변경이나 증감은 자동 동일 처리하지 않는다. floating-static이나 벤더 표준 변경 가능성이 있으므로 `검토 필요`로 둔다.

### BGP Neighbor

우선순위:

1. routing context/VRF + peer IP
2. group
3. description

peer IP가 같으면 사실상 같은 neighbor로 본다. 하위 옵션이 다르면 자동 정상 처리하지 않고 `변경` 또는 `검토 필요`로 분류한다.

## 1차 비교 Field

### Interface

- admin-state
- description
- address/prefix
- mtu
- sap/bind 관계
- interface name 변경

### Static-route

- prefix
- next-hop
- preference/metric
- admin-state
- tag

### BGP Neighbor

- peer IP
- admin-state
- group
- peer-as
- import/export policy
- description
- local-address

## 기본 UI 흐름

1. old 전체 config 입력
2. new 전체 config 입력
3. 비교 실행
4. 전체 요약 표시
5. section별 count 표시
   - Interface
   - Static-route
   - BGP neighbor
   - Port/LAG 보조
   - 기타
6. section 클릭 시 해당 section 상세 좌우 비교
7. Excel 리포트 export

전체 요약이 기본 화면이고, 상세 비교는 section별로 들어간다.

## Excel 리포트

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

현재 MVP 출력은 Excel-compatible UTF-8 CSV다. 실제 `.xlsx` multi-sheet 출력은 필요성이 확인되면 이후 확장으로 둔다.

## MVP에서 제외

다음은 MVP 범위에서 제외한다.

- 수동 매핑
- 사용자 정의 alias/rule
- 관계 그래프 고도화
- 라인 연결선 고도화
- 색상/박스 UI 미세수정
- Juniper/Cisco/Arista 지원
- C 전환
- 복잡한 profile editor

## MVP 이후 확장 후보

- 사용자 정의 alias/rule
- 프로젝트별 migration rule
- policy equivalence rule
- Juniper/Cisco/Arista parser
- Excel 리포트 강화
- 관계 그래프
- 성능 최적화
- Web Worker 기반 background compare

## 개발 순서

1. 현재 코드 기능 목록 조사
2. MVP와 무관한 작업 보류 표시
3. splitter/parser가 Interface / Static-route / BGP를 정확히 추출하는지 테스트
4. MD-CLI block / one-line 입력 정규화
5. 객체 매칭 기준 재정렬
6. 상태 분류 로직 정리
7. section 요약 UI
8. Excel export

## 금지 원칙

구현 목표가 확실해지기 전까지 다음 작업을 하지 않는다.

- legacyCore.js 대규모 수정
- UI 미세 조정
- connector/line mapping 시각화 수정
- 관계 그래프 고도화
- 새 벤더 추가
- C 전환

먼저 MVP 범위의 splitter, parser, object matching, status classification을 안정화한다.
