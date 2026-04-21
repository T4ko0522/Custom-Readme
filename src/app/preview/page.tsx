"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { TemplateMeta } from "@/templates/meta";

const STORAGE_KEY = "custom-readme:preview:v1";

type SavedState = {
  lastTemplate: string;
  paramsByTemplate: Record<string, Record<string, string>>;
  format: "svg" | "png";
};

function loadSavedState(): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as SavedState).lastTemplate === "string" &&
      (parsed as SavedState).paramsByTemplate &&
      typeof (parsed as SavedState).paramsByTemplate === "object" &&
      ((parsed as SavedState).format === "svg" ||
        (parsed as SavedState).format === "png")
    ) {
      return parsed as SavedState;
    }
  } catch {
    /* corrupted JSON → ignore */
  }
  return null;
}

function defaultParamsFor(tmpl: TemplateMeta): Record<string, string> {
  // ParamDef.default のみを初期値として使用（サンプル値の捏造はしない）。
  // multiline フィールドはシリアライズ形式の `|` を `\n` に戻して textarea 表示。
  const initial: Record<string, string> = {};
  for (const [key, def] of Object.entries(tmpl.params)) {
    if (def.default !== undefined && def.default !== "") {
      const raw = String(def.default);
      initial[key] = def.multiline ? raw.replace(/\|/g, "\n") : raw;
    }
  }
  return initial;
}

