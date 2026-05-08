import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { changelog, packageName, baseUrl, model } = await req.json();

  const ollamaBase: string = baseUrl || 'http://localhost:11434';
  const ollamaModel: string = model || 'llama3.2';

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
