import { useCallback, useEffect, useState } from 'react';
import {
  ChatWorkspace,
  type ChatReply,
  type MarkdownTreeNodeData,
} from 'ai-mindmap-generator-sample';
import { convertToMindMap, type MindMapInput } from '../src/components/ChatWorkspace/json2MindMap';
import questionReply from '../src/question.json';
import { generateMindmap } from './api';
import { MarkdownTreeNode } from '../src/components/MarkdownTree/types';

const initialTree = questionReply.attachment.tree as MarkdownTreeNodeData[];

type PastedReply = {
  content?: string;
  attachment?: { type: 'mindmap'; tree: MarkdownTreeNodeData[] };
};

// Pull the tree out of a pasted object, accepting:
//   1. { topics: [...] }  — mockedAPI.json format, converted via convertToMindMap
//   2. { attachment: { tree } } — full ChatReply / question.json format
//   3. A bare tree array
const extractTree = (parsed: unknown): MarkdownTreeNodeData[] | null => {
  if (Array.isArray(parsed)) return parsed as MarkdownTreeNodeData[];
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'topics' in parsed &&
    Array.isArray((parsed as MindMapInput).topics)
  ) {
    const result = convertToMindMap(parsed as MindMapInput);
    return result.attachment.tree as MarkdownTreeNodeData[];
  }
  const tree = (parsed as PastedReply)?.attachment?.tree;
  return Array.isArray(tree) ? tree : null;
};

export const App = () => {
  const [tree, setTree] = useState<MarkdownTreeNodeData[]>(initialTree);
  const [showDemo, setShowDemo] = useState(false);
  const [jsonValue, setJsonValue] = useState<any>(null);
  // JSON-paste wiring (additive only — falls back to defaults when empty).
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  // When set, forwarded to <ChatWorkspace mindMapJson> to seed ChatDialog.
  // `undefined` keeps the existing bundled default behavior. Shaped to match
  // the `ChatReply` the prop expects (content is always a string).
  const [mindMapJson, setMindMapJson] = useState<
    | { content: string; attachment?: { type: 'mindmap'; tree: MarkdownTreeNodeData[] } }
    | undefined
  >(undefined);

  // Parse + inject the pasted JSON. Invalid JSON shows an error and changes
  // nothing; empty input restores the default initialization.
  const applyJson = () => {
    const text = jsonText.trim();
    if (!text) {
      setJsonError(null);
      // setTree(initialTree);
      setMindMapJson(undefined);
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
      setJsonValue(parsed);
    } catch {
      setJsonError('Invalid JSON format');
      return;
    }
    // const nextTree = extractTree(parsed);
    // if (!nextTree) {
    //   setJsonError(
    //     'JSON parsed, but no valid structure found. Expected { topics: [...] }, { attachment: { tree: [...] } }, or a bare array.',
    //   );
    //   return;
    // }
    // setJsonError(null);
    // setTree(nextTree);
    // const content = (parsed as PastedReply).content;
    // setMindMapJson({
    //   content: typeof content === 'string' ? content : '',
    //   attachment: { type: 'mindmap', tree: nextTree },
    // });
  };

  // Chat responder: send the typed message to the backend and return the
  // generated Markdown as the assistant reply. ChatDialog renders the returned
  // `content` as a response bubble in the ChatInputPanel (and surfaces a thrown
  // error there too, so a down backend shows up as a ⚠️ message).
  const handleChatSubmit = useCallback(
    async (input: string): Promise<ChatReply> => {
      const data = await generateMindmap(input);
      console.log("yanx2");
      console.log(data);

      const result = convertToMindMap(
        data.jsonValue, // { topics: [...] }
        "Summary", // root node heading (default: "Mind Map")
        "A summary of your questions", // root node subtext (optional)
        "Here is the mind map.", // top-level `content` field (optional)
      );
      console.log(result);
      setTree(result.attachment.tree as MarkdownTreeNode[]);
      return {
        content: data.markdown,
        attachment: result.attachment as { type: "mindmap"; tree: MarkdownTreeNode[] },
      };
    },
    [],
  );

  // Close the dialog on Escape and lock background scroll while it's open.
  useEffect(() => {
    if (!showDemo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDemo(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [showDemo]);

  useCallback(() => {
    console.log("yanx123", tree);
    console.log("yanx123", jsonValue);
  }, [tree]);

  return (
    <div
      style={{
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      <header>
        <h1 style={{ margin: 0 }}>React Component Library</h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Markdown tree and mind map sharing one source of truth. Changes in
          either view update both immediately.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label
          htmlFor="json-input"
          style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}
        >
          Initialize from JSON (optional)
        </label>
        <textarea
          id="json-input"
          value={jsonText}
          onChange={(e) => {
            const next = e.target.value;
            setJsonText(next);
            // Live feedback: flag invalid JSON as the user types, but only
            // inject on "Apply" so partial input never disrupts the views.
            if (!next.trim()) {
              setJsonError(null);
            } else {
              try {
                JSON.parse(next);
                setJsonError(null);
              } catch {
                setJsonError('Invalid JSON format');
              }
            }
          }}
          placeholder='Paste a JSON object, e.g. { "topics": [ { "title": "...", "subtopics": [ { "title": "...", "description": "..." } ] } ] }'
          rows={6}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: 12,
            fontSize: 13,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            color: '#111827',
            background: '#ffffff',
            border: `1px solid ${jsonError ? '#dc2626' : '#d1d5db'}`,
            borderRadius: 8,
            resize: 'vertical',
          }}
        />
        {jsonError && (
          <p role="alert" style={{ margin: 0, fontSize: 13, color: '#dc2626' }}>
            {jsonError}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={applyJson}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: '#ffffff',
              background: '#16a34a',
              border: '1px solid #16a34a',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Apply JSON
          </button>
          <button
            type="button"
            onClick={() => {
              setJsonText('');
              setJsonError(null);
              setTree(initialTree);
              setMindMapJson(undefined);
            }}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: '#374151',
              background: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Reset to default
          </button>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowDemo(true)}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 500,
            color: '#ffffff',
            background: '#2563eb',
            border: '1px solid #2563eb',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          showDemo
        </button>
      </div>

      {showDemo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Demo"
          onClick={() => setShowDemo(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2.5vh 2.5vw',
            background: 'rgba(17, 24, 39, 0.5)',
          }}
        >
          <div
            // Stop backdrop click-to-close from firing when interacting inside.
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '95vw',
              height: '95vh',
              background: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 12px 48px rgba(0, 0, 0, 0.28)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <button
              type="button"
              onClick={() => setShowDemo(false)}
              aria-label="Close dialog"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 1,
                width: 32,
                height: 32,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                lineHeight: 1,
                color: '#374151',
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: 24 }}>
              <ChatWorkspace
                // value={tree}
                onChange={setTree}
                jsonValue={jsonValue}
                jsonOnChange={setJsonValue}
                onChatSubmit={handleChatSubmit}
                mindMapJson={mindMapJson}
                className="rcl-chat-workspace--fill"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
