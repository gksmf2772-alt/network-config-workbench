import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
const legacyCore = readFileSync(new URL("../src/core/legacyCore.js", import.meta.url), "utf8");

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(brace + 1, index);
    }
  }
  throw new Error(`${name} body not found`);
}

test("line mapping anchors use pane edges so connectors do not cross config text", () => {
  const semanticAnchor = functionBody(legacyCore, "semanticConfigLineAnchor");
  const diffAnchor = functionBody(legacyCore, "diffLineTextAnchor");

  assert.match(semanticAnchor, /paneRect\.left \+ 6/);
  assert.match(semanticAnchor, /paneRect\.right - 6/);
  assert.doesNotMatch(semanticAnchor, /getActualSettingTextRect/);

  assert.match(diffAnchor, /paneRect\.left \+ 6/);
  assert.match(diffAnchor, /paneRect\.right - 6/);
  assert.doesNotMatch(diffAnchor, /getActualSettingTextRect/);
});

test("line mapping endpoints are rendered and styled as a separate visual layer", () => {
  assert.match(legacyCore, /function buildLineMappingEndpointMarkup/);
  assert.match(legacyCore, /line-mapping-endpoint/);
  assert.match(legacyCore, /<circle class="\$\{classes\}"/);
  assert.match(css, /\.line-mapping-endpoint\s*\{/);
  assert.match(css, /pointer-events:\s*all/);
});

test("diff connector layers keep text readable for large configs", () => {
  assert.match(css, /--diff-text:\s*#baf7ba/);
  assert.match(css, /\.diff-connector-overlay\s*\{[\s\S]*z-index:\s*8/);
  assert.match(css, /\.editor-grid\.diff-connectors-active \.ncw-editor-card\s*\{[\s\S]*z-index:\s*3/);
  assert.match(css, /\.diff-object-flow-glow,[\s\S]*\.diff-object-link-glow\s*\{[\s\S]*display:\s*none !important/);
  assert.match(css, /\.line-mapping-shine\s*\{[\s\S]*display:\s*none !important/);
});

test("field highlights use token styling without heavy glow", () => {
  assert.match(css, /\.diff-token-match,[\s\S]*\.semantic-diff-line-field\s*\{[\s\S]*--diff-token-bg|\.diff-token-match,[\s\S]*\.semantic-diff-line-field\s*\{[\s\S]*background:\s*var\(--diff-token-bg\)/);
  assert.match(css, /\.diff-token-match\[data-token-match="local"\]\s*\{[\s\S]*background:\s*transparent !important/);
  assert.match(css, /\.diff-token-match\[data-token-match="local"\]\s*\{[\s\S]*border-style:\s*dashed !important/);
});
