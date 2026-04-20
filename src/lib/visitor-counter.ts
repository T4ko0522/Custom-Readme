import { Redis } from "@upstash/redis";

// ============================================================
// Upstash Redis クライアント（Edge ランタイムで REST 経由アクセス）
//
// 環境変数が未設定でもテンプレート全体は動作させたいので、クライアント
// 取得は Nullable。呼び出し側は null を「カウンタ無効」として扱う。
// ============================================================

let client: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!client) client = new Redis({ url, token });
  return client;
}

const KEY_PREFIX = "visitors:";

/**
 * username ごとの訪問者カウンタを +1 して最新値を返す。
 * Redis 未設定または失敗時は null を返し、呼び出し側で表示を省略する。
 */
export async function incrementVisitors(
  username: string,
): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${KEY_PREFIX}${username.toLowerCase()}`;
  try {
    const value = await redis.incr(key);
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
}

/**
 * username の現在の訪問者数を取得する（INCR しない）。
 * 画像レンダー側はキャッシュされうるので読み取り専用、INCR はビーコン経路で行う。
 * キー未作成時は 0、Redis 未設定または失敗時は null。
 */
export async function getVisitors(username: string): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${KEY_PREFIX}${username.toLowerCase()}`;
  try {
    const value = await redis.get<number | string | null>(key);
    if (value === null || value === undefined) return 0;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return null;
  }
}
