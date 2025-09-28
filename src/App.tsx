import React, { useMemo, useState } from "react";
import "./index.css";

// ---------- Types ----------
type Prompt = {
  id: string;
  title: string;
  category?: string;
  keywords?: string[];
  body: string;
};

// ---------- Data import (Vite JSON import) ----------
import rawPrompts from "./data/prompts.json";

// ---------- Helpers ----------
const toKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/\u00A0/g, " ")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Recognize placeholders in multiple styles
const PH_PATTERNS: RegExp[] = [
  /\[(.+?)\]/g, // [city]
  /\{\{(.+?)\}\}/g, // {{city}}
  /\{(.+?)\}/g, // {city}
  /<(.+?)>/g, // <city>
  /\((.+?)\)/g, // (city)
];

// Aliases so simple fields map to compound placeholders
const ALIASES: Record<string, string[]> = {
  "number of bedrooms": ["bedrooms", "beds"],
  "number of bathrooms": ["bathrooms", "baths"],
  "unique selling points": ["key features", "features"],
  "property type": ["type", "ptype"],
  "neighbourhood": ["neighborhood"],
  "neighbourhood characteristics": ["neighborhood characteristics"],
  "city/town": ["city"],
  "year built": ["built year", "yr built"],
  "hoa fee": ["hoa", "hoa fees"],
  "hoa fees": ["hoa fee", "hoa"],
};

// Expand user vars to cover aliases both ways
function buildExpandedVars(vars: Record<string, string>) {
  const base: Record<string, string> = {};
  for (const k of Object.keys(vars)) {
    const v = String(vars[k] ?? "").trim();
    if (!v) continue;
    base[toKey(k)] = v;
  }
  // alias -> canon
  for (const canon of Object.keys(ALIASES)) {
    const ck = toKey(canon);
    if (!base[ck]) {
      for (const alt of ALIASES[canon]) {
        const v = base[toKey(alt)];
        if (v) {
          base[ck] = v;
          break;
        }
      }
    }
  }
  // canon -> alias
  for (const canon of Object.keys(ALIASES)) {
    const ck = toKey(canon);
    const v = base[ck];
    if (v) {
      for (const alt of ALIASES[canon]) {
        const ak = toKey(alt);
        if (!base[ak]) base[ak] = v;
      }
    }
  }
  return base;
}

