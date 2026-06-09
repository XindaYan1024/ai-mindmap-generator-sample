import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MutableRefObject,
} from 'react';
import type { ChatMessage } from './types';
import './ChatInputPanel.css';

export type ChatInputPanelPlacement = 'center' | 'docked';

// Outward arrows → grow the panel to its full UI.
const MaximizeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
    <path
      d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Up + down chevrons → expand the history area to 2× its normal height.
const ExpandLargeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
    <path
      d="M4 5.5 7 2 10 5.5M4 8.5 7 12 10 8.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// A single "−" bar → collapse the panel to the input-only bar.
const MinimizeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
    <path
      d="M3 7h8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
    <path
      d="M8 13V3M8 3L4 7M8 3l4 4"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ThinkingIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5C17.8 10.3 18 8.8 18 7a6 6 0 0 0-12 0c0 1.8.2 3.3 1.5 4.5.8.8 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
);

const THINKING_STATUSES = ['Sifting', 'Processing', 'Analyzing', 'Generating'] as const;

/**
 * Presentation-only chat panel: floating input + plain-string history with a
 * Minimize/Maximize toggle. It owns NO chat logic — every piece of state and
 * every handler is supplied by `ChatDialog` and simply wired to the DOM here.
 * The only state it owns is its own UI mode (expanded vs. compact).
 */
export interface ChatInputPanelProps {
  /** Full message list. Only entries with text are shown; attachments ignored. */
  messages: ChatMessage[];
  /** True while a reply is in flight (drives the typing indicator + collapse). */
  isPending: boolean;
  /** Current input draft (owned by ChatDialog). */
  draft: string;
  /** Forward input edits back to ChatDialog. */
  onDraftChange: (value: string) => void;
  /** ChatDialog's keydown handler (Enter-to-send + history navigation). */
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  /** ChatDialog's submit handler. */
  onSubmit: () => void;
  /** Shared textarea ref so ChatDialog's caret/history effects keep working. */
  inputRef: MutableRefObject<HTMLTextAreaElement | null>;
  placeholder?: string;
  /** Centered on init; docked bottom-center once a mind map is on screen. */
  placement?: ChatInputPanelPlacement;
  /** Height of the history area when expanded (≈ 1/4 of the dialog). */
  historyHeight?: number | string;
}

