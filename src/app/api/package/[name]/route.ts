import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  // decode in case of scoped packages like %40scope%2Fpkg
  const decoded = decodeURIComponent(name);
  const encoded = decoded.replace('/', '%2F');

  const res = await fetch(`https://registry.npmjs.org/${encoded}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  const data = await res.json();

  const rawRepo: string | undefined =
    typeof data.repository === 'string'
      ? data.repository
      : data.repository?.url;

  const repoUrl = rawRepo
    ?.replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^ssh:\/\/git@/, 'https://')
    .replace(/\.git$/, '') ?? null;

  return NextResponse.json({
    name: data.name,
    description: data.description ?? '',
    latestVersion: data['dist-tags']?.latest ?? '',
    repositoryUrl: repoUrl,
    versions: Object.keys(data.versions ?? {}).reverse().slice(0, 20),
    homepage: data.homepage ?? null,
  });
}
