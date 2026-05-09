import React from "react";

export default function ConfigEditor({ side, title }) {
  const prefix = side === "old" ? "old" : "new";
  const cap = side === "old" ? "Old" : "New";
  return (
    <article className="editor-card">
      <div className="editor-header">
        <div>
          <h2>{title}</h2>
          <span id={`${prefix}Meta`}>파일 없음</span>
        </div>
        <div className="header-actions">
          <button id={`restore${cap}Btn`} type="button">원복</button>
          <button id={`move${cap}UpBtn`} type="button">위로</button>
          <button id={`move${cap}DownBtn`} type="button">아래로</button>
          <button id={`clear${cap}Btn`} type="button">비우기</button>
          <button id={`save${cap}Btn`} type="button">저장</button>
        </div>
      </div>
      <div id={`${prefix}DropZone`} className="drop-zone">파일을 드롭하거나 텍스트를 붙여넣으세요</div>
      <div className="code-frame">
        <pre id={`${prefix}LineNumbers`} className="line-numbers">1</pre>
        <textarea id={`${prefix}ConfigInput`} spellCheck="false" wrap="off" />
        <div id={`${prefix}DiffPane`} className="embedded-diff" />
      </div>
      <div id={`${prefix}DiffObjectToolbar`} className="diff-object-toolbar" hidden />
    </article>
  );
}
