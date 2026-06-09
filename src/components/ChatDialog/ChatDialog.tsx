import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { ChatMindMapAttachment } from './ChatMindMapAttachment';
import { ChatInputPanel } from './ChatInputPanel';
import type { ChatDialogProps, ChatMessage, ChatReply } from './types';
import './ChatDialog.css';

const DEFAULT_RESPONSE = 'Here is the recommended questions list.';

const generateId = () =>
  `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const ChatDialog = ({
  value,
  defaultValue,
  onChange,
  onSubmit,
  defaultMindMapTree,
  mindMapJson,
  mindMapValue,
  onMindMapChange,
  attachmentHeight = 360,
  title = 'Chat',
  placeholder = 'Ask AI to create template mindmap…',
  height = 480,
  className,
}: ChatDialogProps) => {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<ChatMessage[]>(defaultValue ?? []);
  const messages = isControlled ? (value as ChatMessage[]) : internal;

  const [draft, setDraft] = useState('');
  const [isPending, setIsPending] = useState(false);

  // History of user-submitted messages (oldest first). historyIndex === null
  // means we're not navigating; otherwise it points to the entry currently
  // shown in the input. stashedDraft preserves whatever was typed before
  // navigation started so Down past the newest entry restores it.
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const stashedDraftRef = useRef('');

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const commit = useCallback(
    (next: ChatMessage[]) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  // Track latest messages so async submit handlers append to fresh state.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const handleSubmit = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || isPending) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };
    const afterUser = [...messagesRef.current, userMessage];
    commit(afterUser);
    setDraft('');
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(null);
    stashedDraftRef.current = '';
    setIsPending(true);

    try {
      // When using the default responder, seed the embedded mindmap from
      // whichever tree the caller provided. Prefer the shared controlled tree
      // (so the very first response already reflects the current state) and
      // fall back to `defaultMindMapTree`.
      const seedTree = mindMapValue ?? defaultMindMapTree;
      const raw = onSubmit
        ? await onSubmit(trimmed)
        : (mindMapJson ??
          ({
            content: DEFAULT_RESPONSE,
            attachment: seedTree
              ? { type: 'mindmap', tree: seedTree }
              : undefined,
          } satisfies ChatReply));
      const reply: ChatReply =
        typeof raw === 'string' ? { content: raw } : raw;
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: reply.content,
        attachment: reply.attachment,
        createdAt: Date.now(),
      };
      commit([...afterUser, assistantMessage]);
    } catch (error) {
      // Surface failures as an assistant message instead of silently dropping
      // the turn — otherwise the user sees their message with no reply.
      const detail =
        error instanceof Error ? error.message : 'Something went wrong.';
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `⚠️ ${detail}`,
        createdAt: Date.now(),
      };
      commit([...afterUser, errorMessage]);
    } finally {
      setIsPending(false);
    }
  }, [
    draft,
    isPending,
    onSubmit,
    defaultMindMapTree,
    mindMapJson,
    mindMapValue,
    commit,
  ]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
      return;
    }

    const ta = event.currentTarget;
    const caretAtStart = ta.selectionStart === 0 && ta.selectionEnd === 0;
    const caretAtEnd =
      ta.selectionStart === ta.value.length &&
      ta.selectionEnd === ta.value.length;

    // Only intercept arrows when the caret is at a boundary, so multi-line
    // drafts still allow normal cursor movement within the text.
    if (event.key === 'ArrowUp' && caretAtStart) {
      if (history.length === 0) return;
      event.preventDefault();
      if (historyIndex === null) {
        stashedDraftRef.current = draft;
        const next = history.length - 1;
        setHistoryIndex(next);
        setDraft(history[next]!);
      } else if (historyIndex > 0) {
        const next = historyIndex - 1;
        setHistoryIndex(next);
        setDraft(history[next]!);
      }
      return;
    }

    if (event.key === 'ArrowDown' && caretAtEnd) {
      if (historyIndex === null) return;
      event.preventDefault();
      if (historyIndex < history.length - 1) {
        const next = historyIndex + 1;
        setHistoryIndex(next);
        setDraft(history[next]!);
      } else {
        setHistoryIndex(null);
        setDraft(stashedDraftRef.current);
        stashedDraftRef.current = '';
      }
    }
  };

  // After a history navigation pulls a value into the input, drop the caret at
  // the end so the user can keep editing the recalled message.
  useLayoutEffect(() => {
    if (historyIndex === null) return;
    const ta = inputRef.current;
    if (!ta) return;
    const len = ta.value.length;
    ta.setSelectionRange(len, len);
  }, [historyIndex, draft]);

  // Reset pending state if the component is unmounted mid-flight.
  useEffect(() => () => setIsPending(false), []);

  // Focus mode: once a reply carries a mind map, the latest one takes over the
  // whole stage (full width + full height). Find the most recent mind-map
  // message; -1 means none yet.
  let lastMindMapIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]!.attachment?.type === 'mindmap') {
      lastMindMapIndex = i;
      break;
    }
  }
  const focusMindMap = lastMindMapIndex !== -1;
  const focusedMessage = focusMindMap ? messages[lastMindMapIndex]! : null;

  // Expanded history ≈ 1/4 of the dialog when the height is numeric (the common
  // case); otherwise fall back to a sensible fixed value. Width (≈ 1/3) is
  // handled purely in CSS so it stays responsive to the dialog's actual width.
  const panelHistoryHeight =
    typeof height === 'number' ? Math.round(height / 4) : 120;

  return (
    <div
      className={['rcl-chat-dialog', className].filter(Boolean).join(' ')}
      style={{ height }}
      role="dialog"
      aria-label={title}
    >
      {title && (
        <div className="rcl-chat-dialog__header">
          <span className="rcl-chat-dialog__title">Mindmap AI Template Assistant</span>
        </div>
      )}

      {/* Stage: the mind map fills it fullscreen; the input panel floats on top. */}
      <div className="rcl-chat-dialog__stage">
        {focusedMessage?.attachment?.type === 'mindmap' && (
          <div className="rcl-chat-dialog__mindmap-layer">
            <ChatMindMapAttachment
              tree={focusedMessage.attachment.tree}
              height={attachmentHeight}
              value={mindMapValue}
              onChange={onMindMapChange}
            />
          </div>
        )}

        <ChatInputPanel
          messages={messages}
          isPending={isPending}
          draft={draft}
          onDraftChange={setDraft}
          onKeyDown={handleKeyDown}
          onSubmit={() => void handleSubmit()}
          inputRef={inputRef}
          placeholder={placeholder}
          placement={focusMindMap ? 'docked' : 'center'}
          historyHeight={panelHistoryHeight}
        />
      </div>
    </div>
  );
};
