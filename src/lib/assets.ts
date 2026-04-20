// 静的アセットを Edge Function のバンドルに同梱すると 1MB 制限を超えるため、
// 同一オリジンから `public/` 配下のファイルをランタイム fetch して base64 化し、
// モジュールスコープでキャッシュする。

let cachedHiGif: string | null = null;
let pendingHiGif: Promise<string> | null = null;

/** 大きな Uint8Array を安全に base64 化（チャンク分割で stack overflow 回避） */
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * `public/Hi.gif` を data URI として返す。同一インスタンス内では 1 度だけ取得。
 * `origin` にはリクエスト URL の `new URL(request.url).origin` を渡す。
 */
export async function getHiGifDataUri(origin: string): Promise<string> {
  if (cachedHiGif) return cachedHiGif;
  if (pendingHiGif) return pendingHiGif;

  pendingHiGif = (async () => {
    const res = await fetch(`${origin}/Hi.gif`);
    if (!res.ok) {
      throw new Error(`Failed to fetch /Hi.gif: ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    const b64 = bytesToBase64(new Uint8Array(buf));
    cachedHiGif = `data:image/gif;base64,${b64}`;
    return cachedHiGif;
  })();

  try {
    return await pendingHiGif;
  } finally {
    pendingHiGif = null;
  }
}
