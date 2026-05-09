import React from "react";

export default function ResultSummary() {
  return (
    <section className="result-layout compact top-result-tabs">
      <div className="result-tabs" role="tablist" aria-label="비교 결과">
        <button id="summaryTabBtn" className="result-tab active" type="button" data-result-tab="summary" role="tab" aria-selected="true">
          비교 요약
        </button>
        <button id="objectsTabBtn" className="result-tab" type="button" data-result-tab="objects" role="tab" aria-selected="false">
          객체 이동/검색
        </button>
      </div>
      <article id="summaryResultPanel" className="result-panel active" data-result-panel="summary" role="tabpanel">
        <div id="summaryCards" className="summary-grid" />
        <ol id="reportList" className="report-list" />
      </article>
      <article id="objectsResultPanel" className="result-panel" data-result-panel="objects" role="tabpanel" hidden>
        <div className="object-tools">
          <input id="objectSearchInput" placeholder="객체명, 타입, next-hop, tag, description 검색" />
          <select id="objectSortSelect" title="객체 정렬">
            <option value="identity">타입/이름순</option>
            <option value="source">기존/신규순</option>
            <option value="line">라인순</option>
            <option value="field">인식 필드순</option>
          </select>
        </div>
        <div id="objectList" className="object-list" />
      </article>
    </section>
  );
}