export default function PreviewPage() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [selected, setSelected] = useState<TemplateMeta | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [format, setFormat] = useState<"svg" | "png">("svg");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // hydrate が完了するまで localStorage への書き戻しを抑止（初期の空 state で保存を上書きしないため）
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data: TemplateMeta[]) => {
        setTemplates(data);
        if (data.length === 0) {
          setHydrated(true);
          return;
        }

        const saved = loadSavedState();
        if (saved) {
          const tmpl = data.find((t) => t.name === saved.lastTemplate);
          if (tmpl) {
            setSelected(tmpl);
            setParams(
              saved.paramsByTemplate[tmpl.name] ?? defaultParamsFor(tmpl),
            );
            setFormat(saved.format);
            setHydrated(true);
            return;
          }
        }
        // フォールバック：先頭テンプレートを default で選択
        const first = data[0];
        setSelected(first);
        setParams(defaultParamsFor(first));
        setHydrated(true);
      });
  }, []);

  // 状態変更のたびに localStorage へ保存（テンプレート毎に params を個別保持）
  useEffect(() => {
    if (!hydrated || !selected || typeof window === "undefined") return;
    const prev = loadSavedState();
    const next: SavedState = {
      lastTemplate: selected.name,
      paramsByTemplate: {
        ...(prev?.paramsByTemplate ?? {}),
        [selected.name]: params,
      },
      format,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota や disabled ストレージは無視 */
    }
  }, [hydrated, selected, params, format]);

  const selectTemplate = useCallback((tmpl: TemplateMeta) => {
    setSelected(tmpl);
    // そのテンプレートについて保存済みの入力があれば復元、無ければ default から生成
    const saved = loadSavedState();
    setParams(saved?.paramsByTemplate[tmpl.name] ?? defaultParamsFor(tmpl));
    setImageUrl(null);
  }, []);

  // 必須パラメータが全て埋まっているか
  const missingRequired = selected
    ? Object.entries(selected.params)
        .filter(([key, def]) => def.required && !params[key])
        .map(([key]) => key)
    : [];

  const canGenerate = selected !== null && missingRequired.length === 0;

  const handleGenerate = () => {
    if (!selected || !canGenerate) return;
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (!value) continue;
      const def = selected.params[key];
      // multiline フィールドは改行 → `|` に圧縮。連続改行は1つにまとめる
      const finalValue = def?.multiline
        ? value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).join("|")
        : value;
      if (finalValue) sp.set(key, finalValue);
    }
    sp.set("format", format);
    const url = `/api/${selected.name}?${sp.toString()}`;
    setImageUrl(url);
  };

  // button は href が指定されていれば Markdown 側でリンク化する
  const linkHref =
    selected?.name === "button" ? (params.href || "").trim() : "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const markdownSnippet = (() => {
    if (!imageUrl) return "";
    const img = `![${selected?.name}](${origin}${imageUrl})`;
    return linkHref ? `[${img}](${linkHref})` : img;
  })();

  const handleCopy = async () => {
    if (!markdownSnippet) return;
    await navigator.clipboard.writeText(markdownSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!selected) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "var(--text-muted)",
          fontFamily: "var(--font-display)",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
      {/* ===== Header ===== */}
      <header
        className="animate-fade"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 40,
          paddingBottom: 20,
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            href="/"
            style={{
              color: "var(--text-muted)",
              textDecoration: "none",
              fontSize: 14,
              transition: "color 0.2s",
            }}
          >
            &larr; Back
          </Link>
          <h1 className="heading-display" style={{ fontSize: 24 }}>
            <span className="gradient-text">Preview</span>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={format === "svg" ? "btn-primary" : "btn-secondary"}
            style={{ padding: "8px 18px", fontSize: 13 }}
            onClick={() => setFormat("svg")}
          >
            SVG
          </button>
          <button
            className={format === "png" ? "btn-primary" : "btn-secondary"}
            style={{ padding: "8px 18px", fontSize: 13 }}
            onClick={() => setFormat("png")}
          >
            PNG
          </button>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* ===== Left Panel: Controls ===== */}
        <aside className="animate-in delay-1">
          {/* テンプレート選択 */}
          <div style={{ marginBottom: 28 }}>
            <label
              className="section-label"
              style={{ marginBottom: 8, display: "block" }}
            >
              Template
            </label>
            <select
              className="input"
              value={selected.name}
              onChange={(e) => {
                const tmpl = templates.find((t) => t.name === e.target.value);
                if (tmpl) selectTemplate(tmpl);
              }}
            >
              {templates.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <p
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              {selected.description}
            </p>
          </div>

          {/* パラメータフォーム */}
          <div style={{ marginBottom: 20 }}>
            <label
              className="section-label"
              style={{ marginBottom: 12, display: "block" }}
            >
              Parameters
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {Object.entries(selected.params).map(([key, def]) => (
                <div key={key}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-mono)",
                      marginBottom: 6,
                    }}
                  >
                    {key}
                    {def.required && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "1px 6px",
                          background: "#f9731625",
                          color: "var(--accent-orange)",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        required
                      </span>
                    )}
                  </label>
                  {def.enum ? (
                    <select
                      className="input"
                      value={params[key] || ""}
                      onChange={(e) =>
                        setParams((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    >
                      {def.enum.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  ) : def.multiline ? (
                    <textarea
                      className="input"
                      rows={4}
                      placeholder={def.description}
                      value={params[key] || ""}
                      onChange={(e) =>
                        setParams((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      style={{
                        resize: "vertical",
                        minHeight: 88,
                        fontFamily: "var(--font-body)",
                        lineHeight: 1.5,
                      }}
                    />
                  ) : (
                    <input
                      className="input"
                      type={def.type === "number" ? "number" : "text"}
                      placeholder={def.description}
                      value={params[key] || ""}
                      onChange={(e) =>
                        setParams((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Generateボタン */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "14px 20px",
              opacity: canGenerate ? 1 : 0.4,
              cursor: canGenerate ? "pointer" : "not-allowed",
            }}
          >
            Generate
          </button>
          {!canGenerate && (
            <p
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "var(--text-muted)",
                textAlign: "center",
                fontFamily: "var(--font-mono)",
              }}
            >
              Required:{" "}
              <span style={{ color: "var(--accent-orange)" }}>
                {missingRequired.join(", ")}
              </span>
            </p>
          )}
        </aside>

        {/* ===== Right Panel: Preview & Output ===== */}
        <div className="animate-in delay-2">
          {/* Image Preview */}
          <div
            className="card"
            style={{
              padding: 24,
              marginBottom: 24,
            }}
          >
            <div className="section-label" style={{ marginBottom: 12 }}>
              Preview
            </div>
            <div
              style={{
                background: "var(--bg-deep)",
                borderRadius: "var(--radius-md)",
                padding: 20,
                display: "flex",
                justifyContent: "center",
                overflow: "auto",
                minHeight: 200,
                alignItems: "center",
              }}
            >
              {imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={imageUrl}
                  alt="Preview"
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "var(--radius-sm)",
                  }}
                />
              ) : (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 14,
                    fontFamily: "var(--font-mono)",
                    textAlign: "center",
                    padding: "40px 0",
                    lineHeight: 1.8,
                  }}
                >
                  パラメータを入力し
                  <br />
                  <span style={{ color: "var(--accent-orange)" }}>
                    Generate
                  </span>{" "}
                  ボタンをクリックしてください
                </div>
              )}
            </div>
          </div>

          {/* Markdown Output */}
          <div className="card" style={{ padding: 24 }}>
            <div className="section-label" style={{ marginBottom: 12 }}>
              Markdown
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "stretch",
              }}
            >
              <code
                className="code-block"
                style={{
                  flex: 1,
                  margin: 0,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  color: markdownSnippet ? undefined : "var(--text-muted)",
                }}
              >
                {markdownSnippet || "—"}
              </code>
              <button
                className="btn-primary"
                style={{
                  padding: "12px 20px",
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  opacity: markdownSnippet ? 1 : 0.4,
                  cursor: markdownSnippet ? "pointer" : "not-allowed",
                }}
                onClick={handleCopy}
                disabled={!markdownSnippet}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Direct URL */}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Direct URL:
            </span>
            {imageUrl ? (
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12,
                  color: "var(--accent-amber)",
                  fontFamily: "var(--font-mono)",
                  textDecoration: "none",
                  wordBreak: "break-all",
                }}
              >
                {imageUrl}
              </a>
            ) : (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                —
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