export const ChatInputPanel = ({
  messages,
  isPending,
  draft,
  onDraftChange,
  onKeyDown,
  onSubmit,
  inputRef,
  placeholder = 'Ask AI to create template mindmap…',
  placement = 'center',
  historyHeight = 120,
}: ChatInputPanelProps) => {
  // The ONLY state this component owns: whether the full UI (history) is shown.
  const [mode, setMode] = useState<'expanded' | 'compact'>('expanded');
  const [isExpandedLarge, setIsExpandedLarge] = useState(false);
  const [thinkingStatusIdx, setThinkingStatusIdx] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Collapse to compact the instant a send begins. This observes existing
  // state (isPending) only — it does not change how the message is sent.
  useEffect(() => {
    if (isPending) setMode('compact');
  }, [isPending]);

  // Cycle through status texts while the loading indicator is shown.
  useEffect(() => {
    if (!isPending) {
      setThinkingStatusIdx(0);
      return;
    }
    const id = setInterval(
      () => setThinkingStatusIdx((prev) => (prev + 1) % THINKING_STATUSES.length),
      1800,
    );
    return () => clearInterval(id);
  }, [isPending]);

  // Restore focus to the textarea once loading ends so the user can type immediately.
  useEffect(() => {
    if (!isPending) inputRef.current?.focus();
  }, [isPending, inputRef]);

  // Keep the history pinned to the newest message while it's visible.
  useLayoutEffect(() => {
    if (mode !== 'expanded') return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isPending, mode]);

  // Plain-string history only — mind-map attachments are intentionally excluded
  // (ChatDialog renders the map fullscreen behind this panel).
  const textMessages = messages.filter((m) => m.content);

  // Expanded history height is exposed as a CSS var so the collapse can be a
  // pure-CSS `max-height` transition (0 ↔ this value) driven by the mode class.
  // isExpandedLarge doubles the history area; the max-height transition animates it.
  const expandedHistory =
    typeof historyHeight === 'number'
      ? `${isExpandedLarge ? historyHeight * 2 : historyHeight}px`
      : historyHeight;

  return (
    <div
      className={[
        'rcl-chat-input-panel',
        `rcl-chat-input-panel--${mode}`,
        `rcl-chat-input-panel--${placement}`,
        isPending ? 'rcl-chat-input-panel--submitting' : '',
      ].filter(Boolean).join(' ')}
      style={{ ['--rcl-history-h' as string]: expandedHistory } as CSSProperties}
      role="group"
      aria-label="Chat input"
    >
      <div className="rcl-chat-input-panel__toolbar">
        <button
          type="button"
          className="rcl-chat-input-panel__tool"
          onClick={() => setIsExpandedLarge((prev) => !prev)}
          aria-label={isExpandedLarge ? 'Restore height' : 'Expand larger'}
          title={isExpandedLarge ? 'Restore height' : 'Expand larger'}
          aria-pressed={isExpandedLarge}
        >
          <ExpandLargeIcon />
        </button>
        <button
          type="button"
          className="rcl-chat-input-panel__tool"
          onClick={() => { setMode('compact'); setIsExpandedLarge(false); }}
          aria-label="Minimize"
          title="Minimize"
        >
          <MinimizeIcon />
        </button>
      </div>

      <div className="rcl-chat-input-panel__history-wrap">
        <div className="rcl-chat-input-panel__history" ref={listRef}>
          {textMessages.length === 0 && !isPending ? (
            <p className="rcl-chat-input-panel__empty">
              Ask the Mindmap assistant to generate template questions...
            </p>
          ) : (
            textMessages.map((message) => (
              <div
                key={message.id}
                className={[
                  'rcl-chat-input-panel__row',
                  `rcl-chat-input-panel__row--${message.role}`,
                ].join(' ')}
              >
                <div
                  className={[
                    'rcl-chat-input-panel__bubble',
                    `rcl-chat-input-panel__bubble--${message.role}`,
                  ].join(' ')}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}

          {isPending && (
            <div className="rcl-chat-input-panel__row rcl-chat-input-panel__row--assistant">
              <div className="rcl-chat-input-panel__bubble rcl-chat-input-panel__bubble--assistant rcl-chat-input-panel__bubble--typing">
                <span className="rcl-chat-input-panel__dot" />
                <span className="rcl-chat-input-panel__dot" />
                <span className="rcl-chat-input-panel__dot" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom slot: thinking indicator and composer share the same height.
          The composer stays in-flow (so it sizes __bottom) and both layers
          cross-fade via opacity + translateY — no layout jump. */}
      <div className="rcl-chat-input-panel__bottom">
        <div
          className={[
            'rcl-chat-input-panel__thinking',
            isPending ? 'rcl-chat-input-panel__thinking--visible' : '',
          ].join(' ')}
          role="status"
          aria-live="polite"
          aria-label={isPending ? 'Thinking' : undefined}
        >
          <div className="rcl-chat-input-panel__thinking-dots">
            <span className="rcl-chat-input-panel__thinking-dot" />
            <span className="rcl-chat-input-panel__thinking-dot" />
            <span className="rcl-chat-input-panel__thinking-dot" />
          </div>
          <div className="rcl-chat-input-panel__thinking-content">
            <div className="rcl-chat-input-panel__thinking-label">
              <ThinkingIcon />
              <span>THINKING</span>
            </div>
            <span className="rcl-chat-input-panel__thinking-status">
              {THINKING_STATUSES[thinkingStatusIdx]}
            </span>
          </div>
        </div>

        <div
          className={[
            'rcl-chat-input-panel__composer',
            isPending ? 'rcl-chat-input-panel__composer--hidden' : '',
          ].join(' ')}
        >
          <textarea
            ref={inputRef}
            className="rcl-chat-input-panel__input"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isPending}
          />
          <button
            type="button"
            className="rcl-chat-input-panel__send"
            onClick={onSubmit}
            disabled={isPending || draft.trim().length === 0}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
          {mode === 'compact' && (
            <button
              type="button"
              className="rcl-chat-input-panel__tool"
              onClick={() => setMode('expanded')}
              aria-label="Maximize"
              title="Maximize"
            >
              <MaximizeIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
