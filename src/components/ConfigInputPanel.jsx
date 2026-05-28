import React, { useState } from "react";
import {
  ChevronLeft,
  Download,
  Eraser,
  FileCode2,
  GitCompare,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import ConfigEditor from "./ConfigEditor.jsx";
import { AppButton } from "./ui/AppButton.jsx";
import { AppCheckbox } from "./ui/AppCheckbox.jsx";
import { AppIconButton } from "./ui/AppIconButton.jsx";
import { AppPanel } from "./ui/AppPanel.jsx";
import { AppSectionHeader } from "./ui/AppSectionHeader.jsx";
import { AppSelect } from "./ui/AppSelect.jsx";
import { AppToolbar } from "./ui/AppToolbar.jsx";

function SwitchRow({ id, defaultChecked, children }) {
  return <AppCheckbox id={id} defaultChecked={defaultChecked} label={children} className="switch-row ncw-switch-row" />;
}

const SETTINGS_MENUS = [
  { id: "compare", label: "비교 옵션" },
  { id: "scope", label: "설정 범위" },
  { id: "view", label: "보기" },
  { id: "status", label: "상태" },
];

export default function ConfigInputPanel() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMenu, setSettingsMenu] = useState("compare");

  return (
    <section id="compareTab" className="tab-panel active">
      <div className="workspace">
        {settingsOpen ? (
          <button
            className="compare-settings-scrim"
            type="button"
            aria-label="비교 설정 닫기"
            onClick={() => setSettingsOpen(false)}
          />
        ) : null}
        <motion.aside
          className={`control-panel ncw-control-panel compare-settings-panel ${settingsOpen ? "is-open" : ""}`}
          initial={false}
          animate={{ opacity: settingsOpen ? 1 : 0, y: settingsOpen ? 0 : -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          aria-hidden={!settingsOpen}
        >
          <AppIconButton
            id="toggleControlsBtn"
            className="control-collapse-btn"
            type="button"
            title="비교 옵션 숨기기"
            aria-label="비교 옵션 숨기기"
            onClick={() => setSettingsOpen((value) => !value)}
          >
            <ChevronLeft className="h-4 w-4" />
          </AppIconButton>

          <div className="compare-settings-panel__header">
            <div>
              <strong>비교 설정</strong>
              <span>메뉴별 옵션 설정</span>
            </div>
            <AppIconButton type="button" title="닫기" aria-label="닫기" onClick={() => setSettingsOpen(false)}>
              <X className="h-4 w-4" />
            </AppIconButton>
          </div>

          <div className="compare-settings-panel__body">
            <nav className="compare-settings-menu" aria-label="비교 설정 메뉴">
              {SETTINGS_MENUS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={settingsMenu === item.id ? "is-active" : ""}
                  onClick={() => setSettingsMenu(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="compare-settings-content">
              <AppPanel className={`ncw-side-card compare-settings-section ${settingsMenu === "compare" ? "is-active" : ""}`}>
                <AppSectionHeader icon={SlidersHorizontal} title="비교 옵션" description="정규화, 정렬, 의미 기반 차이 필터" />
                <div className="app-panel__content grid gap-3">
                  <SwitchRow id="normalizeSpacingToggle" defaultChecked>공백 정규화</SwitchRow>
                  <SwitchRow id="sortObjectsToggle">설정 정렬</SwitchRow>
                  <SwitchRow id="autoAlignToggle">정규화 설정 자동 정렬</SwitchRow>
                  <SwitchRow id="ignoreCommentsToggle" defaultChecked>주석/빈 줄 무시</SwitchRow>
                  <SwitchRow id="ignoreGeneratedToggle" defaultChecked>생성 라인 무시</SwitchRow>
                  <SwitchRow id="semanticDebugToggle">의미 디버그 표시</SwitchRow>
                </div>
              </AppPanel>

              <AppPanel className={`ncw-side-card compare-settings-section ${settingsMenu === "scope" ? "is-active" : ""}`}>
                <AppSectionHeader title="설정 범위" />
                <div className="app-panel__content">
                  <div id="objectToggles" className="chip-grid" />
                </div>
              </AppPanel>

              <AppPanel className={`ncw-side-card compare-settings-section ${settingsMenu === "view" ? "is-active" : ""}`}>
                <AppSectionHeader title="보기" />
                <div className="app-panel__content grid gap-3">
                  <label>
                    테마
                    <AppSelect id="themeSelect">
                      <option value="light">라이트</option>
                      <option value="dark">다크</option>
                      <option value="contrast">고대비</option>
                    </AppSelect>
                  </label>
                  <label>
                    에디터 글꼴
                    <AppSelect id="fontSelect">
                      <option value="Consolas">Consolas</option>
                      <option value="D2Coding">D2Coding</option>
                      <option value="Cascadia Mono">Cascadia Mono</option>
                      <option value="monospace">Monospace</option>
                    </AppSelect>
                  </label>
                  <label>
                    검색
                    <input id="filterInput" placeholder="interface, static-route, 누락" />
                  </label>
                  <SwitchRow id="fieldHighlightToggle" defaultChecked>설정 항목 박스 표시</SwitchRow>
                  <SwitchRow id="objectMappingVisibleToggle" defaultChecked>설정 연결 표시</SwitchRow>
                  <SwitchRow id="mappingDebugToggle">고급 매핑 진단</SwitchRow>
                  <label>
                    라인 연결 스타일
                    <AppSelect id="lineMappingStyleSelect">
                      <option value="straight">직선 연결</option>
                      <option value="chain">체인 연결</option>
                      <option value="slime">흐름 연결</option>
                    </AppSelect>
                  </label>
                  <label className="range-control">
                    선 굽힘
                    <input id="lineMappingBendRange" type="range" min="0" max="100" defaultValue="65" />
                  </label>
                  <SwitchRow id="lineMappingVisibleToggle" defaultChecked>라인 연결 표시</SwitchRow>
                  <SwitchRow id="lineMappingAnimationToggle">라인 연결 애니메이션</SwitchRow>
                  <label>
                    결과 필터
                    <AppSelect id="resultFilterSelect">
                      <option value="all">전체</option>
                      <option value="changed">변경</option>
                      <option value="missing">누락</option>
                      <option value="added">추가</option>
                      <option value="syntax">문법</option>
                      <option value="required">필수</option>
                    </AppSelect>
                  </label>
                </div>
              </AppPanel>

              <AppPanel className={`ncw-side-card compare-settings-section ${settingsMenu === "status" ? "is-active" : ""}`}>
                <AppSectionHeader title="상태" />
                <div className="app-panel__content">
                  <div className="status-card">
                    <strong id="compareStatus">대기</strong>
                    <span id="lastComparedAt">마지막 비교: 없음</span>
                  </div>
                </div>
              </AppPanel>
            </div>
          </div>
        </motion.aside>

        <section className="compare-area">
          <motion.div
            className="action-bar ncw-action-bar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: "easeOut", delay: 0.04 }}
          >
            <AppToolbar>
              <AppButton
                id="openCompareSettingsBtn"
                className="compare-settings-trigger"
                type="button"
                variant="secondary"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings /> 설정
              </AppButton>
              <div className="compare-profile-inline">
                <span>프로파일</span>
                <AppSelect id="profileSelect" />
                <AppButton id="loadProfileBtn" type="button" variant="secondary">적용</AppButton>
              </div>
              <AppButton id="compareBtn" type="button"><GitCompare />비교 실행</AppButton>
              <AppButton id="alignBtn" type="button" variant="secondary">설정 정렬</AppButton>
              <AppIconButton id="restoreInitialBtn" type="button" title="초기 입력 원복"><RotateCcw /></AppIconButton>
              <AppIconButton id="exportReportBtn" type="button" title="리포트 저장"><Download /></AppIconButton>
              <AppIconButton id="clearAllBtn" type="button" title="전체 비우기"><Eraser /></AppIconButton>
            </AppToolbar>
          </motion.div>

          <div className="editor-grid">
            <svg id="diffObjectBackgroundSvg" className="diff-object-background-overlay" aria-hidden="true" />
            <ConfigEditor side="old" title="기존 Config" icon={FileCode2} />
            <div className="diff-gutter" aria-hidden="true">
              <div className="diff-gutter__rail" />
            </div>
            <ConfigEditor side="new" title="신규 Config" icon={FileCode2} />
            <svg id="diffConnectorSvg" className="diff-connector-overlay" aria-hidden="true" />
          </div>
        </section>
      </div>
    </section>
  );
}
