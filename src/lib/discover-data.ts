export interface TrendingPackage {
  name: string;
  description: string;
  weekly: number;
  delta: number;
  spark: number[];
}

export interface Collection {
  id: string;
  title: string;
  blurb: string;
  accent: string;
  packages: string[];
}

export interface RecommendedPackage {
  name: string;
  reason: string;
  weekly: number;
  description: string;
}

export interface Category {
  id: string;
  label: string;
  count: number;
  hue: number;
}

export interface SpotlightPackage {
  name: string;
  tagline: string;
  description: string;
  version: string;
  weekly: number;
  growth: string;
  by: string;
}

export interface ActivityItem {
  who: string;
  action: string;
  what: string;
  when: string;
}

export const TRENDING: TrendingPackage[] = [
  { name: 'drizzle-orm',    description: 'TypeScript ORM that feels like writing SQL.',                  weekly: 480_000,   delta: 38, spark: [12,18,16,22,28,30,42] },
  { name: 'hono',           description: 'Ultrafast web framework for the edges.',                       weekly: 420_000,   delta: 64, spark: [8,9,12,18,22,28,34] },
  { name: 'lucide-react',   description: 'Beautifully crafted open-source icons.',                       weekly: 1_900_000, delta: 12, spark: [40,42,44,48,50,55,58] },
  { name: 'shadcn',         description: 'Copy-paste components built on Radix + Tailwind.',             weekly: 920_000,   delta: 87, spark: [10,15,22,30,40,52,68] },
  { name: 'zustand',        description: 'Bear-necessities state management for React.',                 weekly: 5_100_000, delta: 9,  spark: [50,52,55,58,60,62,64] },
  { name: 'trpc',           description: 'End-to-end typesafe APIs without schemas.',                    weekly: 1_200_000, delta: 21, spark: [30,32,30,35,38,42,46] },
  { name: 'biome',          description: 'One toolchain for your web project — format, lint, bundle.',   weekly: 380_000,   delta: 45, spark: [6,9,12,16,20,28,36] },
  { name: 'valibot',        description: 'Modular and type-safe schema library, ~1KB.',                  weekly: 240_000,   delta: 52, spark: [4,6,9,14,20,26,32] },
];

export const COLLECTIONS: Collection[] = [
  {
    id: 'vercel',
    title: 'The Vercel stack',
    blurb: 'What modern Next.js apps actually ship with.',
    accent: 'oklch(70% 0.18 240)',
    packages: ['next', 'react', '@vercel/analytics', 'tailwindcss', 'geist'],
  },
  {
    id: 'ship-today',
    title: 'Ship an app today',
    blurb: 'Auth, DB, payments, and UI — opinionated picks.',
    accent: 'oklch(72% 0.17 160)',
    packages: ['next-auth', 'drizzle-orm', 'stripe', 'shadcn', 'zod'],
  },
  {
    id: 'ai-toolkit',
    title: 'AI toolkit',
    blurb: 'Building LLM apps without the spaghetti.',
    accent: 'oklch(70% 0.19 300)',
    packages: ['@anthropic-ai/sdk', 'ai', 'langchain', 'tiktoken', 'zod'],
  },
  {
    id: 'data-layer',
    title: 'Headless data layer',
    blurb: 'Cache, fetch, and mutate — typed end to end.',
    accent: 'oklch(72% 0.16 60)',
    packages: ['@tanstack/react-query', 'trpc', 'zod', 'ky', 'msw'],
  },
];

export const RECOMMENDED: RecommendedPackage[] = [
  { name: 'react-router-dom', reason: 'tracks react',         weekly: 12_400_000, description: 'Declarative routing for React.' },
  { name: 'react-hook-form',  reason: 'tracks react',         weekly: 8_900_000,  description: 'Performant React form library.' },
  { name: 'swr',              reason: 'tracks @tanstack/...', weekly: 4_300_000,  description: 'React hooks for data fetching.' },
  { name: 'valibot',          reason: 'tracks zod',           weekly: 240_000,    description: 'Modular ~1KB schema validation.' },
  { name: 'vitest',           reason: 'tracks vite',          weekly: 7_800_000,  description: 'Blazing fast unit-test framework.' },
  { name: 'framer-motion-3d', reason: 'tracks framer-motion', weekly: 110_000,    description: '3D primitives for Framer Motion.' },
];

export const CATEGORIES: Category[] = [
  { id: 'framework', label: 'Frameworks',         count: 124, hue: 240 },
  { id: 'state',     label: 'State management',   count: 86,  hue: 200 },
  { id: 'forms',     label: 'Forms & validation', count: 64,  hue: 160 },
  { id: 'ui',        label: 'UI & components',    count: 312, hue: 280 },
  { id: 'icons',     label: 'Icons',              count: 42,  hue: 32  },
  { id: 'data',      label: 'Data fetching',      count: 78,  hue: 12  },
  { id: 'db',        label: 'Database & ORM',     count: 56,  hue: 100 },
  { id: 'tooling',   label: 'Build tooling',      count: 91,  hue: 60  },
  { id: 'testing',   label: 'Testing',            count: 54,  hue: 320 },
  { id: 'ai',        label: 'AI / LLM',           count: 38,  hue: 290 },
  { id: 'auth',      label: 'Auth',               count: 28,  hue: 220 },
  { id: 'date',      label: 'Date & time',        count: 19,  hue: 180 },
];

export const SPOTLIGHT: SpotlightPackage = {
  name: '@anthropic-ai/sdk',
  tagline: 'Official SDK for the Anthropic API',
  description:
    'Type-safe TypeScript bindings for Claude. Streaming, tool use, vision, and prompt caching out of the box.',
  version: '0.24.3',
  weekly: 580_000,
  growth: '+128% MoM',
  by: 'anthropics',
};

export const ACTIVITY: ActivityItem[] = [
  { who: 'you',      action: 'started tracking', what: 'drizzle-orm',    when: '12m' },
  { who: 'vercel',   action: 'released',          what: 'next v14.2.3',   when: '2h'  },
  { who: 'you',      action: 'marked seen',        what: 'react v18.3.1',  when: '1d'  },
  { who: 'facebook', action: 'released',          what: 'react v18.3.1',  when: '2d'  },
  { who: 'you',      action: 'imported',           what: '8 packages',     when: '3d'  },
];

export function formatDownloads(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}
