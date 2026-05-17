import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, RotateCcw, Save, Sparkles, Undo2 } from "lucide-react";
import { AppButton } from "./ui/AppButton.jsx";
import { AppIconButton } from "./ui/AppIconButton.jsx";
import { AppPanel } from "./ui/AppPanel.jsx";
import { AppSectionHeader } from "./ui/AppSectionHeader.jsx";
import { AppSelect } from "./ui/AppSelect.jsx";
import { AppToolbar } from "./ui/AppToolbar.jsx";
import { VENDOR_OPTIONS } from "../core/vendorPresets.js";

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

  return (
    <section className={`profile-section collapsible-section ${open ? "is-open" : "is-closed"}`}>
      <AppButton type="button" variant="ghost" className="collapsible-header" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={`${id}-content`}>
        <span className="collapsible-icon" aria-hidden="true">
          {open ? <ChevronDown /> : <ChevronRight />}
        </span>
        <span className="collapsible-title">{title}</span>
        <span className="collapsible-summary">{summary}</span>
      </AppButton>
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

function VendorOptions() {
  return VENDOR_OPTIONS.map((vendor) => (
    <option key={vendor.id} value={vendor.id} disabled={!vendor.selectable}>
      {vendor.label} ({vendor.supportLabel})
    </option>
  ));
}

export default function ProfileEditor() {
  return (
    <AppPanel as="article" className="profile-editor">
      <AppSectionHeader
        title="프로파일 편집기"
        description="설정 식별, 의미 설정 항목, 정규화, 검증 정책 설정"
        actions={<AppButton id="newProfileBtn" type="button" variant="secondary"><Plus />새 프로파일</AppButton>}
      />

      <div className="profile-flow-note">
        <strong>규칙 흐름</strong>
        <span>설정 매핑 → 식별 규칙 → 설정 항목 추출 → 정규화 → GUI 매핑 → 검증 정책 → 예외</span>
      </div>

      <label>프로파일 이름<input id="profileNameInput" defaultValue="Nokia 기본 검증" /></label>
      <input id="vendorSelect" type="hidden" defaultValue="nokia" />
      <div className="profile-vendor-grid">
        <label>
          기존 Config 벤더 / OS
          <AppSelect id="oldVendorSelect">
            <VendorOptions />
          </AppSelect>
        </label>
        <label>
          신규 Config 벤더 / OS
          <AppSelect id="newVendorSelect">
            <VendorOptions />
          </AppSelect>
        </label>
      </div>
      <div id="vendorSupportNotice" className="vendor-support-notice" role="status" />

      <CollapsibleSection id="object-type-mapping" title="1. 설정 종류 매핑" summary="기존/신규 설정 종류 연결" defaultOpen>
        <SectionIntro step="1" title="설정 종류 매핑">식별/설정 항목 추출 전에 기존과 신규 설정 종류를 연결.</SectionIntro>
        <div id="mappingEditor" className="mapping-editor" />
      </CollapsibleSection>

      <CollapsibleSection id="identity-rule" title="2. 식별 규칙" summary="기존/신규 설정 식별 기준" defaultOpen>
        <SectionIntro step="2" title="식별 규칙">기존/신규 설정을 같은 의미 설정으로 인식하는 기준.</SectionIntro>
        <div id="identityRuleEditor" className="identity-rule-editor" />
      </CollapsibleSection>

      <CollapsibleSection id="mapping-workbench" title="3. 매핑 워크벤치" summary="라인/그룹/토큰 GUI 매핑" defaultOpen>
        <SectionIntro step="3" title="매핑 워크벤치">예제 설정에서 라인 그룹, 구조 매핑, 토큰 매핑 생성.</SectionIntro>
        <label>설정 종류<AppSelect id="profileObjectTypeSelect" /></label>
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
        <AppToolbar className="profile-example-actions">
          <AppButton id="autoLearnRulesBtn" type="button" variant="secondary"><Sparkles />후보 생성</AppButton>
          <AppButton id="addLineMappingBtn" type="button" variant="secondary">구조 매핑 추가</AppButton>
          <AppButton id="addContextMappingBtn" type="button" variant="secondary">블록 매핑 추가</AppButton>
          <AppButton id="addFieldMappingBtn" type="button" variant="secondary">설정 항목 매핑 추가</AppButton>
          <AppButton id="createTokenGroupBtn" type="button" variant="secondary">토큰 그룹 생성</AppButton>
          <AppButton id="createLineGroupBtn" type="button" variant="secondary">라인 그룹 생성</AppButton>
          <AppButton id="addOldLineRuleBtn" type="button" variant="secondary">기존 예외 추가</AppButton>
          <AppButton id="addNewLineRuleBtn" type="button" variant="secondary">신규 예외 추가</AppButton>
        </AppToolbar>
        <div className="candidate-scope-list" aria-label="후보 생성 범위">
          <span>식별</span>
          <span>설정 항목 추출</span>
          <span>정규화</span>
          <span>구조 매핑</span>
          <span>토큰 매핑</span>
          <span>검증 정책</span>
        </div>
        <div id="profileSelectionGuide" className="profile-guide">토큰, 라인, 그룹 선택</div>
        <div id="profileMappingReactRoot" className="profile-mapping-react-root" />
        <div className="profile-section-subtitle">
          <h4>의미 토큰 매핑</h4>
          <p>토큰 매핑은 라인/그룹 매핑과 분리 관리.</p>
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
              <h4>설정 항목 매핑 호환</h4>
              <div id="profileFieldMappingRows" className="profile-mapping-rows" />
            </div>
          </div>
        </details>
        <details className="profile-compat-panel">
          <summary>라인 예외</summary>
          <div className="profile-section-subtitle">
            <h4>라인 예외</h4>
            <p>무시, 필수, 추가, 누락 같은 최종 라인 단위 예외.</p>
          </div>
          <div id="profileRuleRows" className="profile-rule-rows" />
        </details>
      </CollapsibleSection>

      <CollapsibleSection id="advanced-compare-policy" title="4. 고급 비교 정책" summary="검증 정책, 정규화, 파서 규칙" defaultOpen={false}>
        <SectionIntro step="4" title="검증 정책">설정 항목 추출/정규화 후 필수, 존재, 무시, 비교 동작 제어.</SectionIntro>
        <div id="policyEditor" className="policy-editor" />
        <div className="profile-section-subtitle">
          <h4>정규화 규칙</h4>
          <p>no shutdown과 admin-state enable 같은 동일 의미 문법을 비교 전 정규화.</p>
        </div>
        <div id="normalizeEditor" className="normalize-editor" />
        <div className="profile-section-subtitle">
          <h4>파서 규칙 / 설정 항목 추출</h4>
          <p>비교 및 의미 미리보기에서 사용하는 고급 설정 항목 추출 규칙.</p>
        </div>
        <div id="parserRuleEditor" className="parser-rule-editor" />
      </CollapsibleSection>

      <div className="profile-section">
        <h3>변경 이력</h3>
        <div id="profileChangesList" className="profile-changes-list" />
        <AppToolbar className="profile-rollback-actions">
          <AppIconButton id="undoProfileBtn" type="button" title="직전 변경 취소"><Undo2 /></AppIconButton>
          <AppButton id="rollbackProfileBtn" type="button" variant="secondary"><RotateCcw />저장 상태 복원</AppButton>
        </AppToolbar>
      </div>

      <div className="profile-save-panel">
        <div id="profileStatus" className="profile-status" data-kind="info">프로파일 변경 없음</div>
        <AppButton id="saveProfileBtn" type="button"><Save />프로파일 저장</AppButton>
        <AppButton id="saveProfileAsBtn" type="button" variant="secondary">다른 이름 저장</AppButton>
      </div>
    </AppPanel>
  );
}
