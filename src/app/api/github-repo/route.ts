import { NextRequest, NextResponse } from 'next/server';

function parseGitHubRepo(input: string): { owner: string; repo: string } | null {
  const clean = input.trim().replace(/\.git$/, '').replace(/\/$/, '');

  const urlMatch = clean.match(/github\.com\/([^/#?]+)\/([^/#?]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };

  const slugMatch = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (slugMatch) return { owner: slugMatch[1], repo: slugMatch[2] };

  return null;
}

export async function GET(req: NextRequest) {
  const repo = req.nextUrl.searchParams.get('repo') ?? '';
  const parsed = parseGitHubRepo(repo);

  if (!parsed) {
    return NextResponse.json({ error: 'Invalid GitHub repo URL or slug' }, { status: 400 });
  }

  const { owner, repo: repoName } = parsed;

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/contents/package.json`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'npm-tracker',
      },
      next: { revalidate: 60 },
    },
  );

  if (!res.ok) {
    const msg = res.status === 404
      ? 'Repository or package.json not found'
      : `GitHub API error (${res.status})`;
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  const data = await res.json();

  if (data.encoding !== 'base64' || !data.content) {
    return NextResponse.json({ error: 'Unexpected response from GitHub' }, { status: 500 });
  }

  const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');

  return NextResponse.json({ content });
}
