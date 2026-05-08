import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const repoUrl = req.nextUrl.searchParams.get('repoUrl');

  if (!repoUrl) {
    return NextResponse.json({ error: 'repoUrl required' }, { status: 400 });
  }

  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    return NextResponse.json({ releases: [] });
  }

  const [, owner, repo] = match;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases?per_page=5`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'npm-update-tracker',
      },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ releases: [] });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const releases: any[] = await res.json();

  return NextResponse.json({
    releases: releases.map(r => ({
      tagName: r.tag_name,
      name: r.name,
      body: r.body ?? '',
      publishedAt: r.published_at,
      url: r.html_url,
    })),
  });
}
