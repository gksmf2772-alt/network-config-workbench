import React, { useEffect, useState } from "react";

function CollapsibleSection({ id, title, summary, defaultOpen = false, children }) {
  const storageKey = `profile-section-open:${id}`;
  const [open, setOpen] = useState(() => {
    const saved = window.localStorage?.getItem(storageKey);
    if (saved === "open") return true;
    if (saved === "closed") return false;
    return defaultOpen;
  });

  useEffect(() => {
    window.localStorage?.setItem(storageKey, open ? "open" : "closed");
  }, [open, storageKey]);

  const toggle = () => {
    setOpen((current) => !current);
  };

  return (
    <section className={`profile-section collapsible-section ${open ? "is-open" : "is-closed"}`}>
      <button type="button" className="collapsible-header" onClick={toggle} aria-expanded={open} aria-controls={`${id}-content`}>
        <span className="collapsible-icon" aria-hidden="true">{open ? "▾" : "▸"}</span>
        <span className="collapsible-title">{title}</span>
        <span className="collapsible-summary">{summary}</span>
      </button>
      <div id={`${id}-content`} className="collapsible-content">
        {children}
      </div>
    </section>
  );
}

function SectionIntro({ step, title, children }) {
  return (
    <div className="profile-section-title">
      <span className="profile-step">{step}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}

export default function ProfileEditor() {
  return (
    <article className="profile-editor">
      <h2>프로파일 편집</h2>
      <div className="profile-flow-note">
        <strong>규칙 적용 흐름</strong>
        <span>객체 매핑 → 식별 규칙 → 필드 추출 → 정규화 → GUI 매핑 → 검증 정책 → 예외</span>
      </div>
      <div className="profile-title-actions">
        <button id="newProfileBtn" type="button">새 프로파일</button>
      </div>
      <label>프로파일 이름<input id="profileNameInput" defaultValue="Nokia 기본 검증" /></label>
      <label>
        벤더 / OS
        <select id="vendorSelect">
          <option value="nokia">Nokia Classic / MD-CLI</option>
          <option value="cisco">Cisco</option>
          <option value="juniper">Juniper</option>
        </select>
      </label>

      <CollapsibleSection id="object-type-mapping" title="1. 객체 타입 매핑" summary="기존/신규 객체 타입 연결" defaultOpen>
        <SectionIntro step="1" title="객체 타입 매핑">식별 규칙과 필드 추출 전에 기존/신규 객체 타입을 연결합니다.</SectionIntro>
        <div id="mappingEditor" className="mapping-editor" />
      </CollapsibleSection>

      <CollapsibleSection id="identity-rule" title="2. 식별 규칙" summary="기존/신규 객체 식별 기준" defaultOpen>
        <SectionIntro step="2" title="식별 규칙">객체 키 위치가 다를 수 있으므로 기존/신규 식별 기준을 따로 정의합니다.</SectionIntro>
        <div id="identityRuleEditor" className="identity-rule-editor" />
      </CollapsibleSection>

      <CollapsibleSection id="mapping-workbench" title="3. 매핑 워크벤치" summary="라인/그룹/토큰 GUI 매핑" defaultOpen>
        <SectionIntro step="3" title="매핑 워크벤치">예제 설정에서 라인 그룹, 구조 매핑, 토큰 매핑을 만듭니다.</SectionIntro>
        <label>객체 타입<select id="profileObjectTypeSelect" /></label>
        <div className="profile-example-grid">
          <div>
            <div className="profile-example-title">기존 설정 예제</div>
            <textarea id="profileOldExampleInput" className="profile-example-input" spellCheck="false" wrap="off" />
            <div id="profileOldPreview" className="profile-example-preview" />
          </div>
          <div>
            <div className="profile-example-title">신규 설정 예제</div>
            <textarea id="profileNewExampleInput" className="profile-example-input" spellCheck="false" wrap="off" />
            <div id="profileNewPreview" className="profile-example-preview" />
          </div>
          <svg id="profileExampleConnectorSvg" className="profile-example-connector-overlay" aria-hidden="true" />
          <div id="profileRulePopover" className="profile-rule-popover" hidden />
        </div>
        <div className="profile-example-actions">
          <button id="autoLearnRulesBtn" type="button">규칙 후보 생성</button>
          <button id="addLineMappingBtn" type="button">구조 매핑 추가</button>
          <button id="addContextMappingBtn" type="button">블록 매핑 추가</button>
          <button id="addFieldMappingBtn" type="button">호환용 필드 매핑 추가</button>
          <button id="createTokenGroupBtn" type="button">토큰 그룹 만들기</button>
          <button id="createLineGroupBtn" type="button">라인 그룹 만들기</button>
          <button id="addOldLineRuleBtn" type="button">기존 라인 예외 추가</button>
          <button id="addNewLineRuleBtn" type="button">신규 라인 예외 추가</button>
        </div>
        <div className="candidate-scope-list" aria-label="Candidate generation scope">
          <span>식별 후보</span>
          <span>필드 추출 후보</span>
          <span>정규화 후보</span>
          <span>구조 매핑 후보</span>
          <span>토큰 매핑 후보</span>
          <span>검증 정책 후보</span>
        </div>
        <div id="profileSelectionGuide" className="profile-guide">토큰, 라인, 그룹을 선택하세요.</div>
        <div id="profileMappingReactRoot" className="profile-mapping-react-root" />
        <div className="profile-section-subtitle">
          <h4>의미 토큰 매핑</h4>
          <p>토큰 매핑은 라인/그룹 구조 매핑과 분리해 관리합니다.</p>
        </div>
        <div id="semanticRuleEditor" className="semantic-rule-editor" />
        <details className="profile-compat-panel">
          <summary>고급 호환 매핑</summary>
          <div className="profile-manual-rule-panels">
          <div>
            <h4>구조 매핑</h4>
            <div id="profileMappingRows" className="profile-mapping-rows" />
          </div>
          <div>
            <h4>블록 매핑 호환</h4>
            <div id="profileContextMappingRows" className="profile-mapping-rows" />
          </div>
          <div>
            <h4>호환용 필드 매핑</h4>
            <div id="profileFieldMappingRows" className="profile-mapping-rows" />
          </div>
          </div>
        </details>
        <details className="profile-compat-panel">
          <summary>라인 예외</summary>
          <div className="profile-section-subtitle">
            <h4>라인 예외</h4>
            <p>무시, 필수, 추가, 누락 같은 라인 단위 최종 예외입니다.</p>
          </div>
          <div id="profileRuleRows" className="profile-rule-rows" />
        </details>
      </CollapsibleSection>

      <CollapsibleSection id="advanced-compare-policy" title="4. 고급 비교 정책" summary="검증 정책, 정규화, 파서" defaultOpen={false}>
        <SectionIntro step="4" title="검증 정책">필드 추출과 정규화 이후 필수, 존재, 무시, 비교 방식을 결정합니다.</SectionIntro>
        <div id="policyEditor" className="policy-editor" />
        <div className="profile-section-subtitle">
          <h4>정규화 규칙</h4>
          <p>no shutdown과 admin-state enable처럼 같은 의미의 다른 표현을 비교 전에 맞춥니다.</p>
        </div>
        <div id="normalizeEditor" className="normalize-editor" />
        <div className="profile-section-subtitle">
          <h4>파서 규칙 / 필드 추출</h4>
          <p>비교 엔진과 생성 규칙 미리보기에서 사용하는 고급 필드 추출 규칙입니다.</p>
        </div>
        <div id="parserRuleEditor" className="parser-rule-editor" />
      </CollapsibleSection>

      <div className="profile-section">
        <h3>변경사항</h3>
        <div id="profileChangesList" className="profile-changes-list" />
        <div className="profile-rollback-actions">
          <button id="undoProfileBtn" type="button">직전 변경 취소</button>
          <button id="rollbackProfileBtn" type="button">마지막 저장 상태로 복원</button>
        </div>
      </div>

      <div className="profile-save-panel">
        <div id="profileStatus" className="profile-status" data-kind="info">프로파일 변경사항 없음</div>
        <button id="saveProfileBtn" type="button">프로파일 저장</button>
        <button id="saveProfileAsBtn" type="button">다른 이름으로 저장</button>
      </div>
    </article>
  );
}
