import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLineMappingPathD,
  buildLineMappingRailPath,
  buildSlimeLineShinePath,
  connectorLabelText,
  objectConnectorState,
  objectConnectorTypeClass,
  renderDiffConnectorLayers,
  renderDiffObjectBackgroundLayers,
} from "../src/core/diffRenderer.js";

test("object connector state preserves existing status mapping", () => {
  assert.equal(
    objectConnectorState(
      { status: "matched", state: "equal" },
      { status: "matched", state: "equal" }
    ),
    "matched"
  );
  assert.equal(objectConnectorState({ reason: "manual" }, {}), "manual");
  assert.equal(objectConnectorState({ status: "partial" }, {}), "partial");
  assert.equal(objectConnectorState({ status: "ambiguous" }, {}), "candidate");
  assert.equal(objectConnectorState({ status: "old-only" }, {}), "unmatched");
  assert.equal(objectConnectorState({ state: "equal", score: 88 }, { state: "equal" }), "changed");
});

test("object connector labels and classes are stable", () => {
  assert.equal(objectConnectorTypeClass({ type: "static route" }), "type-static-route");
  assert.equal(connectorLabelText({ type: "bgp", identity: "192.0.2.1" }), "bgp 192.0.2.1");
  assert.equal(connectorLabelText({ type: "bgp", identity: "12345678901234567890" }), "bgp 1234567890123...");
});

test("connector layer renderer keeps svg groups and defs", () => {
  const html = renderDiffConnectorLayers({
    objectPaths: ["<path data-kind=\"object\" />", ""],
    fieldPaths: ["<path data-kind=\"field\" />"],
    debugPaths: ["<text>debug</text>"],
  });

  assert.match(html, /<defs>/);
  assert.match(html, /class="object-mapping-overlay"/);
  assert.match(html, /class="semantic-line-overlay"/);
  assert.match(html, /class="mapping-debug-overlay"/);
  assert.match(html, /data-kind="object"/);
  assert.match(html, /data-kind="field"/);
  assert.match(html, /<text>debug<\/text>/);
});

test("object mapping background renderer keeps background group separate from connector strokes", () => {
  const html = renderDiffObjectBackgroundLayers({
    objectBackgroundPaths: ["<path class=\"diff-object-region\" />"],
  });

  assert.match(html, /class="object-mapping-background-overlay"/);
  assert.match(html, /data-overlay-layer="object-background"/);
  assert.match(html, /diff-object-region/);
  assert.doesNotMatch(html, /semantic-line-overlay/);
});

test("line connector renderer helpers preserve path variants", () => {
  const straight = buildLineMappingPathD({ x1: 0, y1: 10, x2: 100, y2: 30, style: "straight", bend: 0 });
  const chained = buildLineMappingPathD({ x1: 0, y1: 10, x2: 100, y2: 30, style: "chain", bend: 0.65 });
  const slime = buildLineMappingPathD({ x1: 0, y1: 10, x2: 100, y2: 30, style: "slime", bend: 0.65 });
  const rail = buildLineMappingRailPath({ relationKey: "bgp:state", relationState: "matched", fieldClass: "field-state", path: straight });
  const shine = buildSlimeLineShinePath({ relationKey: "bgp:state", relationState: "matched", fieldClass: "field-state", path: slime, x1: 0, y1: 10, x2: 100, y2: 30 });

  assert.equal(straight, "M 0 10 L 100 30");
  assert.match(chained, /^M 0 10 L /);
  assert.match(slime, /^M 0 10 L /);
  assert.match(rail, /class="line-mapping-rail matched field-state/);
  assert.match(shine, /lineMappingGloss-bgp-state/);
});
