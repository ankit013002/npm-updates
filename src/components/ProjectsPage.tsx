'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { NpmPackageData, Project, ProjectPackageEntry } from '@/lib/types';
import {
  addPackageToProject,
  createProject,
  deleteProject,
  getProjects,
  importPackageJsonToProject,
  removePackageFromProject,
  updateInstalledVersion,
  updateProject,
} from '@/lib/projects-storage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function semverCompare(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
  }
  return 0;
}

function bumpLabel(from: string, to: string): 'major' | 'minor' | 'patch' | null {
  const a = from.split('.').map(Number);
  const b = to.split('.').map(Number);
  if ((b[0] ?? 0) > (a[0] ?? 0)) return 'major';
  if ((b[1] ?? 0) > (a[1] ?? 0)) return 'minor';
  if ((b[2] ?? 0) > (a[2] ?? 0)) return 'patch';
  return null;
}

// ─── Shared small components ──────────────────────────────────────────────────

function BumpBadge({ bump }: { bump: 'major' | 'minor' | 'patch' }) {
  const cls =
    bump === 'major' ? 'bg-amber-900/40 text-amber-400 border-amber-800/60' :
    bump === 'minor' ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800/60' :
                      'bg-gray-800 text-gray-400 border-gray-700';
  return (
    <span className={`inline-flex px-1.5 py-px text-[10px] font-medium uppercase tracking-wider rounded border ${cls}`}>
      {bump}
    </span>
  );
}

function IconBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors">
      {children}
    </button>
  );
}

// ─── Create project modal ─────────────────────────────────────────────────────

function CreateProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Project) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(createProject(name, description));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md mx-4 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-100">New project</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 rounded">
            <XIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Project name <span className="text-red-400">*</span></label>
            <input ref={inputRef} value={name} onChange={e => setName(e.target.value)}
              placeholder="my-app, api-server, design-system…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Description <span className="text-gray-600">(optional)</span></label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What is this project?"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim()}
              className="px-4 py-2 text-sm font-medium bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add package modal ────────────────────────────────────────────────────────

