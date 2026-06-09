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
  /** External map of nodeId → selected content items, rendered on each node. */
  nodeContents?: Record<string, any[]>;
  /** Called when the component wants to trigger content selection for a specific node. */
  onAddContent?: (nodeId: string) => void;
  /** Called when the user removes a single content item from a node. */
  onRemoveContent?: (nodeId: string, item: any) => void;
}

/** Position assigned by the auto-layout. */
export interface LayoutPosition {
  x: number;
  y: number;
  /** Which side of the root this node sits on. Undefined means single-direction layout. */
  side?: 'left' | 'right' | 'root';
}
