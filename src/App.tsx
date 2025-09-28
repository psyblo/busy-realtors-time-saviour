import React, { useEffect, useMemo, useState } from "react";

// Types
type Prompt = {
  id: string;
  title: string;
  category?: string;
  keywords?: string[];
  body: string; // or text/prompt in your json – we normalize below
};

// Import prompts.json at build-time (Vite supports JSON imports)
import rawPrompts from "./data/prompts.json";

// Utilities
const toKey = (s: string) =>
  s.toLowerCase().replace(/\u00A0/g, " ").replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim();

const PH_PATTERNS = [
  /\[(.+?)\]/g, // [city]
  /\{\{(.+?)\}\}/g, // {{city}}
  /\{(.+?)\}/g, // {city}
  /<(.+?)>/g, // <city>
  /\((.+?)\)/g, // (city)
];

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

function buildExpandedVars(vars: Record<string, string>) {
  // canon normalize
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

function fillAcrossDelimiters(body: string, expanded: Record<string, string>) {
  let out = body;
  for (const re of PH_PATTERNS) {
    out = out.replace(re, (_, raw) => {
      const k = toKey(raw);
      return expanded[k] ? expanded[k] : `[${raw}]`;
    });
  }
  // special: [number of X]
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

// Clipboard helper with fallback
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

export default function App() {
  // Normalize imported prompts
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
  // Listing details values
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

  // Per-card render with Insert + Copy
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <header style={{ padding: "20px 0" }}>
        <h1>Busy Realtors Time Saviour</h1>
        <div style={{ opacity: 0.7 }}>Interactive Prompt Finder — React build</div>
      </header>

      {/* Top row: sidebar + search */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Listing Details */}
        <aside
          style={{
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(255,255,255,.06)",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <h3>Listing Details</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 8,
            }}
          >
            {[
              "property type",
              "address",
              "city",
              "neighborhood",
              "bedrooms",
              "bathrooms",
              "sqft",
              "price",
              "hoa fee",
              "year built",
              "lot size",
              "school district",
              "key features",
              "neighborhood characteristics",
              "lifestyle benefits",
              "word count",
              "date",
              "start time",
              "end time",
              "lead source",
            ].map((label) => {
              const id = "f_" + label.replace(/\s+/g, "_");
              return (
                <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                  <label htmlFor={id} style={{ fontSize: 12, opacity: 0.7 }}>
                    [{label}]
                  </label>
                  <input
                    id={id}
                    value={vars[label] ?? ""}
                    onChange={(e) => setVars((v) => ({ ...v, [label]: e.target.value }))}
                    style={{
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.18)",
                      background: "#0b0f17",
                      color: "white",
                      padding: "8px 10px",
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button
              className="btn"
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.22)",
                background: "white",
                color: "black",
                fontWeight: 700,
                padding: "10px 14px",
                cursor: "pointer",
              }}
              onClick={() => {
                // no-op: per-card button does the insertion; this is here if you later want global apply
                alert("Use “Insert Listing Details” on each prompt card to insert values.");
              }}
            >
              Apply (info)
            </button>
            <button
              className="btn"
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.22)",
                background: "transparent",
                color: "white",
                padding: "10px 14px",
                cursor: "pointer",
              }}
              onClick={() => setVars((v) => Object.fromEntries(Object.keys(v).map((k) => [k, ""])) as any)}
            >
              Clear
            </button>
          </div>
        </aside>

        {/* Search + prompt list */}
        <section>
          <div
            style={{
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.06)",
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <label style={{ fontSize: 12, opacity: 0.7 }}>Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles, bodies, keywords…"
              style={{
                width: "100%",
                marginTop: 6,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.18)",
                background: "#0b0f17",
                color: "white",
                padding: "8px 10px",
              }}
            />
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
              Showing: {filtered.length} / {prompts.length}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
            }}
          >
            {filtered.map((p) => {
              const [filled, setFilled] = useState<string | null>(null);
              const body = p.body;
              const current = filled ?? body;

              return (
                <div
                  key={p.id}
                  style={{
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(255,255,255,.06)",
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.7 }}>
                        {p.category || "Other"}
                      </div>
                      <h4 style={{ margin: "6px 0 0 0" }}>{p.title}</h4>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="btn"
                        style={{ padding: "8px 10px", borderRadius: 10 }}
                        onClick={() => {
                          const expanded = buildExpandedVars(vars);
                          const next = fillAcrossDelimiters(body, expanded);
                          setFilled(next);
                        }}
                      >
                        Insert Listing Details
                      </button>
                      <button
                        className="btn"
                        style={{ padding: "8px 10px", borderRadius: 10 }}
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
                    className="p-body"
                    style={{ marginTop: 10 }}
                    dangerouslySetInnerHTML={{ __html: escapeHtml(current) }}
                  />

                  {!!(p.keywords && p.keywords.length) && (
                    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {p.keywords!.map((k) => (
                        <span
                          key={k}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,.12)",
                            background: "rgba(255,255,255,.10)",
                            fontSize: 11,
                          }}
                        >
                          #{k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <footer style={{ padding: "24px 0", opacity: 0.7, fontSize: 12 }}>
        © {new Date().getFullYear()} Busy Realtors Time Saviour — React build
      </footer>
    </div>
  );
}
