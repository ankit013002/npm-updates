import { NextRequest, NextResponse } from 'next/server';

interface ParsedRepo {
  owner: string;
  repo: string;
  subPath: string | null;
}

function parseGitHubRepo(input: string): ParsedRepo | null {
  const clean = input.trim().replace(/\.git$/, '').replace(/\/$/, '');

  // Full GitHub URL — capture optional /tree/<branch>/<path>
  const urlMatch = clean.match(/github\.com\/([^/#?]+)\/([^/#?]+)(?:\/tree\/[^/#?]+\/(.+))?/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2], subPath: urlMatch[3] ?? null };
  }

  // owner/repo shorthand
  const slugMatch = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (slugMatch) {
    return { owner: slugMatch[1], repo: slugMatch[2], subPath: null };
  }

  return null;
}

async function fetchFileContent(owner: string, repo: string, filePath: string): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath}`,
    {
      headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'npm-tracker' },
      next: { revalidate: 60 },
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.encoding !== 'base64' || !data.content) return null;
  return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
}

async function findPackageJsonPaths(owner: string, repo: string): Promise<string[]> {
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/HEAD?recursive=1`,
    {
      headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'npm-tracker' },
      next: { revalidate: 60 },
    },
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data.tree)) return [];

  return (data.tree as { type: string; path: string }[])
    .filter(item => item.type === 'blob' && (item.path === 'package.json' || item.path.endsWith('/package.json')))
    .filter(item => !item.path.includes('node_modules/'))
    .map(item => item.path)
    .slice(0, 20);
}

export async function GET(req: NextRequest) {
  const repoInput = req.nextUrl.searchParams.get('repo') ?? '';
  const explicitPath = req.nextUrl.searchParams.get('path');
  const parsed = parseGitHubRepo(repoInput);

  if (!parsed) {
    return NextResponse.json({ error: 'Invalid GitHub repo URL or slug' }, { status: 400 });
  }

  const { owner, repo, subPath } = parsed;

  const targetPath =
    explicitPath ??
    (subPath
      ? subPath.endsWith('package.json') ? subPath : `${subPath}/package.json`
      : 'package.json');

  const content = await fetchFileContent(owner, repo, targetPath);
  if (content !== null) {
    return NextResponse.json({ content });
  }

  // Root not found and no path hint — search the whole tree
  if (!explicitPath && !subPath) {
    const paths = await findPackageJsonPaths(owner, repo);
    if (paths.length === 0) {
      return NextResponse.json({ error: 'No package.json found in this repository' }, { status: 404 });
    }
    if (paths.length === 1) {
      const single = await fetchFileContent(owner, repo, paths[0]);
      if (single) return NextResponse.json({ content: single });
    }
    return NextResponse.json({ options: paths });
  }

  return NextResponse.json(
    { error: `package.json not found${subPath ? ` at ${subPath}` : ''}` },
    { status: 404 },
  );
}
