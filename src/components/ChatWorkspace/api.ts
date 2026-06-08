// Thin client for the mind-map backend (backend/app/routes/generate.py).
// Override the base URL with a VITE_API_BASE env var; defaults to localhost:8000.
const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:8000';
import { markdownToMindmapData } from './markdownToJson';

interface GenerateResponse {
  markdown: string;
}

/**
 * Send a question to the backend and return the generated Markdown mind map.
 * Throws on a non-2xx response so ChatDialog surfaces the failure as a reply.
 */
export async function generateMindmap(question: string): Promise<any> {
  const res = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      /* response had no JSON body — keep the status text */
    }
    throw new Error(`Backend error (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as GenerateResponse;
  console.log('yanx1');
  const jsonValue = markdownToMindmapData(data.markdown);
  console.log(jsonValue);
  return {
    markdown: data.markdown,
    jsonValue: jsonValue,
  };
}
