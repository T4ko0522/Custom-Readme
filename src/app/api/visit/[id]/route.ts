import { incrementVisitors } from "@/lib/visitor-counter";

export const runtime = "edge";

// 43 バイトの 1x1 透明 GIF。トラッキングピクセル用の最小 GIF。
const PIXEL_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

const NO_STORE_HEADERS = {
  "Content-Type": "image/gif",
  "Content-Length": String(PIXEL_GIF.byteLength),
  // GitHub Camo / CDN / ブラウザすべてで毎回 origin を叩かせる
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, private",
  Pragma: "no-cache",
  Expires: "0",
};

/** id のサニタイズ：Redis キーに使える範囲の安全な文字だけに絞る */
function sanitizeId(raw: string): string | null {
  const trimmed = decodeURIComponent(raw).trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.length > 64) return null;
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(trimmed)) return null;
  return trimmed;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const safeId = sanitizeId(id);
  if (safeId) {
    // 結果は待つが失敗しても画像は返す（可観測性より配信優先）
    await incrementVisitors(safeId).catch(() => null);
  }
  return new Response(PIXEL_GIF, { status: 200, headers: NO_STORE_HEADERS });
}
