import { NextRequest, NextResponse } from 'next/server';
import { summarizeRelease } from '@/lib/summarize';

export async function POST(req: NextRequest) {
  let body: { changelog?: string; packageName?: string; claudeApiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { changelog, packageName, claudeApiKey } = body;
  if (!changelog || !packageName) {
    return NextResponse.json(
      { error: '`changelog` and `packageName` are required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || claudeApiKey;

  if (!apiKey) {
    return NextResponse.json({ summary: summarizeRelease(changelog) });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Summarize this changelog for the npm package "${packageName}" in 3-4 bullet points. Focus on breaking changes, new APIs, and important bug fixes. Skip CI, test, and internal changes.\n\nChangelog:\n${changelog}\n\nBullet points only (start each with •):`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ summary: summarizeRelease(changelog) });
    }

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? '';
    return NextResponse.json({ summary: text || summarizeRelease(changelog) });
  } catch {
    return NextResponse.json({ summary: summarizeRelease(changelog) });
  }
}
