import { useState, useRef } from 'react';
import './ContentBadge.css';

export interface ContentBadgeProps {
  contents: any[];
  onAdd: () => void;
  onRemove: (item: any) => void;
}

const getItemName = (item: any): string =>
  item?.name ?? item?.title ?? item?.displayName ?? item?.id ?? 'Untitled';

export const ContentBadge = ({ contents, onAdd, onRemove }: ContentBadgeProps) => {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  if (contents.length === 0) {
    return (
      <button
        type="button"
        className="rcl-mind-map__icon-btn rcl-content-badge__btn-add"
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        title="Add content"
      >
        + Add
      </button>
    );
  }

  return (
    <div
      className="rcl-content-badge"
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="rcl-mind-map__icon-btn rcl-content-badge__btn-count"
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        title="Click to select content"
      >
        {contents.length} selected
      </button>

      {open && (
        <div className="rcl-content-badge__dropdown nodrag nopan nowheel">
          <div className="rcl-content-badge__dropdown-header">Selected content</div>
          <ul className="rcl-content-badge__list">
            {contents.map((item, i) => (
              <li key={i} className="rcl-content-badge__item">
                <span className="rcl-content-badge__item-name" title={getItemName(item)}>
                  {getItemName(item)}
                </span>
                <button
                  type="button"
                  className="rcl-content-badge__item-remove"
                  onClick={(e) => { e.stopPropagation(); onRemove(item); }}
                  title="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="rcl-content-badge__add-more"
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
          >
            + Add / replace content
          </button>
        </div>
      )}
    </div>
  );
};
