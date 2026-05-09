import { Project, ProjectPackageEntry } from './types';

const PROJECTS_KEY = 'npm-tracker-projects';

function load(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function save(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getProjects(): Project[] {
  return load();
}

export function createProject(name: string, description?: string): Project {
  const project: Project = {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: description?.trim() || undefined,
    createdAt: new Date().toISOString(),
    packages: [],
  };
  save([...load(), project]);
  return project;
}

export function deleteProject(id: string): void {
  save(load().filter(p => p.id !== id));
}

export function updateProject(id: string, name: string, description?: string): void {
  save(load().map(p =>
    p.id === id ? { ...p, name: name.trim(), description: description?.trim() || undefined } : p
  ));
}

export function addPackageToProject(projectId: string, entry: ProjectPackageEntry): void {
  save(load().map(p => {
    if (p.id !== projectId) return p;
    // Replace if already present, otherwise append.
    const exists = p.packages.find(e => e.name === entry.name);
    return {
      ...p,
      packages: exists
        ? p.packages.map(e => e.name === entry.name ? entry : e)
        : [...p.packages, entry],
    };
  }));
}

export function removePackageFromProject(projectId: string, name: string): void {
  save(load().map(p =>
    p.id !== projectId ? p : { ...p, packages: p.packages.filter(e => e.name !== name) }
  ));
}

export function updateInstalledVersion(projectId: string, name: string, version: string): void {
  save(load().map(p =>
    p.id !== projectId ? p : {
      ...p,
      packages: p.packages.map(e => e.name === name ? { ...e, installedVersion: version } : e),
    }
  ));
}

export function importPackageJsonToProject(projectId: string, raw: string): { added: number; skipped: number } {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON');
  }

  const depFields = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
  const entries: ProjectPackageEntry[] = [];

  for (const field of depFields) {
    const deps = parsed[field];
    if (!deps || typeof deps !== 'object') continue;
    for (const [name, ver] of Object.entries(deps as Record<string, string>)) {
      // Strip semver range prefixes: ^1.2.3 → 1.2.3, ~1.2.3 → 1.2.3
      const version = String(ver).replace(/^[\^~>=<*]+/, '').split(' ')[0] || '0.0.0';
      entries.push({ name, installedVersion: version, addedAt: new Date().toISOString() });
    }
  }

  const projects = load();
  const project = projects.find(p => p.id === projectId);
  if (!project) return { added: 0, skipped: 0 };

  const existing = new Set(project.packages.map(e => e.name));
  const toAdd = entries.filter(e => !existing.has(e.name));
  const toUpdate = entries.filter(e => existing.has(e.name));

  save(projects.map(p =>
    p.id !== projectId ? p : {
      ...p,
      packages: [
        ...p.packages.map(e => {
          const updated = toUpdate.find(u => u.name === e.name);
          return updated ? { ...e, installedVersion: updated.installedVersion } : e;
        }),
        ...toAdd,
      ],
    }
  ));

  return { added: toAdd.length, skipped: toUpdate.length };
}
