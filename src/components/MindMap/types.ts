import type { MarkdownTreeNode } from '../MarkdownTree/types';

export interface MindMapProps {
  /** Controlled tree value (same shape as MarkdownTree). */
  value?: MarkdownTreeNode[];
  /** Initial tree when uncontrolled. */
  defaultValue?: MarkdownTreeNode[];
  /** Called whenever the tree changes (add / delete / edit). */
  onChange?: (next: MarkdownTreeNode[]) => void;
  /** Render markdown inside each node. Defaults to true. */
  renderMarkdown?: boolean;
  /** Allow inline editing inside nodes. Defaults to true. */
  editable?: boolean;
  /** Pixel height of the canvas. Defaults to 480. */
  height?: number | string;
  /** Extra class name for the wrapper. */
  className?: string;
}

/** Position assigned by the auto-layout. */
export interface LayoutPosition {
  x: number;
  y: number;
  /** Which side of the root this node sits on. Undefined means single-direction layout. */
  side?: 'left' | 'right' | 'root';
}
