/**
 * GitHub API クライアント
 *
 * PAT は環境変数 GITHUB_PAT から読み込む。
 * PAT が設定されていればGraphQLで効率的に取得、未設定時はREST APIで代替（public限定・低レート）。
 *
 * プライベートリポジトリ:
 *   PAT の `repo` スコープがあれば、GraphQL の user.repositories は
 *   privacy 指定なしで public / private 両方を返却する（認証済みのため）。
 */

const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const REST_ENDPOINT = "https://api.github.com";

/** 大きな数値を短縮表記に変換 (1234 → "1.2k") */
export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export class GitHubError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

function getAuthHeaders(): Record<string, string> {
  const pat = process.env.GITHUB_PAT;
  const headers: Record<string, string> = {
    "User-Agent": "Custom-Readme",
    Accept: "application/vnd.github+json",
  };
  if (pat) {
    headers.Authorization = `Bearer ${pat}`;
  }
  return headers;
}

async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  if (!process.env.GITHUB_PAT) {
    throw new GitHubError(
      "GraphQL APIには GITHUB_PAT の設定が必要です",
      401,
    );
  }

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new GitHubError(
      `GitHub APIエラー: ${res.status} ${res.statusText}`,
      res.status,
    );
  }

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new GitHubError(json.errors.map((e) => e.message).join(", "));
  }
  if (!json.data) {
    throw new GitHubError("データが返却されませんでした");
  }
  return json.data;
}

async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${REST_ENDPOINT}${path}`, {
    headers: getAuthHeaders(),
  });

  if (res.status === 404) {
    throw new GitHubError("リソースが見つかりません", 404);
  }
  if (res.status === 403) {
    throw new GitHubError("レート制限に達しました。PATを設定してください", 403);
  }
  if (!res.ok) {
    throw new GitHubError(
      `GitHub APIエラー: ${res.status} ${res.statusText}`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

// ============================================================
// User Stats
// ============================================================

export type RankLevel =
  | "S"
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C";

export type Rank = {
  level: RankLevel;
  /** 0 に近いほど上位。anuraghazra/github-readme-stats と同じ定義（top X%） */
  percentile: number;
};

export type UserStats = {
  login: string;
  name: string | null;
  avatarUrl: string;
  totalStars: number;
  totalRepos: number;
  followers: number;
  following: number;
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  totalReviews: number;
  totalContributions: number;
  rank: Rank;
};

// ============================================================
// Rank calculation
// 参考: github-readme-stats / src/calculateRank.js
// https://github.com/anuraghazra/github-readme-stats
// ============================================================

/** 指数分布 CDF（高頻度な指標に使用。commits / prs / issues / reviews） */
const exponentialCdf = (x: number): number => 1 - Math.pow(2, -x);
/** 対数正規分布 CDF の近似（稀少性の高い指標に使用。stars / followers） */
const logNormalCdf = (x: number): number => x / (1 + x);

const RANK_THRESHOLDS = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100] as const;
const RANK_LEVELS: readonly RankLevel[] = [
  "S",
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
];

export function calculateRank(input: {
  all_commits: boolean;
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
  stars: number;
  followers: number;
}): Rank {
  const COMMITS_MEDIAN = input.all_commits ? 1000 : 250;
  const COMMITS_WEIGHT = 2;
  const PRS_MEDIAN = 50;
  const PRS_WEIGHT = 3;
  const ISSUES_MEDIAN = 25;
  const ISSUES_WEIGHT = 1;
  const REVIEWS_MEDIAN = 2;
  const REVIEWS_WEIGHT = 1;
  const STARS_MEDIAN = 50;
  const STARS_WEIGHT = 4;
  const FOLLOWERS_MEDIAN = 10;
  const FOLLOWERS_WEIGHT = 1;

  const TOTAL_WEIGHT =
    COMMITS_WEIGHT +
    PRS_WEIGHT +
    ISSUES_WEIGHT +
    REVIEWS_WEIGHT +
    STARS_WEIGHT +
    FOLLOWERS_WEIGHT;

  const rank =
    1 -
    (COMMITS_WEIGHT * exponentialCdf(input.commits / COMMITS_MEDIAN) +
      PRS_WEIGHT * exponentialCdf(input.prs / PRS_MEDIAN) +
      ISSUES_WEIGHT * exponentialCdf(input.issues / ISSUES_MEDIAN) +
      REVIEWS_WEIGHT * exponentialCdf(input.reviews / REVIEWS_MEDIAN) +
      STARS_WEIGHT * logNormalCdf(input.stars / STARS_MEDIAN) +
      FOLLOWERS_WEIGHT * logNormalCdf(input.followers / FOLLOWERS_MEDIAN)) /
      TOTAL_WEIGHT;

  const percentile = Math.max(0, Math.min(100, rank * 100));
  const idx = RANK_THRESHOLDS.findIndex((t) => percentile <= t);
  const level = RANK_LEVELS[idx >= 0 ? idx : RANK_LEVELS.length - 1];

  return { level, percentile };
}

const USER_STATS_QUERY = /* GraphQL */ `
  query ($username: String!) {
    user(login: $username) {
      login
      name
      avatarUrl
      followers { totalCount }
      following { totalCount }
      contributionsCollection {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        restrictedContributionsCount
      }
      pullRequests { totalCount }
      issues { totalCount }
      repositories(
        first: 100
        ownerAffiliations: OWNER
        orderBy: { field: STARGAZERS, direction: DESC }
      ) {
        totalCount
        nodes {
          stargazerCount
        }
      }
    }
  }
