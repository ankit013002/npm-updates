export interface SubscribedPackage {
  name: string;
  lastSeenVersion: string;
  addedAt: string;
}

export interface NpmPackageData {
  name: string;
  description: string;
  latestVersion: string;
  repositoryUrl: string | null;
  versions: string[];
  homepage: string | null;
}

export interface GitHubRelease {
  tagName: string;
  name: string;
  body: string;
  publishedAt: string;
  url: string;
}

export interface SummarySettings {
  claudeApiKey: string;
}
