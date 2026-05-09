import React from "react";
import CompareTab from "./CompareTab.jsx";
import ProfileTab from "./ProfileTab.jsx";
import ResultSummary from "./ResultSummary.jsx";

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Network Config Workbench</h1>
          <p>네트워크 설정 비교, 프로파일 규칙, 리포트를 관리합니다.</p>
        </div>
        <div className="topbar-actions">
          <select id="historySelect" title="저장된 비교 이력" />
          <button id="loadHistoryBtn" type="button">불러오기</button>
          <button id="saveSessionBtn" type="button">세션 저장</button>
        </div>
      </header>

      <nav className="tabbar">
        <button id="compareTabBtn" className="tab-button active" type="button">비교</button>
        <button id="profilesTabBtn" className="tab-button" type="button">프로파일</button>
        <button id="summaryPageTabBtn" className="tab-button" type="button">비교 요약</button>
      </nav>

      <main className="app-main">
        <CompareTab />
        <ProfileTab />
        <section id="summaryTab" className="tab-panel summary-page-panel">
          <ResultSummary />
        </section>
      </main>
    </div>
  );
}
