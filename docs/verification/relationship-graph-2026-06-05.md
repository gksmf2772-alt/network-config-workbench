# Relationship Graph Verification - 2026-06-05

## Scope

- Add a dedicated graph tab.
- Show comparison relationships separately from config-internal relationships.
- Add internal graph edges for:
  - port -> lag
  - lag/interface/service/sap
  - interface -> static-route
  - static-route -> bgp
  - filter/qos/policy references
- Add graph toggles for comparison/internal edges and an expand/collapse control.

## Automated Verification

- `node --check src/core/summaryAnalytics.js`: pass.
- `node --check src/core/legacyCore.js`: pass.
- `node --test tests/summary-analytics.test.js`: pass, 28 tests.
- `node --test tests/summary-renderer.test.js`: pass, 10 tests.
- `npm.cmd test`: pass, 231 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains.

## Browser Verification

Chrome CDP was used against the local Vite dev server on `http://localhost:5173`.

Scenario:
1. Input a small Classic -> MD-CLI config pair containing port, lag, service interface, SAP, static route, BGP, filter, QoS, and policy references.
2. Run compare.
3. Open the new Graph tab.
4. Click expand.

Observed:
- Graph tab active: yes.
- Graph root rendered: yes.
- Graph nodes: 20.
- Graph edges: 20.
- Internal edges: 16.
- Comparison edges: 4.
- Comparison toggle rendered: yes.
- Internal toggle rendered: yes.
- Expanded state applied: yes.

Screenshot:
- `docs/verification/screenshots/2026-06-05/relationship-graph/after-graph-tab.png`

## Notes

- The graph layout now groups each side into old/new config lanes and topology columns.
- Virtual nodes are created for referenced filter/qos/policy/service targets when the target definition is not present in the displayed graph slice.
- Static route to BGP prefix matching is intentionally conservative and ignores broad route prefixes shorter than `/24` to avoid connecting default routes to every BGP neighbor.

## Follow-up Verification: Port-heavy Full Config Sampling

Issue:
- Full config comparison could show only port nodes because the previous graph slice took the first plan items in order.
- Port-heavy configs could also make the graph too tall.

Change:
- The graph now samples plan items by object type instead of taking the first N items.
- The graph applies a per-type cap of 12 plan items, even when the total plan item count is below the global graph cap.
- A limit note shows the total active items, selected representative items, and hidden counts by type.

Verification scenario:
1. Input a port-heavy Classic -> MD-CLI config with 40 ports plus LAG, service interface, SAP, static route, BGP, filter, and policy references.
2. Run compare.
3. Open Graph tab.

Observed:
- Graph nodes: 38.
- Graph edges: 27.
- Internal edges: 12.
- Comparison edges: 15.
- Node type distribution included port, lag, interface, sap, static-route, bgp, filter, policy, and service.
- The limit note showed: `전체 45개 중 타입별 대표 17개 항목을 표시합니다. 숨김: port 28`.

Screenshot:
- `docs/verification/screenshots/2026-06-05/relationship-graph/after-graph-balanced-sampling.png`

## Follow-up Verification: Progressive Disclosure and Free Layout

Issue:
- The default graph still exposed too many nodes at once.
- The topology flow layout was useful for tracing object types, but it felt restricted to row/column lanes.
- The alternative layout had to remain readable and avoid node text overlap.

Change:
- The default graph is now compact.
- Each side/type group displays up to 3 representative nodes and a `+N` cluster node for hidden nodes.
- `상세 보기` or clicking a cluster node opens the full graph.
- Added `흐름` and `자유` layout controls.
- The free layout uses a wider deterministic scatter canvas with collision checks.

Verification scenario:
1. Input a port-heavy MD-CLI config pair with ports, LAGs, service interfaces, SAPs, static routes, BGP peers, filter, QoS, and policy references.
2. Run compare.
3. Open Graph tab.
4. Check the default compact flow view.
5. Switch to full detail.
6. Switch to free layout.

Observed:
- Compact flow: 35 nodes, 53 edges, 8 cluster nodes, 0 node overlaps.
- Full flow: 69 nodes, 110 edges, 0 cluster nodes, 0 node overlaps.
- Full free layout: 69 nodes, 110 edges, 0 cluster nodes, 0 node overlaps.
- Detail and layout buttons rendered and changed graph state correctly.

Screenshots:
- `docs/verification/screenshots/2026-06-05/relationship-graph/after-graph-compact-default.png`
- `docs/verification/screenshots/2026-06-05/relationship-graph/after-graph-free-layout.png`

## Follow-up Verification: React Flow Migration

Issue:
- The previous graph renderer built a direct SVG string in `legacyCore.js`.
- The requested direction was to move the graph surface to React Flow with dagre layout while keeping existing graph analytics data stable.

Change:
- Installed `@xyflow/react` and `dagre`.
- Added `src/utils/graphAdapter.js` to convert existing analytics nodes/edges into React Flow nodes/edges.
- Added validation for duplicate node ids, duplicate edge ids, and missing edge endpoints.
- Added `src/utils/dagreLayout.js` for dagre flow layout and React Flow-compatible scatter layout.
- Added custom graph components under `src/components/graph/`.
- `legacyCore.js` now renders a React Flow mount root and passes graph snapshots plus toolbar controls to the React bridge.

Automated verification:
- `node --check src/core/legacyCore.js`: pass.
- `node --test tests/graph-adapter.test.js tests/summary-renderer.test.js`: pass, 13 tests.
- `npm.cmd test`: pass, 235 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains.

