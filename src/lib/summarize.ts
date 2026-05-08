function priority(s: string): number {
  if (/\bbreaking\b|\bremov(ed?|al)\b|\bdeprecated?\b/i.test(s)) return 0;
  if (/\bfix(ed)?\b|\bbug\b|\bpatch\b|\bregression\b/i.test(s)) return 1;
  if (/\badd(ed)?\b|\bnew\b|\bfeat(ure)?\b|\bsupport\b|\bintroduc/i.test(s)) return 2;
  if (/\bimprove\b|\benhanc\b|\boptim\b|\bperformance\b/i.test(s)) return 3;
  return 4;
}

function clean(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')
    .trim();
}

export function summarizeRelease(body: string): string {
  if (!body.trim()) return '• No release notes provided.';

  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);

  const bullets = lines
    .filter(l => /^[-*+•]\s+.{10,}/.test(l) || /^\d+\.\s+.{10,}/.test(l))
    .map(l => clean(l.replace(/^[-*+•\d.]+\s+/, '')))
    .filter(l => l.length >= 10 && l.length <= 280)
    .filter(l => !/\b(ci\b|lint|renovate|dependabot|bump\s+version|update\s+dep)/i.test(l));

  const sorted = [...bullets].sort((a, b) => priority(a) - priority(b));

  if (sorted.length > 0) {
    return sorted.slice(0, 4).map(b => `• ${b}`).join('\n');
  }

  const fallback = lines
    .filter(l => !/^#{1,6}\s/.test(l) && !/^https?:\/\//.test(l) && !/^[-_=*]{3,}$/.test(l))
    .map(clean)
    .filter(l => l.length >= 20)
    .slice(0, 3);

  return fallback.length > 0
    ? fallback.map(l => `• ${l}`).join('\n')
    : '• No notable changes listed.';
}
