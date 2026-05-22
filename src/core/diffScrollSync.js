export function syncPairedPaneScroll({
  sourcePane,
  targetPane,
  lastSource = {},
  lastTarget = {},
} = {}) {
  if (!sourcePane || !targetPane) {
    return {
      changed: false,
      verticalChanged: false,
      horizontalChanged: false,
      source: normalizeSnapshot(lastSource),
      target: normalizeSnapshot(lastTarget),
    };
  }

  const sourceTop = Number(sourcePane.scrollTop || 0);
  const sourceLeft = Number(sourcePane.scrollLeft || 0);
  const previousSource = normalizeSnapshot(lastSource);
  const verticalChanged = sourceTop !== previousSource.top;
  const horizontalChanged = sourceLeft !== previousSource.left;

  if (verticalChanged && targetPane.scrollTop !== sourceTop) {
    targetPane.scrollTop = sourceTop;
  }
  if (horizontalChanged && targetPane.scrollLeft !== sourceLeft) {
    targetPane.scrollLeft = sourceLeft;
  }

  return {
    changed: verticalChanged || horizontalChanged,
    verticalChanged,
    horizontalChanged,
    source: {
      top: sourceTop,
      left: sourceLeft,
    },
    target: {
      top: Number(targetPane.scrollTop || 0),
      left: Number(targetPane.scrollLeft || 0),
    },
  };
}

function normalizeSnapshot(snapshot = {}) {
  return {
    top: Number(snapshot.top || 0),
    left: Number(snapshot.left || 0),
  };
}