// Fill placeholders across all supported delimiters + “number of …” pattern
function fillAcrossDelimiters(body: string, expanded: Record<string, string>) {
  let out = body;
  for (const re of PH_PATTERNS) {
    out = out.replace(re, (_, raw) => {
      const k = toKey(raw);
      return expanded[k] ? expanded[k] : `[${raw}]`;
    });
  }
  // Special case: [number of X]
  out = out.replace(/\[(number of .+?)\]/gi, (_, raw) => {
    const m = /^number of (.+)$/i.exec(raw);
    if (!m) return `[${raw}]`;
    const base = toKey(m[1]);
    const tries = [base, base.replace(/s\b/, ""), base.replace(/s\b/, "") + "s"];
    for (const t of tries) if (expanded[t]) return expanded[t];
    return `[${raw}]`;
  });
  return out;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

async function safeCopy(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ---------- Component ----------
export default function App() {
  // Normalize prompts from JSON
  const prompts: Prompt[] = useMemo(() => {
    const arr = (rawPrompts as any[]) || [];
    return arr.map((p, i) => ({
      id: String(p.id ?? i),
      title: p.title ?? `Untitled #${i + 1}`,
      category: p.category ?? "Other",
      keywords: Array.isArray(p.keywords) ? p.keywords : [],
      body: p.body ?? p.text ?? p.prompt ?? "",
    }));
  }, []);

  const [search, setSearch] = useState("");
  const [vars, setVars] = useState<Record<string, string>>({
    "property type": "",
    address: "",
    city: "Miami",
    neighborhood: "",
    bedrooms: "3",
    bathrooms: "2",
    sqft: "",
    price: "",
    "hoa fee": "",
    "year built": "",
    "lot size": "",
    "school district": "",
    "key features": "ocean views, smart-home, chef’s kitchen",
    "neighborhood characteristics": "",
    "lifestyle benefits": "",
    "word count": "170",
    date: "",
    "start time": "",
    "end time": "",
    "lead source": "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return prompts;
    return prompts.filter((p) => {
      const hay = (p.title + "\n" + p.body + "\n" + (p.keywords || []).join(" ")).toLowerCase();
      return hay.includes(q);
    });
  }, [prompts, search]);

  const labels: string[] = [
    "property type","address","city","neighborhood","bedrooms","bathrooms","sqft","price",
    "hoa fee","year built","lot size","school district","key features",
    "neighborhood characteristics","lifestyle benefits","word count","date","start time","end time","lead source",
  ];

  return (
    <div className="__brts__root">
      {/* Scoped styles to keep things tidy and consistent */}
      <style>{`
        .__brts__root{max-width:1200px;margin:0 auto;padding:16px;color:#fff}
        .__brts__header{padding:20px 0}
        .__brts__title{margin:0;font-weight:800;line-height:1.1}
        .__brts__sub{opacity:.7}
        .__brts__row{display:grid;grid-template-columns:340px 1fr;gap:16px;align-items:start}
        @media (max-width:980px){.__brts__row{grid-template-columns:1fr}}
        .__card{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);backdrop-filter:blur(8px);border-radius:16px;padding:16px}
        .__card h3{margin:.25rem 0 .5rem 0}
        .__inputs{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .__inputs label{font-size:12px;opacity:.75}
        .__inputs input{
          width:100%;margin-top:4px;border-radius:10px;border:1px solid rgba(255,255,255,.18);
          background:#0b0f17;color:#fff;padding:8px 10px;outline:none
        }
        .__search input{
          width:100%;margin-top:6px;border-radius:10px;border:1px solid rgba(255,255,255,.18);
          background:#0b0f17;color:#fff;padding:8px 10px;outline:none
        }
        .__muted{opacity:.7;font-size:12px}
        .__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        @media (max-width:1200px){.__grid{grid-template-columns:repeat(2,1fr)}}
        @media (max-width:700px){.__grid{grid-template-columns:1fr}}
        .__pCard{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:16px;padding:16px}
        .__pHead{display:flex;justify-content:space-between;gap:8px}
        .__cat{font-size:11px;text-transform:uppercase;opacity:.7}
        .__pTitle{margin:6px 0 0 0}
        .__btn{padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.22);background:#fff;color:#000;font-weight:700;cursor:pointer}
        .__btn.secondary{background:transparent;color:#fff}
        .__chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
        .__chip{padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.10);font-size:11px}
      `}</style>

      {/* Header */}
      <header className="__brts__header">
        <h1 className="__brts__title">Busy Realtors Time Saviour</h1>
        <div className="__brts__sub">Interactive Prompt Finder — Premium layout</div>
      </header>

      {/* Top row: Listing details + Search */}
      <div className="__brts__row">
        {/* Listing Details (NO “Apply info” here anymore) */}
        <aside className="__card">
          <h3>Listing Details</h3>
          <div className="__inputs">
            {labels.map((label) => {
              const id = "f_" + label.replace(/\s+/g, "_");
              return (
                <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                  <label htmlFor={id}>[{label}]</label>
                  <input
                    id={id}
                    value={vars[label] ?? ""}
                    onChange={(e) => setVars((v) => ({ ...v, [label]: e.target.value }))}
                  />
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
            <button
              className="__btn secondary"
              onClick={() => setVars((v) => Object.fromEntries(Object.keys(v).map((k) => [k, ""])) as any)}
            >
              Clear
            </button>
          </div>
        </aside>

        {/* Search box */}
        <section>
          <div className="__card __search">
            <label>Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles, bodies, keywords…"
            />
            <div className="__muted" style={{ marginTop: 6 }}>
              Showing: {filtered.length} / {prompts.length}
            </div>
          </div>
        </section>
      </div>

      {/* Prompt grid */}
      <section style={{ marginTop: 16 }}>
        <div className="__grid">
          {filtered.map((p) => {
            const [filled, setFilled] = useState<string | null>(null);
            const body = p.body;
            const current = filled ?? body;

            return (
              <div key={p.id} className="__pCard">
                <div className="__pHead">
                  <div>
                    <div className="__cat">{p.category || "Other"}</div>
                    <h4 className="__pTitle">{p.title}</h4>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="__btn"
                      onClick={() => {
                        const expanded = buildExpandedVars(vars);
                        const next = fillAcrossDelimiters(body, expanded);
                        setFilled(next);
                      }}
                    >
                      Insert Listing Details
                    </button>
                    <button
                      className="__btn"
                      onClick={async () => {
                        const ok = await safeCopy(current);
                        if (!ok) alert("Copied text selected. If blocked, use Ctrl/Cmd+C.");
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div
                  style={{ marginTop: 10 }}
                  dangerouslySetInnerHTML={{ __html: escapeHtml(current) }}
                />

                {!!(p.keywords && p.keywords.length) && (
                  <div className="__chips">
                    {p.keywords!.map((k) => (
                      <span key={k} className="__chip">#{k}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <footer style={{ padding: "24px 0", opacity: 0.7, fontSize: 12 }}>
        © {new Date().getFullYear()} Busy Realtors Time Saviour — React build
      </footer>
    </div>
  );
}
