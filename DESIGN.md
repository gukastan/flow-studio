# Flow Studio design system

## 0. Research log
- User reference: [Archify DESIGN.md at commit 25cf37080fc8b1dbe758a4efc3935b55f3327083](https://github.com/tt-a1i/archify/blob/25cf37080fc8b1dbe758a4efc3935b55f3327083/DESIGN.md). Independently implemented; no Archify or ComfyUI application code copied.
- Interaction reference: [ComfyUI frontend](https://github.com/Comfy-Org/ComfyUI_frontend)'s movable cards, explicit connections and collapsible subgraphs.
- Attribution and third-party license information: [CREDITS.md](CREDITS.md).
- Execution references: frontend design architecture, layout mechanics, React tooling and TypeScript strictness.
- Imagery omitted: the editable graph itself is the main visual.
- Context-menu reference: user's ComfyUI screenshot (compact vertical actions, dividers, right-arrow categories); preserve Flow Studio's existing palette and 36px/44px hit targets. beui.dev context-menu source consulted for focus/keyboard navigation and viewport clamping mechanisms; no source vendored.
- Subgraph interaction reference: https://docs.comfy.org/ko/interface/features/subgraph — dedicated inner editing, breadcrumbs, exposed input/output slots, nested navigation and unpacking. Adapt these to a flowchart editor; runtime parameters and execution are outside this product.

## 1. Atmosphere & identity
A precise graph workbench. Midnight canvas, small technical annotations, generous node spacing and bright semantic colors. Collapsing a group into one compact card is the signature interaction. Korean is the primary interface language.

## 2. Color
Dark canvas #020617, panel #0F172A, elevated #172238, neutral border #263247.
Main text #F8FAFC, secondary #94A3B8, faint #64748B.
Dark connection stroke #CBD5E1, arrowhead #F8FAFC; light connection stroke #64748B, arrowhead #334155. Selected strokes and arrowheads both use the theme accent.
Semantic palette: cyan #22D3EE, green #34D399, violet #A78BFA, amber #FBBF24, rose #FB7185, orange #FB9238, slate #94A3B8.
Interactive cyan hover #67E8F9; accessible light-theme cyan #0E7490 and destructive ink #BE123C.
Light canvas #F1F5F9, panel #FFFFFF, elevated #E8EEF5, border #CBD5E1, text #0F172A, secondary #475569.
Selection uses tonal fill and neutral bright border. Node colors are authored content; their color appears in glyphs, connections and softly tinted card surfaces. Custom user colors are data, not design tokens.

## 3. Typography
Korean/system body: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif.
Technical identifiers: ui-monospace, SFMono-Regular, Menlo, monospace.
Sizes: 11 metadata, 12 caption, 13 controls, 14 body, 16 card label, 20 dialog title, 24 brand. Line-height 1.5.

## 4. Spacing & layout
Base 4px; steps 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64.
Full 100dvh shell. Header 64px, footer 32px. Left outline 240px, inspector 272px, flexible canvas. Panels own vertical scroll; canvas owns pan/zoom.
Below 1100px outline becomes a drawer. Below 700px inspector also becomes a drawer; toolbar wraps into a scrollable row. Graph remains a two-dimensional workspace.
Node width 224px, height 88px. Group padding 32px, title allowance 48px.

## 5. Components
- Layout menu: existing ContextMenu opened from the toolbar's "정렬" button and the node context menu's "정렬" category. Horizontal/vertical alignment centers the cross-axis only, preserving each node's position and spacing along the row/column. Separate horizontal/vertical spacing actions keep the first and last nodes fixed and equalize the gaps between visible card edges, preserving each perpendicular coordinate. Alignment requires two sibling roots; spacing requires three. Groups move with their descendants. The toolbar also retains two canvas actions for LR/TB automatic layout in the current scope. Reuse existing submenu, focus and disabled states.
- Save dialog: existing native Modal, 560px maximum width. Two full-width format buttons, 16px padding, 12px gap, 16px heading and 12px helper. JSON preserves the project; PNG shows the current scope with the full project embedded. Progress disables actions; errors remain in the dialog. No new colors or motion.
- File drop: the canvas accepts one JSON or Flow Studio PNG, using the same validation and undoable replacement as the file picker. A centered elevated overlay names the accepted formats and replacement behavior. File drag events must not interfere with node drags.
- ToolButton: 36px desktop / 44px touch minimum, icon with visible text or accessible label. Neutral rest, tonal hover, pressed transform, visible focus, disabled opacity.
- Panel: neutral separator, fixed header, independently scrollable body. Stack layout.
- Field: visible label, 40px input, helper/error below; focus outline. Native select, text and color controls.
- NodeCard: category/id annotation, editable title, four connection points with direction determined per connection. Selected check and neutral outline. Click title to rename; drag its metadata/header area to move.
- GroupFrame: tinted frame, header drag handle, count and fold button. Expanded interior transparent; collapsed card exposes aggregate connections. Nested groups supported.
- Expanded group frames pass pointer events through the body; their header and handles sit above connections, so crossing lines cannot intercept the group's context menu.
- Modal: native dialog, focus containment, Escape/cancel, labeled heading, inline error, progress state on import.
- Palette: accessible named color buttons, selected check, native custom color input.
- Notice: polite live region for successful file actions; assertive errors. No auto-dismiss of important errors.
- OutlineRow: name, color indicator, optional fold button; keyboard selection and multi-select via checkboxes.
- ContextMenu: fixed 244px panel with 8px viewport clearance, 4px padding, neutral hairline, panel surface and dialog shadow. 13px left-aligned actions, 12px muted target heading, 36px rows (44px on touch), separators between editing/grouping/deletion. Color and shape categories open a second menu view with a back action. Active/focus uses elevated surface and a focus ring; destructive action uses the existing rose/destructive ink. The same component handles node, multiselection, group, edge and blank-canvas menus.

## 6. Motion & interaction
140ms opacity/transform controls. Node movement tracks pointer immediately. Group projection changes immediately to preserve direct manipulation. Fit-view uses 200ms camera motion, 0ms under reduced motion.
Shift+click and selection rectangle select multiple cards; handles connect; drag canvas pans; wheel zooms. Undo/redo covers document edits. Group drag moves its entire contents. Sidebar checkboxes provide a non-drag multi-selection path.
Cmd+G toggles ordinary grouping; Control+G toggles subgraph conversion and unpacking. A selected subgraph is never unpacked by Cmd+G. Repeating either shortcut on the selected result dissolves its wrapper and selects its children; key-repeat is ignored. Converting a selection creates an explicit subgraph card with exposed slots; converting an existing group preserves its identity without wrapping it. The subgraph card retains a node shape, displays that shape in its header, and offers the same shape selector as ordinary nodes. The subgraph inspector keeps internal editing and unpacking actions, while input/output management remains in the context menu and inner boundary view. Right-click preserves an existing multiselection when its member is targeted; elsewhere it selects the target. Canvas movement uses Space/middle drag so right-click belongs to the menu.
Menus appear without spatial animation, retaining 140ms row feedback. Arrow keys and Home/End navigate; Enter/Space activate; Right/Left enter/leave categories; Escape dismisses and restores focus without clearing selection. Outside click, viewport changes and canvas movement dismiss. Shift+F10 and the toolbar selection-actions button provide keyboard/touch entry points.

## 7. Depth & surface
Mixed neutral hairlines and shadow: cards 0 8px 24px #00000026, dialog 0 24px 80px #00000066. Panel colors distinguish planes.
Radii 4px technical, 8px controls/cards, 16px dialog. No accent edge stripes.

## 8. Accessibility & limits
Visible keyboard focus, labeled controls, native dialogs, reduced motion, light/dark palettes. Node manipulation and connections are also available through inspector controls.
Mermaid import targets flowchart/graph diagrams. Other diagram types are rejected with a clear error. Mermaid source is not treated as HTML. File loading validates graph references and nesting before replacing the document.
Menu persona: a Korean-speaking visual editor who uses either mouse or keyboard. Menus never clip outside the viewport; long labels truncate and menu content scrolls on small screens. Inputs retain the native text-editing context menu. Existing project files remain compatible. No additional dependency or animation framework is required.

## Subgraph and clipboard interaction update
- Ordinary groups remain spatial frames with fold/unfold. A subgraph is explicitly marked in saved data and stays a compact card in its parent view. Its edit button or header double-click opens the inner canvas.
- A breadcrumb bar stays at the top of the canvas. It owns horizontal overflow; the canvas below still owns pan/zoom. Escape leaves one subgraph level after menus and text editing have handled their own Escape. Parent camera positions are restored on return.
- Input/output cards initially sit 320px beyond either side of the inner node bounds. Both cards and subgraph wrappers can be dragged from their title or empty body. Manual boundary positions are stored as optional `boundaryOffsets` relative to their owning subgraph, so moving/copying the wrapper carries the layout and moving inner nodes preserves manual placement. Unpositioned boundaries continue to follow the inner bounds. The layout survives undo/redo, navigation, JSON/PNG round trips and duplication. Boundary cards are not selectable document nodes, and each has one read-only connection point. Each displayed wire projects one real external connection, retaining its ID, label and appearance. Adding/deleting an external wire immediately changes its inner segment. Boundary names come from connected external nodes and are blank when disconnected. The inspector retains exposed port names and internal targets in saved data.
- The subgraph and boundary cards use grab/grabbing cursors for movement. Connection handles, the enter/settings button and exposed controls keep their own actions and never initiate movement.
- Each nested subgraph is independently enterable. Unpacking removes its wrapper, restores children to the parent scope and retains internal/boundary wires.
- Duplicate clones the selected roots, all descendants and internal wires with fresh IDs and a small position offset. External wires are not duplicated. Copy/paste follows the same data contract, supports cross-view placement, and preserves nested subgraphs and exposed slots.
- Clipboard text is validated as a Flow Studio selection before use. Native text editing keeps browser copy/paste. Clipboard permission failures retain an in-app copy and show a clear notice.
- New controls reuse existing panel, field, button, palette and focus tokens. Inspector controls retain 36px/44px hit targets. No new colors or motion. Long path labels truncate; current location remains explicit.
- Accessibility review targets: mouse user can enter/exit without losing place; keyboard user can copy/paste and navigate via named buttons; small-screen user can reach slot settings in the existing inspector drawer.
- Clicking or dragging a wire selects that wire immediately and clears stale node selection. Shift selection can include multiple wires; Backspace/Delete removes selected real wires, including their projected inner segments, and undo restores them.
- Repeated node additions search for nearby unoccupied card rectangles with a 24px gap, including visible subgraph cards and boundary displays. New nodes remain visible after placement.
- Pressing a connection handle begins the wire immediately. While dragging, the preview uses the existing accent ink at 2.5px; dropping on another connection point commits a wire from the drag origin (output) to the destination (input), regardless of side. Measured node dimensions survive selection changes so handle positions remain available throughout the gesture.
- All wires use cubic Bézier splines, including the drag preview and projected subgraph connections. Return and parallel lanes use two tangent-continuous cubic segments with labels at their shared midpoint. Preserve existing stroke, arrow, dashed, selection and hit-area tokens.
- Same-side connections travel through an outside lane at least 48px beyond the measured card bounds across their span, with 36px between duplicate lanes. Corners use smooth cubic joins of up to 24px radius. The last approach follows the selected handle direction, and the label sits on the outside lane. If an endpoint's outward leg is blocked by another card, take a side detour. Expanded group frames do not obstruct their own contents. Default stroke is 2.2px, selected stroke 3px; closed arrow markers use a 20×20 marker viewport and brighter theme ink so direction remains visible beside the connection dot.
- Every side of a node or ordinary group can start or receive a connection; side and flow direction are independent, and a point can carry incoming and outgoing wires simultaneously. A subgraph card has one shared point on each of its four sides and does not list its internal nodes. Multiple real wires between the same visible outside node and subgraph share one visible edge and its shortest default spline lane, avoiding duplicate outer loops. Deleting or editing that edge applies to all underlying wires; opening the subgraph exposes each original wire for separate editing. A new wire on the shared point connects to a representative exposed internal node, or an entry/exit leaf if no port exists. Inner boundary displays stay read-only with one point on the input and output cards respectively. Persist the chosen side per wire through save/load, duplication and subgraph projection; older documents default to right-to-left connections. Splines leave and enter perpendicular to the selected sides. Reuse the existing 12px handle glyph and colors; neutral direction labels avoid falsely marking a side as always input/output.
- Converting to a subgraph exposes only actual connections crossing the selection boundary. A node may feed both an internal node and an external node through the same output. Never infer exposed ports from entry/exit nodes or array order. Explicitly exposed ports remain available for later external connections.
- Exposed settings bind to an internal node's existing name, color or node type. Users add or remove these bindings in the input/output inspector and edit their live values on the outer card. Controls reuse native fields, 36px height and existing focus tokens, with a 44px row. Updating a binding changes the original node, participates in undo/redo and persists through file and clipboard operations. There are no new execution or image-upload semantics.
