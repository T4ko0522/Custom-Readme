import Link from "next/link";

const templates = [
  {
    name: "profile-card",
    label: "Profile Card",
    desc: "挨拶・Bio・技術スタック・引用・リンクを一枚で表現する総合プロフィールカード",
    params:
      "name=T4ko0522&greeting=Hi+there!&bio=2008年大阪生まれ。|muclaseでエンジニアインターン中。|Contribution+Graphが黒い時はインフラ弄り中。&skills=js,ts,go,py,lua,bash|react,vue,nextjs,nuxtjs,tailwind,nodejs|linux,gcp,docker,kubernetes,postgres&quote=The+main+thing+is+to+be+yourself&theme=dark",
    badge: "Main",
    requiresPat: false,
  },
  {
    name: "github-stats",
    label: "GitHub Stats",
    desc: "スター合計・リポジトリ数・フォロワー・年間コミットを集計（private込み）",
    params: "username=T4ko0522&theme=dark",
    badge: "Live",
    requiresPat: true,
  },
  {
    name: "top-languages",
    label: "Top Languages",
    desc: "リポジトリで使われている言語の割合をバーチャートで表示（private込み）",
    params: "username=T4ko0522&theme=dark&limit=6",
    badge: "Live",
    requiresPat: true,
  },
];

