import type { GitHubRelease, NpmPackageData } from './types';

export async function fetchPackageData(name: string): Promise<NpmPackageData> {
  const encoded = name.split('/').map(encodeURIComponent).join('%2F');
  const res = await fetch(`https://registry.npmjs.org/${encoded}`);
  if (!res.ok) throw new Error(`npm registry returned ${res.status}`);
  const json = await res.json();
  const latest: string = json['dist-tags']?.latest ?? '';
  return {
    name: json.name,
    description: json.description ?? '',
    latestVersion: latest,
    repositoryUrl: json.repository?.url ?? null,
    versions: Object.keys(json.versions ?? {}),
    homepage: json.homepage ?? null,
  };
}

export async function searchPackages(
  query: string
): Promise<Array<{ name: string; description: string; version: string }>> {
  const res = await fetch(
    `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`
  );
  if (!res.ok) return [];
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.objects ?? []).map((o: any) => ({
    name: o.package.name,
    description: o.package.description ?? '',
    version: o.package.version,
  }));
}

export async function fetchReleases(repoUrl: string): Promise<GitHubRelease[]> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/#]+)/);
  if (!match) return [];
  const [, owner, repoRaw] = match;
  const repo = repoRaw.replace(/\.git$/, '').split('#')[0];
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases?per_page=5`,
    { headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'npm-tracker-mobile' } }
  );
  if (!res.ok) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const releases: any[] = await res.json();
  return releases.map(r => ({
    tagName: r.tag_name,
    name: r.name,
    body: r.body ?? '',
    publishedAt: r.published_at,
    url: r.html_url,
  }));
}