function AddPackageModal({
  projectId, existing, onClose, onAdded,
}: {
  projectId: string;
  existing: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<NpmPackageData | null>(null);
  const [version, setVersion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/package/${encodeURIComponent(trimmed)}`);
      if (!res.ok) { setError('Package not found'); return; }
      const data: NpmPackageData = await res.json();
      setResult(data);
      setVersion(data.latestVersion);
    } catch {
      setError('Failed to reach npm registry');
    } finally {
      setSearching(false);
    }
  }

  function handleAdd() {
    if (!result) return;
    addPackageToProject(projectId, {
      name: result.name,
      installedVersion: version.trim() || result.latestVersion,
      addedAt: new Date().toISOString(),
    });
    onAdded();
    // Reset to add another
    setQuery('');
    setResult(null);
    setVersion('');
    setError(null);
    inputRef.current?.focus();
  }

  const alreadyIn = result ? existing.has(result.name) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg mx-4 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-100">Add package</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 rounded"><XIcon /></button>
        </div>
        <div className="p-5 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Package name (e.g. react, zod, drizzle-orm)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors" />
            <button type="submit" disabled={searching || !query.trim()}
              className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 rounded-lg transition-colors">
              {searching ? 'Searching…' : 'Look up'}
            </button>
          </form>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {result && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-800/60 border border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-100">{result.name}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded font-mono">
                    latest: v{result.latestVersion}
                  </span>
                  {alreadyIn && (
                    <span className="text-xs text-amber-400">already in project</span>
                  )}
                </div>
                {result.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{result.description}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Installed version in this project
                </label>
                <div className="flex gap-2">
                  <input value={version} onChange={e => setVersion(e.target.value)}
                    placeholder={result.latestVersion}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors" />
                  <button onClick={handleAdd}
                    className="px-4 py-2 text-sm font-medium bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                    {alreadyIn ? 'Update version' : 'Add to project'}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-600">
                  Leave blank to use latest ({result.latestVersion}). Enter the version from your{' '}
                  <code className="text-gray-400">package.json</code> if different.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Import package.json modal ────────────────────────────────────────────────

function ImportModal({
  projectId, onClose, onImported,
}: {
  projectId: string;
  onClose: () => void;
  onImported: (result: { added: number; skipped: number }) => void;
}) {
  const sample = `{
  "dependencies": {
    "react": "^18.2.0",
    "next": "^14.0.4",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.1"
  }
}`;
  const [text, setText] = useState(sample);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleImport() {
    try {
      const result = importPackageJsonToProject(projectId, text);
      onImported(result);
      onClose();
    } catch {
      // Handled inline — show nothing, the textarea content is already user-editable
    }
  }

  // Count packages for preview
  let count = 0;
  try {
    const j = JSON.parse(text);
    count = Object.keys(j.dependencies ?? {}).length +
            Object.keys(j.devDependencies ?? {}).length +
            Object.keys(j.peerDependencies ?? {}).length;
  } catch { /* ignore */ }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg mx-4 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-100">Import package.json</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 rounded"><XIcon /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500">
            Paste your <code className="text-gray-300">package.json</code>. Installed versions are read directly from the version field — range prefixes like <code className="text-gray-300">^</code> and <code className="text-gray-300">~</code> are stripped.
          </p>
          <textarea value={text} onChange={e => setText(e.target.value)} spellCheck={false} rows={10}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-xs text-gray-300 leading-relaxed focus:outline-none focus:border-gray-600 transition-colors resize-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {count > 0 ? `${count} package${count !== 1 ? 's' : ''} detected` : 'No packages detected'}
            </span>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleImport} disabled={count === 0}
                className="px-4 py-2 text-sm font-medium bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
                Import {count > 0 ? count : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Package row in project detail ───────────────────────────────────────────

function ProjectPackageRow({
  entry, projectId, onRemove, onVersionUpdate,
}: {
  entry: ProjectPackageEntry;
  projectId: string;
  onRemove: () => void;
  onVersionUpdate: () => void;
}) {
  const [latestData, setLatestData] = useState<NpmPackageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftVersion, setDraftVersion] = useState(entry.installedVersion);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/package/${encodeURIComponent(entry.name)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setLatestData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entry.name]);

  const latest = latestData?.latestVersion ?? null;
  const needsUpdate = latest ? semverCompare(entry.installedVersion, latest) === -1 : false;
  const bump = needsUpdate && latest ? bumpLabel(entry.installedVersion, latest) : null;

  function handleVersionSave(e: FormEvent) {
    e.preventDefault();
    const v = draftVersion.trim().replace(/^[\^~>=<*]+/, '');
    if (!v) return;
    updateInstalledVersion(projectId, entry.name, v);
    setEditing(false);
    onVersionUpdate();
  }

  return (
    <tr className="group border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30 transition-colors">
      <td className="py-3 pl-4 pr-2">
        <div className="flex flex-col">
          <span className="font-mono text-sm text-gray-100">{entry.name}</span>
          {latestData?.description && (
            <span className="text-xs text-gray-600 truncate max-w-xs mt-0.5">{latestData.description}</span>
          )}
        </div>
      </td>
      <td className="py-3 px-2">
        {editing ? (
          <form onSubmit={handleVersionSave} className="flex items-center gap-1.5">
            <input
              value={draftVersion}
              onChange={e => setDraftVersion(e.target.value)}
              autoFocus
              className="w-28 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-mono text-gray-100 focus:outline-none focus:border-gray-400"
            />
            <button type="submit" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Save</button>
            <button type="button" onClick={() => { setEditing(false); setDraftVersion(entry.installedVersion); }}
              className="text-xs text-gray-500 hover:text-gray-300">✕</button>
          </form>
        ) : (
          <button onClick={() => { setEditing(true); setDraftVersion(entry.installedVersion); }}
            className="group/v flex items-center gap-1.5 text-left">
            <span className="font-mono text-xs text-gray-300">{entry.installedVersion}</span>
            <span className="text-[10px] text-gray-600 opacity-0 group-hover/v:opacity-100 transition-opacity">edit</span>
          </button>
        )}
      </td>
      <td className="py-3 px-2">
        {loading ? (
          <span className="text-xs text-gray-600">…</span>
        ) : latest ? (
          <span className={`font-mono text-xs ${needsUpdate ? 'text-emerald-400' : 'text-gray-500'}`}>{latest}</span>
        ) : (
          <span className="text-xs text-gray-600">—</span>
        )}
      </td>
      <td className="py-3 px-2">
        {bump ? <BumpBadge bump={bump} /> : needsUpdate === false && latest ? (
          <span className="text-xs text-gray-600">up to date</span>
        ) : null}
      </td>
      <td className="py-3 pl-2 pr-4">
        <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          {latestData?.repositoryUrl && (
            <a href={latestData.repositoryUrl} target="_blank" rel="noreferrer"
              className="p-1.5 text-gray-500 hover:text-gray-300 rounded transition-colors" title="GitHub">
              <GitHubIcon />
            </a>
          )}
          <a href={`https://www.npmjs.com/package/${entry.name}`} target="_blank" rel="noreferrer"
            className="p-1.5 text-gray-500 hover:text-gray-300 rounded transition-colors" title="npm">
            <NpmIcon />
          </a>
          <IconBtn onClick={onRemove} label="Remove from project">
            <XIcon />
          </IconBtn>
        </div>
      </td>
    </tr>
  );
}

// ─── Project detail view ──────────────────────────────────────────────────────

function ProjectDetail({
  project, onBack, onProjectUpdated,
}: {
  project: Project;
  onBack: () => void;
  onProjectUpdated: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(project.name);
  const [draftDesc, setDraftDesc] = useState(project.description ?? '');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const existingNames = new Set(project.packages.map(p => p.name));

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  function handleRemove(name: string) {
    removePackageFromProject(project.id, name);
    onProjectUpdated();
  }

  function handleNameSave(e: FormEvent) {
    e.preventDefault();
    if (!draftName.trim()) return;
    updateProject(project.id, draftName, draftDesc);
    setEditingName(false);
    onProjectUpdated();
  }

  const updatesCount = project.packages.length; // actual count computed per-row; header just shows total

  return (
    <div>
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-200 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All projects
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        {editingName ? (
          <form onSubmit={handleNameSave} className="flex-1 space-y-2">
            <input value={draftName} onChange={e => setDraftName(e.target.value)} autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-base font-semibold text-gray-100 focus:outline-none focus:border-gray-500" />
            <input value={draftDesc} onChange={e => setDraftDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500" />
            <div className="flex gap-2">
              <button type="submit" className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">Save</button>
              <button type="button" onClick={() => setEditingName(false)} className="text-sm text-gray-500 hover:text-gray-300">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-100 truncate">{project.name}</h2>
              <button onClick={() => setEditingName(true)}
                className="shrink-0 p-1 text-gray-600 hover:text-gray-300 rounded transition-colors" title="Edit name">
                <PencilIcon />
              </button>
            </div>
            {project.description && <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>}
            <p className="text-xs text-gray-600 mt-1">
              {updatesCount} package{updatesCount !== 1 ? 's' : ''} · created {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-gray-700 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import package.json
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
            </svg>
            Add package
          </button>
        </div>
      </div>

      {/* Package table */}
      {project.packages.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-xl">
          <p className="text-gray-500 text-sm">No packages yet</p>
          <p className="text-gray-600 text-xs mt-1">Add packages manually or import a package.json</p>
          <button onClick={() => setShowImport(true)}
            className="mt-4 px-4 py-2 text-sm text-gray-300 hover:text-gray-100 hover:bg-gray-800 border border-gray-700 rounded-lg transition-colors">
            Import package.json
          </button>
        </div>
      ) : (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 pl-4 pr-2">Package</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-2">Installed</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-2">Latest</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2.5 px-2">Status</th>
                <th className="py-2.5 pl-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {project.packages.map(entry => (
                <ProjectPackageRow
                  key={entry.name}
                  entry={entry}
                  projectId={project.id}
                  onRemove={() => { handleRemove(entry.name); }}
                  onVersionUpdate={onProjectUpdated}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddPackageModal
          projectId={project.id}
          existing={existingNames}
          onClose={() => setShowAdd(false)}
          onAdded={() => { onProjectUpdated(); showToast('Package added'); }}
        />
      )}
      {showImport && (
        <ImportModal
          projectId={project.id}
          onClose={() => setShowImport(false)}
          onImported={({ added, skipped }) => {
            onProjectUpdated();
            showToast(`Imported ${added} package${added !== 1 ? 's' : ''}${skipped ? `, updated ${skipped}` : ''}`);
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-sm text-gray-100">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project, onSelect, onDelete,
}: {
  project: Project;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const count = project.packages.length;

  return (
    <div
      className="group relative flex flex-col bg-gray-900/60 border border-gray-800 rounded-xl p-4 hover:border-gray-700 hover:bg-gray-900 transition-all cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-100 truncate">{project.name}</h3>
          {project.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{project.description}</p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 p-1 text-gray-700 hover:text-gray-400 rounded opacity-0 group-hover:opacity-100 transition-all"
          title="Delete project"
        >
          <XIcon />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
        <span>{count} package{count !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>

      {project.packages.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.packages.slice(0, 5).map(p => (
            <span key={p.name} className="inline-flex items-center gap-1 px-1.5 py-px rounded bg-gray-800 border border-gray-700 font-mono text-[11px] text-gray-400">
              {p.name}
              <span className="text-gray-600">{p.installedVersion}</span>
            </span>
          ))}
          {project.packages.length > 5 && (
            <span className="text-[11px] text-gray-600 self-center">+{project.packages.length - 5} more</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = useCallback(() => setProjects(getProjects()), []);

  useEffect(() => { refresh(); }, [refresh]);

  function handleDelete(id: string) {
    deleteProject(id);
    refresh();
    if (selectedId === id) setSelectedId(null);
  }

  const selected = selectedId ? projects.find(p => p.id === selectedId) ?? null : null;

  return (
    <div className="py-8">
      {selected ? (
        <ProjectDetail
          key={selected.id}
          project={selected}
          onBack={() => setSelectedId(null)}
          onProjectUpdated={refresh}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-gray-100">Projects</h2>
              <p className="text-xs text-gray-500 mt-0.5">Group packages by project and track installed versions</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
              </svg>
              New project
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl">
              <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-xl bg-gray-900 border border-gray-800 text-gray-600 mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">No projects yet</p>
              <p className="text-gray-600 text-xs mt-1 max-w-xs mx-auto">
                Create a project to track which versions of packages you&apos;re using and see how far behind you are.
              </p>
              <button onClick={() => setShowCreate(true)}
                className="mt-5 px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors">
                Create your first project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onSelect={() => setSelectedId(p.id)}
                  onDelete={() => handleDelete(p.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={p => { refresh(); setSelectedId(p.id); }}
        />
      )}
    </div>
  );
}

// ─── Micro icons ──────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

function NpmIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 0v24h24V0H0zm6.672 19.992H4.008V8.016H6.672v11.976zm7.992 0h-2.664V8.016h2.664v8.652h2.664V8.016h2.664v11.976h-5.328z"/>
    </svg>
  );
}
