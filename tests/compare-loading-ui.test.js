import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function readGlobalStyles() {
  const entry = fs.readFileSync("src/styles/global.css", "utf8");
  return entry.replace(/^@import "\.\/(.+)";$/gm, (_, file) =>
    fs.readFileSync(`src/styles/${file}`, "utf8")
  );
}

test("compare loading indicator paints before synchronous compare work", () => {
  const panel = fs.readFileSync("src/components/ConfigInputPanel.jsx", "utf8");
  const selectors = fs.readFileSync("src/core/legacySelectors.js", "utf8");
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const css = readGlobalStyles();

  assert.match(panel, /id="compareLoadingIndicator"/);
  assert.match(selectors, /compareLoadingIndicator:\s*doc\.querySelector\("#compareLoadingIndicator"\)/);
  assert.match(legacy, /async function runCompare/);
  assert.match(legacy, /setCompareLoading\(true\)[\s\S]*await waitForCompareLoadingPaint\(\)/);
  assert.match(legacy, /function renderDiffAsync/);
  assert.match(legacy, /insertAdjacentHTML\("beforeend"/);
  assert.match(legacy, /finally\s*\{[\s\S]*setCompareLoading\(false\)/);
  assert.match(css, /\.compare-loading-spinner\s*\{/);
  assert.match(css, /@keyframes compare-loading-spin/);
});
