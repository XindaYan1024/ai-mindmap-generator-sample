import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './ContextMenu.css';

export interface ContextMenuItem {
  /** Text shown for the row. */
  label: string;
  /** Invoked when the item is chosen (the menu closes right after). */
  onSelect: () => void;
  /** Render in a destructive (red) style — e.g. Delete. */
  danger?: boolean;
  /** Greyed-out, non-interactive. */
  disabled?: boolean;
}

interface ContextMenuProps {
  /** Requested x within the positioned container (clamped to avoid overflow). */
  x: number;
  /** Requested y within the positioned container (clamped to avoid overflow). */
  y: number;
  items: ContextMenuItem[];
  /** Called on outside click, Escape, or after an item is selected. */
  onClose: () => void;
}

/**
 * Minimal, self-positioning context menu. Absolutely positioned within its
 * nearest positioned ancestor; clamps itself so it never spills outside that
 * container. Closes on outside click, Escape, or item selection.
 */
export const ContextMenu = ({ x, y, items, onClose }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x, y });

  // Clamp against the offset parent (the canvas) so the menu stays on screen.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.offsetParent as HTMLElement | null;
    const pw = parent?.clientWidth ?? window.innerWidth;
    const ph = parent?.clientHeight ?? window.innerHeight;
    const { width, height } = el.getBoundingClientRect();
    const margin = 8;
    const nx = Math.min(x, Math.max(margin, pw - width - margin));
    const ny = Math.min(y, Math.max(margin, ph - height - margin));
    setPos({ x: nx, y: ny });
  }, [x, y]);

  // Dismiss on outside click or Escape. Listen in the CAPTURE phase: ReactFlow's
  // canvas (d3-drag/zoom) calls stopPropagation on mousedown, so a bubbling
  // listener would never fire for clicks on the pane/nodes. Capture runs first.
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onDocMouseDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onDocMouseDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="rcl-context-menu"
      style={{ left: pos.x, top: pos.y }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          role="menuitem"
          className={[
            'rcl-context-menu__item',
            item.danger ? 'rcl-context-menu__item--danger' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={item.disabled}
          onClick={() => {
            item.onSelect();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