export default function Home() {
  return (
    <main className="container" style={{ paddingBottom: 80 }}>
      {/* ===== Hero ===== */}
      <section
        style={{
          textAlign: "center",
          padding: "100px 0 72px",
          position: "relative",
        }}
      >
        <div
          className="animate-fade"
          style={{
            width: 48,
            height: 3,
            background: "var(--gradient-warm)",
            borderRadius: 2,
            margin: "0 auto 32px",
          }}
        />

        <h1
          className="heading-display animate-in delay-1"
          style={{ fontSize: "clamp(40px, 6vw, 64px)", marginBottom: 16 }}
        >
          <span className="gradient-text">Custom</span>{" "}
          <span style={{ color: "var(--text-primary)" }}>Readme</span>
        </h1>

        <p
          className="animate-in delay-2"
          style={{
            fontSize: 18,
            color: "var(--text-secondary)",
            maxWidth: 560,
            margin: "0 auto 20px",
            lineHeight: 1.7,
          }}
        >
          GitHub Profile README用の画像を動的に生成するAPI
          <br />
          アニメーションSVG・GitHub統計カードに対応
        </p>

        <div
          className="animate-in delay-3"
          style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
        >
          <span className="tag tag-accent">format=svg</span>
          <span className="tag">GitHub GraphQL</span>
          <span className="tag">Edge Runtime</span>
          <span className="tag">Private Repo対応</span>
        </div>

        <div
          className="animate-in delay-4"
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            marginTop: 40,
          }}
        >
          <Link href="/preview" className="btn-primary">
            Preview
          </Link>
          <a href="#templates" className="btn-secondary">
            Templates
          </a>
        </div>
      </section>

      {/* ===== Usage ===== */}
      <section className="section animate-in delay-5">
        <div className="section-label">Usage</div>
        <h2 className="section-title">使い方</h2>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: 20,
            maxWidth: 680,
          }}
        >
          READMEにMarkdown画像リンクを追加するだけ。
          <code
            style={{
              padding: "2px 6px",
              background: "var(--bg-elevated)",
              borderRadius: 4,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--accent-amber)",
            }}
          >
            format=svg
          </code>{" "}
          でアニメーションSVGを返却します。
        </p>
        <code className="code-block">
          {`![Stats](https://your-domain.vercel.app/api/github-stats?username=your-id&format=svg)`}
        </code>
      </section>

      {/* ===== Self Hosting Setup ===== */}
      <section className="section">
        <div className="section-label">Self-Hosting Setup</div>
        <h2 className="section-title">環境変数の設定</h2>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: 16,
            maxWidth: 680,
          }}
        >
          GitHub統計系テンプレート（
          <code
            style={{
              padding: "2px 6px",
              background: "var(--bg-elevated)",
              borderRadius: 4,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--accent-amber)",
            }}
          >
            Live
          </code>{" "}
          バッジ付き）とプライベートリポジトリ参照には、
          <strong style={{ color: "var(--text-primary)" }}>
            あなた自身のPAT
          </strong>
          を環境変数に設定する必要があります。
        </p>
        <div
          className="card"
          style={{ padding: 24, marginBottom: 16 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <span className="tag tag-accent" style={{ marginBottom: 8 }}>
                Step 1
              </span>
              <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent-amber)" }}
                >
                  github.com/settings/tokens
                </a>{" "}
                で Classic Token を発行。スコープは{" "}
                <code
                  style={{
                    padding: "2px 6px",
                    background: "var(--bg-elevated)",
                    borderRadius: 4,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--accent-amber)",
                  }}
                >
                  repo
                </code>{" "}
                と{" "}
                <code
                  style={{
                    padding: "2px 6px",
                    background: "var(--bg-elevated)",
                    borderRadius: 4,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--accent-amber)",
                  }}
                >
                  read:user
                </code>{" "}
                を選択。
              </p>
            </div>
            <div>
              <span className="tag tag-accent" style={{ marginBottom: 8 }}>
                Step 2
              </span>
              <p style={{ color: "var(--text-secondary)", marginTop: 8, marginBottom: 12 }}>
                ローカル開発:{" "}
                <code
                  style={{
                    padding: "2px 6px",
                    background: "var(--bg-elevated)",
                    borderRadius: 4,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--accent-amber)",
                  }}
                >
                  .env.local
                </code>{" "}
                を作成:
              </p>
              <code className="code-block" style={{ fontSize: 13 }}>
                GITHUB_PAT=ghp_your_token_here
              </code>
            </div>
            <div>
              <span className="tag tag-accent" style={{ marginBottom: 8 }}>
                Step 3
              </span>
              <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>
                Vercelデプロイ時は{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  Project Settings → Environment Variables
                </strong>{" "}
                に{" "}
                <code
                  style={{
                    padding: "2px 6px",
                    background: "var(--bg-elevated)",
                    borderRadius: 4,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--accent-amber)",
                  }}
                >
                  GITHUB_PAT
                </code>{" "}
                を追加。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Templates ===== */}
      <section className="section" id="templates">
        <div className="section-label animate-in">Templates</div>
        <h2 className="section-title animate-in delay-1">テンプレート一覧</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))",
            gap: 20,
          }}
        >
          {templates.map((t, i) => (
            <div
              key={t.name}
              className={`card animate-scale delay-${Math.min(i + 2, 6)}`}
              style={{ padding: 0 }}
            >
              <div
                style={{
                  padding: 20,
                  background: "var(--bg-deep)",
                  borderBottom: "1px solid var(--border-subtle)",
                  display: "flex",
                  justifyContent: "center",
                  overflow: "hidden",
                  borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
                  position: "relative",
                  minHeight: 140,
                  alignItems: "center",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/${t.name}?${t.params}&format=svg`}
                  alt={t.label}
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "var(--radius-sm)",
                  }}
                />
                <span
                  className={t.requiresPat ? "tag tag-accent" : "tag"}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    fontSize: 11,
                  }}
                >
                  {t.badge}
                </span>
              </div>

              <div style={{ padding: "20px 24px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    {t.label}
                  </h3>
                  {t.requiresPat && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        background: "#f9731618",
                        color: "var(--accent-orange)",
                        border: "1px solid #f9731640",
                        borderRadius: 999,
                        fontWeight: 700,
                        letterSpacing: 1,
                      }}
                    >
                      PAT
                    </span>
                  )}
                </div>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    marginBottom: 12,
                  }}
                >
                  {t.desc}
                </p>
                <code
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    wordBreak: "break-all",
                  }}
                >
                  /api/{t.name}
                </code>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Params ===== */}
      <section className="section">
        <div className="section-label">API Reference</div>
        <h2 className="section-title">共通パラメータ</h2>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>パラメータ</th>
                <th>説明</th>
                <th>デフォルト</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>format</code>
                </td>
                <td>
                  <code>png</code> または <code>svg</code>（アニメーション付き）
                </td>
                <td>png</td>
              </tr>
              <tr>
                <td>
                  <code>theme</code>
                </td>
                <td>
                  <code>dark</code> / <code>light</code> / <code>github</code>
                </td>
                <td>dark</td>
              </tr>
              <tr>
                <td>
                  <code>width</code>
                </td>
                <td>画像の幅（px）※PNG のみ</td>
                <td>テンプレートによる</td>
              </tr>
              <tr>
                <td>
                  <code>height</code>
                </td>
                <td>画像の高さ（px）※PNG のみ</td>
                <td>テンプレートによる</td>
              </tr>
              <tr>
                <td>
                  <code>fontLang</code>
                </td>
                <td>
                  <code>ja</code> で日本語フォントを読み込み ※PNG のみ
                </td>
                <td>en</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer
        style={{
          textAlign: "center",
          padding: "40px 0",
          borderTop: "1px solid var(--border-subtle)",
          color: "var(--text-muted)",
          fontSize: 13,
          fontFamily: "var(--font-mono)",
        }}
      >
        Built with Next.js + @vercel/og + GitHub GraphQL
      </footer>
    </main>
  );
}