Browser verification scenario:
1. Open the local Vite dev server at `http://localhost:5173`.
2. Input a Classic -> MD-CLI config pair containing port, LAG, interface, static route, BGP, filter, QoS, and policy-like references.
3. Run compare.
4. Open the Graph tab.
5. Verify default React Flow render, node focus interaction, pane reset, layout toggles, and label toggle.

Observed:
- React Flow nodes: 34.
- Initial visible edges: 0, because edges are hidden until node focus.
- MiniMap rendered: yes.
- Controls rendered: yes.
- Node click: 2 connected edges shown and 14 unrelated nodes dimmed.
- Pane click: edges reset to 0 and dimmed nodes reset to 0.
- Node statuses present: `unchanged`, `modified`, `added`.
- Free layout toggle: active and rendered 34 nodes.
- Flow layout toggle: active and restored dagre node transform.
- Label toggle: object label hidden while node type/score stayed visible.

Screenshot:
- `docs/verification/screenshots/2026-06-05/relationship-graph-react-flow/after-react-flow-graph.png`

## Follow-up Verification: React Flow Layout Emergency Fix

Issue:
- After React Flow migration, graph nodes could appear without stable column lanes, clustered toward one side or visually stacked.
- The likely cause was layouted positions not being guaranteed before `useNodesState`, combined with insufficient parent height guarantees.

Requested fix scope:
- Apply fixes 1, 2, 3, and 4 in order.
- Report the browser console layout result after the fix.
- Fix 5 rank hints were not applied in this pass because the explicit user request named fixes 1-4 only.

Change:
- `applyDagreLayout` now uses explicit LR dagre layout with `ranksep: 100`, `nodesep: 24`, `marginx: 40`, and `marginy: 40`.
- Orphan edges are filtered before dagre layout.
- Missing dagre positions keep the existing node position instead of falling back to `(0,0)`.
- `RelationshipGraph.jsx` computes `layoutedNodes` before `useNodesState`.
- React Flow now has `fitViewOptions`, `minZoom={0.05}`, `maxZoom={2}`, and `defaultEdgeOptions={{ hidden: true }}`.
- React Flow now has an internal full-height wrapper, and `.report-graph-flow-root` has explicit `height: calc(100vh - 160px)` plus `min-height: 600px`.

Automated verification:
- `node --check src/utils/dagreLayout.js`: pass.
- `node --check src/components/graph/RelationshipGraph.jsx`: not applicable, Node cannot directly check `.jsx` and returns `ERR_UNKNOWN_FILE_EXTENSION`.
- `node --test tests/graph-adapter.test.js tests/summary-renderer.test.js`: pass, 13 tests.
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains.
- `npm.cmd test`: pass, 235 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.

Browser console verification:
- CDP was used against `http://localhost:5173`.
- The console expression `console.log('layouted:', rows)` was executed after opening the Graph tab.
- Captured layout stats:
  - nodeCount: 34
  - distinctX: 3
  - distinctY: 15
  - minX/maxX: 40/520
  - minY/maxY: 40/570
  - allZero: false
  - graphRootHeight: 691
  - flowRootHeight: 800
  - fitViewButtonExists: true
  - minimapExists: true
- Sample console rows:
  - `old:port:2/1/1:0` port x=40 y=50
  - `new:port:2/1/1:0` port x=280 y=40
  - `old:lag:11:2` lag x=280 y=108
  - `new:lag:lag-A-6109:2` lag x=520 y=142
  - `old:interface:10.31.1.90/30:3` interface x=40 y=254
  - `new:static-route:0.0.0.0/0:4` static x=520 y=288

Screenshot:
- `docs/verification/screenshots/2026-06-05/relationship-graph-layout-fix/after-layout-fix.png`

## Follow-up Verification: Readable Large Graph Layout

Issue:
- The layout emergency fix confirmed non-zero dagre positions, but full detail graphs with many nodes were still not usable.
- React Flow fit the whole graph into the viewport, shrinking labels until they were unreadable.

Change:
- Added type-column metadata in `graphAdapter.js`.
- Large graphs now use a readable column layout instead of fitting every node into one zoomed-out dagre view.
- Large graph auto-fit is disabled; initial viewport starts at readable zoom.
- Minimum zoom is raised to `0.35`.
- The graph container no longer exposes a nested visible scrollbar; movement is handled by React Flow pan/zoom and MiniMap.

Automated verification:
- `node --check src/utils/dagreLayout.js`: pass.
- `node --test tests/graph-adapter.test.js tests/summary-renderer.test.js`: pass, 13 tests.
- `npm.cmd run build`: pass, existing Vite chunk-size warning remains.
- `npm.cmd test`: pass, 235 pass / 1 skip.
- `npm.cmd run guard:legacy-core`: pass.

Browser verification:
- CDP was used against `http://localhost:5173`.
- A synthetic detail graph with port, LAG, interface, static route, BGP, filter, and QoS nodes was opened in the dedicated Graph tab.
- Captured stats:
  - nodeCount: 115
  - distinctX: 8
  - distinctY: 20
  - minX/maxX: 48/1588
  - minY/maxY: 48/862
  - allZero: false
  - minNodeWidth: 97
  - medianNodeWidth: 97
  - fitViewButtonExists: true
  - minimapExists: true
- Sample rows:
  - `old:port:2/1/1:0` port x=48 y=48 width=97
  - `old:lag:11:12` lag x=268 y=48 width=97
  - interface nodes start at x=488
  - static route nodes start at x=928
  - BGP nodes start at x=1148
  - filter/QoS nodes start at x=1368

Screenshot:
- `docs/verification/screenshots/2026-06-05/relationship-graph-readable-fix/after-readable-large-graph.png`
