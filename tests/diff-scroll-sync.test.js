import test from "node:test";
import assert from "node:assert/strict";

import { syncPairedPaneScroll } from "../src/core/diffScrollSync.js";

function pane({ top = 0, left = 0, maxLeft = Infinity } = {}) {
  let scrollTop = top;
  let scrollLeft = left;
  const writes = [];
  return {
    writes,
    get scrollTop() {
      return scrollTop;
    },
    set scrollTop(value) {
      writes.push(["top", value]);
      scrollTop = value;
    },
    get scrollLeft() {
      return scrollLeft;
    },
    set scrollLeft(value) {
      writes.push(["left", value]);
      scrollLeft = Math.max(0, Math.min(maxLeft, value));
    },
  };
}

test("vertical diff scroll keeps existing horizontal pane position", () => {
  const source = pane({ top: 200, left: 640 });
  const target = pane({ top: 0, left: 0, maxLeft: 0 });

  const result = syncPairedPaneScroll({
    sourcePane: source,
    targetPane: target,
    lastSource: { top: 0, left: 640 },
    lastTarget: { top: 0, left: 0 },
  });

  assert.equal(result.verticalChanged, true);
  assert.equal(result.horizontalChanged, false);
  assert.deepEqual(target.writes, [["top", 200]]);
  assert.equal(result.source.left, 640);
});

test("clamped target horizontal scroll does not bounce back into source", () => {
  const rightPane = pane({ top: 0, left: 640 });
  const leftPane = pane({ top: 0, left: 0, maxLeft: 0 });

  const first = syncPairedPaneScroll({
    sourcePane: rightPane,
    targetPane: leftPane,
    lastSource: { top: 0, left: 0 },
    lastTarget: { top: 0, left: 0 },
  });
  assert.equal(first.horizontalChanged, true);
  assert.equal(first.target.left, 0);

  const second = syncPairedPaneScroll({
    sourcePane: leftPane,
    targetPane: rightPane,
    lastSource: first.target,
    lastTarget: first.source,
  });
  assert.equal(second.changed, false);
  assert.equal(rightPane.scrollLeft, 640);
});
