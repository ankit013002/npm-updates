import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string[] }> }
) {
  const { name: segments } = await params;
  // Rejoin segments so @scope/pkg arrives as two path parts: ['@scope', 'pkg']
  const packageName = segments.join('/');
  // Encode for the npm registry URL (%40scope%2Fpkg)
  const registryPath = segments.map(encodeURIComponent).join('%2F');

  const res = await fetch(`https://registry.npmjs.org/${registryPath}`, {
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

  const repoUrl =
    rawRepo
      ?.replace(/^git\+/, '')
      .replace(/^git:\/\//, 'https://')
      .replace(/^ssh:\/\/git@/, 'https://')
      .replace(/\.git$/, '') ?? null;

  return NextResponse.json({
    name: packageName,
    description: data.description ?? '',
    latestVersion: data['dist-tags']?.latest ?? '',
    repositoryUrl: repoUrl,
    versions: Object.keys(data.versions ?? {}).reverse().slice(0, 20),
    homepage: data.homepage ?? null,
  });
}
