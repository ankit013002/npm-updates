import { NextRequest, NextResponse } from 'next/server';

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

function resolvedBase(clientBase: string | undefined): string | null {
  // Env var takes unconditional precedence.
  if (process.env.OLLAMA_BASE_URL) return process.env.OLLAMA_BASE_URL;

  const raw = clientBase || 'http://localhost:11434';
  try {
    const { hostname } = new URL(raw);
    if (!LOOPBACK.has(hostname)) return null; // reject non-loopback hosts
    return raw;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: { changelog?: string; packageName?: string; baseUrl?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { changelog, packageName, baseUrl, model } = body;
  if (!changelog || !packageName) {
    return NextResponse.json({ error: '`changelog` and `packageName` are required' }, { status: 400 });
  }

  const ollamaBase = resolvedBase(baseUrl);
  if (!ollamaBase) {
    return NextResponse.json(
      { error: 'Invalid Ollama URL. Only loopback addresses are allowed (set OLLAMA_BASE_URL env var for remote hosts).' },
      { status: 400 }
    );
  }

  const ollamaModel: string = process.env.OLLAMA_MODEL || model || 'llama3.2';

  const prompt = `Summarize the following changelog for the npm package "${packageName}" in 2-3 concise bullet points. Focus only on what matters to a developer consuming this package — breaking changes, new APIs, or important bug fixes. Skip internal refactors and CI changes.

Changelog:
${changelog}

Summary (bullet points only):`;

  let res: Response;
  try {
    res = await fetch(`${ollamaBase}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaModel, prompt, stream: false }),
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not reach Ollama. Is it running?' },
      { status: 503 }
    );
  }

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ summary: data.response ?? '' });
}
