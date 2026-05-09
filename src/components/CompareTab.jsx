import React from "react";
import ConfigEditor from "./ConfigEditor.jsx";

export default function CompareTab() {
  return (
    <section id="compareTab" className="tab-panel active">
      <div className="workspace">
        <aside className="control-panel">
          <button id="toggleControlsBtn" className="control-collapse-btn" type="button" title="비교 옵션 접기/펼치기" aria-label="비교 옵션 접기/펼치기">‹</button>

          <section>
            <h2>비교 옵션</h2>
            <label className="switch-row"><input id="normalizeSpacingToggle" type="checkbox" defaultChecked />공백 정규화</label>
            <label className="switch-row"><input id="sortObjectsToggle" type="checkbox" />객체 내부 정렬</label>
            <label className="switch-row"><input id="autoAlignToggle" type="checkbox" />신규 객체 자동 정렬</label>
            <label className="switch-row"><input id="ignoreCommentsToggle" type="checkbox" defaultChecked />주석/빈 줄 무시</label>
            <label className="switch-row"><input id="ignoreGeneratedToggle" type="checkbox" defaultChecked />생성성 라인 무시</label>
          </section>

          <section>
            <h2>프로파일</h2>
            <label>프로파일 선택<select id="profileSelect" /></label>
            <button id="loadProfileBtn" type="button">프로파일 적용</button>
          </section>

          <section>
            <h2>객체 범위</h2>
            <div id="objectToggles" className="chip-grid" />
          </section>

          <section>
            <h2>화면 표시</h2>
            <label>
              테마
              <select id="themeSelect">
                <option value="light">라이트</option>
                <option value="dark">다크</option>
                <option value="contrast">고대비</option>
              </select>
            </label>
            <label>
              글꼴
              <select id="fontSelect">
                <option value="Consolas">Consolas</option>
                <option value="D2Coding">D2Coding</option>
                <option value="Cascadia Mono">Cascadia Mono</option>
                <option value="monospace">Monospace</option>
              </select>
            </label>
            <label>검색<input id="filterInput" placeholder="interface, static-route, missing" /></label>
            <label>
              결과 필터
              <select id="resultFilterSelect">
                <option value="all">전체</option>
                <option value="changed">변경</option>
                <option value="missing">누락</option>
                <option value="added">추가</option>
                <option value="syntax">문법 의심</option>
                <option value="required">필수 규칙</option>
              </select>
            </label>
          </section>

          <section>
            <h2>상태</h2>
            <div className="status-card">
              <strong id="compareStatus">대기</strong>
              <span id="lastComparedAt">마지막 비교: 없음</span>
            </div>
          </section>
        </aside>

        <section className="compare-area">
          <div className="editor-grid">
            <ConfigEditor side="old" title="기존 Config" />
            <ConfigEditor side="new" title="신규 Config" />
            <svg id="diffConnectorSvg" className="diff-connector-overlay" aria-hidden="true" />
          </div>

          <div className="action-bar">
            <button id="compareBtn" type="button">비교 실행</button>
            <button id="alignBtn" type="button">객체 정렬</button>
            <button id="restoreInitialBtn" type="button">초기값 원복</button>
            <button id="exportReportBtn" type="button">리포트 저장</button>
            <button id="clearAllBtn" type="button">전체 비우기</button>
          </div>
        </section>
      </div>
    </section>
  );
}