`;

type UserStatsGraphQL = {
  user: {
    login: string;
    name: string | null;
    avatarUrl: string;
    followers: { totalCount: number };
    following: { totalCount: number };
    contributionsCollection: {
      totalCommitContributions: number;
      totalIssueContributions: number;
      totalPullRequestContributions: number;
      totalPullRequestReviewContributions: number;
      restrictedContributionsCount: number;
    };
    pullRequests: { totalCount: number };
    issues: { totalCount: number };
    repositories: {
      totalCount: number;
      nodes: { stargazerCount: number }[];
    };
  } | null;
};

export async function fetchUserStats(
  username: string,
  options: { includeAllCommits?: boolean } = {},
): Promise<UserStats> {
  const { includeAllCommits = false } = options;

  if (process.env.GITHUB_PAT) {
    const data = await graphql<UserStatsGraphQL>(USER_STATS_QUERY, { username });
    if (!data.user) {
      throw new GitHubError(`ユーザー "${username}" が見つかりません`, 404);
    }
    const u = data.user;
    const totalStars = u.repositories.nodes.reduce(
      (sum, r) => sum + r.stargazerCount,
      0,
    );
    const totalCommits =
      u.contributionsCollection.totalCommitContributions +
      u.contributionsCollection.restrictedContributionsCount;
    const totalPRs = u.pullRequests.totalCount;
    const totalIssues = u.issues.totalCount;
    const totalReviews =
      u.contributionsCollection.totalPullRequestReviewContributions;
    const followers = u.followers.totalCount;

    const rank = calculateRank({
      all_commits: includeAllCommits,
      commits: totalCommits,
      prs: totalPRs,
      issues: totalIssues,
      reviews: totalReviews,
      stars: totalStars,
      followers,
    });

    return {
      login: u.login,
      name: u.name,
      avatarUrl: u.avatarUrl,
      totalStars,
      totalRepos: u.repositories.totalCount,
      followers,
      following: u.following.totalCount,
      totalCommits,
      totalPRs,
      totalIssues,
      totalReviews,
      totalContributions:
        u.contributionsCollection.totalCommitContributions +
        u.contributionsCollection.totalIssueContributions +
        u.contributionsCollection.totalPullRequestContributions,
      rank,
    };
  }

  // PAT未設定時: REST APIでの簡易取得（public only, 正確なcommit/PR合計は不可）
  type UserRest = {
    login: string;
    name: string | null;
    avatar_url: string;
    public_repos: number;
    followers: number;
    following: number;
  };
  const u = await rest<UserRest>(`/users/${username}`);

  type RepoRest = { stargazers_count: number };
  const repos = await rest<RepoRest[]>(
    `/users/${username}/repos?per_page=100&type=owner`,
  );
  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

  // commits/PRs/issues/reviews は REST では集計困難なため 0 として rank 計算
  const rank = calculateRank({
    all_commits: includeAllCommits,
    commits: 0,
    prs: 0,
    issues: 0,
    reviews: 0,
    stars: totalStars,
    followers: u.followers,
  });

  return {
    login: u.login,
    name: u.name,
    avatarUrl: u.avatar_url,
    totalStars,
    totalRepos: u.public_repos,
    followers: u.followers,
    following: u.following,
    totalCommits: 0,
    totalPRs: 0,
    totalIssues: 0,
    totalReviews: 0,
    totalContributions: 0,
    rank,
  };
}

// ============================================================
// Top Languages (public + private 両方を集計)
// ============================================================

export type LanguageStat = {
  name: string;
  color: string;
  size: number;
  percentage: number;
};

/**
 * ページング対応のGraphQLクエリ。
 * privacy 指定なし → 認証済みなら public / private 両方返却。
 * isFork: false → フォーク除外。
 * ownerAffiliations: OWNER → 自分が所有するリポジトリのみ。
 */
const TOP_LANGUAGES_QUERY = /* GraphQL */ `
  query ($username: String!, $after: String) {
    user(login: $username) {
      repositories(
        first: 100
        after: $after
        ownerAffiliations: OWNER
        isFork: false
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
        nodes {
          name
          isPrivate
          languages(first: 20, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }
    }
  }
`;

type RepoNode = {
  name: string;
  isPrivate: boolean;
  languages: {
    edges: {
      size: number;
      node: { name: string; color: string | null };
    }[];
  };
};

type TopLanguagesGraphQL = {
  user: {
    repositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      totalCount: number;
      nodes: RepoNode[];
    };
  } | null;
};

/** ユーザーの所有するリポジトリ全件を取得（最大5ページ＝500件まで） */
async function fetchAllOwnedRepos(username: string): Promise<RepoNode[]> {
  const MAX_PAGES = 5;
  const all: RepoNode[] = [];
  let after: string | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data: TopLanguagesGraphQL = await graphql<TopLanguagesGraphQL>(
      TOP_LANGUAGES_QUERY,
      { username, after },
    );
    if (!data.user) {
      throw new GitHubError(`ユーザー "${username}" が見つかりません`, 404);
    }
    all.push(...data.user.repositories.nodes);
    if (!data.user.repositories.pageInfo.hasNextPage) break;
    after = data.user.repositories.pageInfo.endCursor;
  }

  return all;
}

export async function fetchTopLanguages(
  username: string,
  limit: number = 6,
): Promise<LanguageStat[]> {
  if (!process.env.GITHUB_PAT) {
    throw new GitHubError(
      "top-languages テンプレートには GITHUB_PAT の設定が必要です",
      401,
    );
  }

  const repos = await fetchAllOwnedRepos(username);

  // 言語ごとにサイズを集計（public / private 問わず全リポジトリ）
  const agg = new Map<string, { size: number; color: string }>();
  for (const repo of repos) {
    for (const edge of repo.languages.edges) {
      const existing = agg.get(edge.node.name);
      if (existing) {
        existing.size += edge.size;
      } else {
        agg.set(edge.node.name, {
          size: edge.size,
          color: edge.node.color ?? "#8b949e",
        });
      }
    }
  }

  const total = Array.from(agg.values()).reduce((sum, v) => sum + v.size, 0);
  if (total === 0) {
    return [];
  }

  return Array.from(agg.entries())
    .map(([name, v]) => ({
      name,
      color: v.color,
      size: v.size,
      percentage: (v.size / total) * 100,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, limit);
}
