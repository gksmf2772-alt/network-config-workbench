# Network Config Workbench

Nokia migration 작업에서 기존 config와 신규 config를 객체 단위로 비교하기 위한 Web UI 초안입니다.

## 실행

`index.html` 파일을 브라우저로 열면 바로 사용할 수 있습니다. 별도 Node.js 또는 npm 설치가 필요하지 않습니다.

## 현재 포함 기능

- 기존 / 신규 config 드래그 앤 드랍 입력
- 좌우 편집창, 라인 넘버, 파일 저장
- 공백/들여쓰기 정규화 on/off
- 주석/빈 줄/timestamp 무시 on/off
- `port`, `lag`, `interface`, `static-route`, `pim`, `bgp` 객체 단위 parsing
- 객체 sorting 전/후 비교
- 신규 config 객체 순서를 기존 config 기준으로 자동 정렬
- 비교 요약, 누락/추가/변경/문법 의심 결과
- 검색 및 결과 타입 필터
- 테마 및 글꼴 변경
- 브라우저 IndexedDB 기반 비교 이력 저장, 미지원 환경 localStorage fallback
- 검증 프로파일 저장/불러오기/삭제
- 프로파일 기반 객체 매핑, 동일 객체 기준, semantic field extraction
- semantic profile 기반 객체 키, 필드 추출, 정규화, 비교 정책
- 간편 검증 정책: 값 동일, 신규 필수, 존재 여부 동일, 기존에 있으면 신규 필수, 무시, 예외 허용
- 의미 필드 학습, Field Extraction 패턴, diff 토큰 연결, 자동 규칙 후보 생성

## 프로파일 방향

비교 엔진은 line mapping 중심에서 semantic object 중심으로 이동 중입니다.

- `objects`: 객체별 object-key, field extraction pattern, field policy 정의
- `normalize`: create/exit 제거, quote/spacing 정리, admin-state canonical 값 변환
- `validationPolicies`: UI에서 추가하는 compare/presence/required/ignore/exception 정책
- 기존 `lineMappings`, `fieldMappings`, `contextMappings`, `lineRules`는 호환용 데이터로만 남기고 새 비교 경로에서는 semantic extraction과 normalize가 우선합니다.

## 다음 확장 후보

- Tauri/Electron 전환 시 SQLite 연동
- Nokia Classic CLI와 MD-CLI별 상세 parser 분리
- HTML/Excel 리포트 export
- 실제 vsim 결과 import 및 문법 오류 매칭
