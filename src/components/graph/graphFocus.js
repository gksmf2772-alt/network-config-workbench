export function applyChainFocusToNodes(nodes = [], chainId = "") {
  if (!chainId) {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        dimmed: false,
        focusDistance: null,
        selectedChain: false,
      },
    }));
  }

  return nodes.map((node) => {
    const sameChain = node.data?.chainId === chainId;
    const neutral = node.data?.isColumnHeader === true;
    return {
      ...node,
      data: {
        ...node.data,
        dimmed: !sameChain && !neutral,
        focusDistance: sameChain && !node.data?.isRowBand ? 0 : null,
        selectedChain: sameChain,
      },
    };
  });
}

export function applyChainFocusToEdges(edges = [], chainId = "") {
  if (!chainId) {
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        focused: false,
        dimmed: false,
      },
    }));
  }

  return edges.map((edge) => {
    const sameChain = edge.data?.chainId === chainId;
    return {
      ...edge,
      data: {
        ...edge.data,
        focused: sameChain,
        dimmed: !sameChain,
      },
    };
  });
}
