# ai-mindmap-generator-sample

A minimal, reusable React component library built with **TypeScript** and **Rollup**.

Ships two components that share the same hierarchical data shape and can be
driven by a single piece of state:

- **`MindMap`** — graph/mind-map visualization (powered by `@xyflow/react`)
  with zoom in / zoom out, pan, draggable nodes, and add / delete / edit.
- **`MarkdownTree`** — hierarchical markdown-node tree with add / delete /
  edit and drag-and-drop reordering + re-parenting (powered by `@dnd-kit`).

Both components accept the same `MarkdownTreeNode[]` shape via `value` /
`onChange`, so they stay in sync when wired to a shared state.

---

## Folder structure

```
ai-mindmap-generator-sample/
├── src/
│   ├── index.ts                       # Public entry — re-exports all components
│   ├── global.d.ts                    # CSS module declarations
│   └── components/
│       ├── MindMap/
│       │   ├── MindMap.tsx            # ReactFlowProvider + canvas
│       │   ├── MindMapNode.tsx        # Custom node (markdown + actions)
│       │   ├── layout.ts              # tree → positions + edges
│       │   ├── MindMap.css
│       │   ├── types.ts
│       │   └── index.ts
│       └── MarkdownTree/
│           ├── MarkdownTree.tsx       # DndContext + SortableContext + tree rebuild
│           ├── SortableTreeItem.tsx   # Each row, with drag handle
│           ├── utils.ts               # flatten / build / projection helpers
│           ├── MarkdownTree.css
│           ├── types.ts
│           └── index.ts
├── example/                           # Vite playground (dev only)
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   └── tsconfig.json
├── rollup.config.mjs                  # Library build config (ESM + CJS + d.ts)
├── tsconfig.json
├── vite.config.ts                     # Dev playground config
└── package.json
```

## Getting started

```bash
npm install
npm run dev        # starts the Vite playground at http://localhost:5173
npm run build      # builds dist/ (ESM + CJS + d.ts + styles.css)
npm run typecheck  # tsc --noEmit
```

## Using the library in another repo

After `npm run build`, the library is publishable to a registry, or you can
install it from a local path / tarball.

```tsx
import { useState } from 'react';
import {
  MindMap,
  MarkdownTree,
  type MarkdownTreeNodeData,
} from 'ai-mindmap-generator-sample';
import 'ai-mindmap-generator-sample/styles.css';

const initial: MarkdownTreeNodeData[] = [
  { id: '1', content: '# Root', children: [
    { id: '2', content: 'Child A' },
    { id: '3', content: 'Child B' },
  ]},
];

export default function App() {
  const [tree, setTree] = useState(initial);
  return (
    <>
      <MindMap value={tree} onChange={setTree} height={500} />
      <MarkdownTree value={tree} onChange={setTree} />
    </>
  );
}
```

Both components are **controlled** when you pass `value` + `onChange`. Lifting
the tree into a parent makes them share a single source of truth — edits in
either view immediately reflect in the other.

> **Note:** Import the stylesheet once at your app's entry point. Library
> classes are prefixed with `rcl-`.

## Component APIs

### Shared data shape

```ts
interface MarkdownTreeNode {
  id: string;
  content: string;          // markdown
  children?: MarkdownTreeNode[];
}
```

### `MindMap`

| Prop             | Type                                  | Default | Description                                   |
| ---------------- | ------------------------------------- | ------- | --------------------------------------------- |
| `value`          | `MarkdownTreeNode[]`                  | —       | Controlled tree value.                        |
| `defaultValue`   | `MarkdownTreeNode[]`                  | `[]`    | Initial tree (uncontrolled).                  |
| `onChange`       | `(next: MarkdownTreeNode[]) => void`  | —       | Called on add / delete / edit.                |
| `renderMarkdown` | `boolean`                             | `true`  | Render node content as markdown.              |
| `editable`       | `boolean`                             | `true`  | Allow inline content editing.                 |
| `height`         | `number \| string`                    | `480`   | Canvas height.                                |
| `className`      | `string`                              | —       | Extra class for the wrapper.                  |

**Interactions**
- Zoom in / out / fit-view via the `<Controls />` panel (bottom-left) or
  mouse wheel / pinch.
- Pan by dragging the canvas background.
- Each node has `+ Child`, `Edit`, and `Delete` buttons.
- **Drag a node onto another node to re-parent it** — the dragged subtree
  becomes a child of the drop target. The target highlights green while you
  hover. Works at arbitrary depth, prevents cycles (you cannot drop a node
  into one of its own descendants), and updates the shared tree so the
  `MarkdownTree` view reflects the change immediately.
- Drop in empty canvas space to keep a free-form position override
  (remembered until you click **Reset layout**).

### `MarkdownTree`

| Prop             | Type                                  | Default | Description                              |
| ---------------- | ------------------------------------- | ------- | ---------------------------------------- |
| `value`          | `MarkdownTreeNode[]`                  | —       | Controlled tree value.                   |
| `defaultValue`   | `MarkdownTreeNode[]`                  | `[]`    | Initial tree (uncontrolled).             |
| `onChange`       | `(next: MarkdownTreeNode[]) => void`  | —       | Called on add / delete / edit / drag.    |
| `renderMarkdown` | `boolean`                             | `true`  | Render markdown via `react-markdown`.    |
| `editable`       | `boolean`                             | `true`  | Allow inline content editing.            |
| `className`      | `string`                              | —       | Extra class for the wrapper.             |

**Drag-and-drop behavior**
- Grab the `⋮⋮` handle on any node to drag.
- Drop **between** two nodes to reorder among siblings.
- Drop **on/inside** a node (drag right horizontally while hovering) to make
  the dragged node a child of that node. The drop depth is determined by the
  horizontal pointer offset (~24px per level).
- Dragging a node moves the entire subtree (descendants travel with it).
- Cycles are prevented — you cannot drop a node into its own descendants.
- Every change fires `onChange(newTree)`.

## Consumer requirements

Peer dependencies (consumer must provide):

- `react` >= 17
- `react-dom` >= 17

## Build outputs

| File                  | Format |
| --------------------- | ------ |
| `dist/index.esm.js`   | ESM    |
| `dist/index.cjs.js`   | CJS    |
| `dist/index.d.ts`     | Types  |
| `dist/styles.css`     | CSS    |

## Extending

- Add a new component under `src/components/MyComponent/` with `MyComponent.tsx`,
  `MyComponent.css`, and `index.ts`.
- Re-export it from `src/index.ts`.
- Run `npm run build`.
