import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./index.css";

// ---------- Types ----------
type Prompt = {
  id: string;
  title: string;
  category?: string;
  keywords?: string[];
  body: string;
};

const LISTING_FIELDS = [
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
] as const;

type ListingField = (typeof LISTING_FIELDS)[number];

const DEFAULT_FIELD_VALUES: Record<ListingField, string> = {
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

const PH_PATTERNS: RegExp[] = [
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

// ---------- Small UI atoms ----------
function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`__chip ${active ? "__chip--active" : ""}`}
      title={label}
    >
      {label}
    </button>
  );
}

// ---------- Prompt Card ----------
function PromptCard({
  prompt,
  vars,
}: {
  prompt: Prompt;
  vars: Record<string, string>;
}) {
  const [filled, setFilled] = useState<string | null>(null);
  const expanded = useMemo(() => buildExpandedVars(vars), [vars]);
  const body = prompt.body;
  const current = filled ?? body;

  useEffect(() => {
    setFilled(null);
  }, [body, vars]);

  return (
    <div className="__pCard">
      <div className="__pHead">
        <div>
          <div className="__cat">{prompt.category || "Other"}</div>
          <h4 className="__pTitle">{prompt.title}</h4>
        </div>
        <div className="__btns">
          <button
            className="__btn"
            type="button"
            onClick={() => {
              const next = fillAcrossDelimiters(body, expanded);
              setFilled(next);
            }}
          >
            Insert Listing Details
          </button>
          <button
            className="__btn"
            type="button"
            onClick={async () => {
              const ok = await safeCopy(current);
              if (!ok)
                alert("Copied text selected. If blocked, use Ctrl/Cmd+C.");
            }}
          >
            Copy
          </button>
        </div>
      </div>

      <div
        className="__pBody"
        dangerouslySetInnerHTML={{ __html: escapeHtml(current) }}
      />

      {!!(prompt.keywords && prompt.keywords.length) && (
        <div className="__chipsRow">
          {prompt.keywords!.map((k) => (
            <span key={k} className="__chipTag">
              #{k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Main Component ----------
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

  // Build keyword universe grouped by category for richer UI
  const keywordGroups = useMemo(() => {
    const map = new Map<string, Set<string>>();
    prompts.forEach((p) => {
      const category = (p.category || "Other").trim() || "Other";
      if (!map.has(category)) {
        map.set(category, new Set());
      }
      (p.keywords || []).forEach((keyword) => {
        if (!keyword) return;
        map.get(category)!.add(keyword);
      });
    });
    return Array.from(map.entries())
      .map(([category, values]) => ({
        category,
        keywords: Array.from(values).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [prompts]);

  const keywordUniverse = useMemo(() => {
    const seen = new Set<string>();
    keywordGroups.forEach(({ keywords }) => {
      keywords.forEach((keyword) => {
        if (!seen.has(keyword)) {
          seen.add(keyword);
        }
      });
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [keywordGroups]);

  const [search, setSearch] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(
    () => new Set()
  );

  const [vars, setVars] = useState<Record<ListingField, string>>(
    () => ({ ...DEFAULT_FIELD_VALUES })
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prompts.filter((p) => {
      if (selectedKeywords.size > 0) {
        const hasAny = (p.keywords || []).some((k) => selectedKeywords.has(k));
        if (!hasAny) return false;
      }
      if (!q) return true;
      const hay = (p.title + "\n" + p.body + "\n" + (p.keywords || []).join(" ")).toLowerCase();
      return hay.includes(q);
    });
  }, [prompts, search, selectedKeywords]);

  const clearFields = useCallback(() => {
    setVars(() => ({ ...DEFAULT_FIELD_VALUES }));
  }, []);

  const handleFieldChange = useCallback(
    (key: ListingField, value: string) => {
      setVars((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const keywordList = useMemo(() => {
    const items = Array.from(selectedKeywords.values());
    return items.sort((a, b) => a.localeCompare(b));
  }, [selectedKeywords]);

  function toggleKeyword(k: string) {
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  return (
    <div className="__brts__root">
      {/* Header */}
      <header className="__header">
        <span className="__eyebrow">Premium Prompt Toolkit</span>
        <h1 className="__title">
          Busy Realtors' Time Saver
          <span className="__titleNote">
            (For those who value time and optimize profit)
          </span>
        </h1>
        <p className="__sub">
          A refined library of high-converting prompts to help you launch listings,
          nurture leads, and wow clients in minutes.
        </p>
      </header>

      <main className="__layout">
        {/* Top row: Listing details + Search */}
        <div className="__topRow">
          {/* Listing Details (no Apply info here) */}
          <aside className="__card __card--details">
            <h3>Listing Details</h3>
            <div className="__inputs">
              {LISTING_FIELDS.map((label) => {
                const id = "f_" + label.replace(/\s+/g, "_");
                return (
                  <div key={label} className="__field">
                    <label htmlFor={id}>[{label}]</label>
                    <input
                      id={id}
                      value={vars[label] ?? ""}
                      onChange={(e) => handleFieldChange(label, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
            <div className="__actionsRow">
              <button className="__btn" type="button" onClick={clearFields}>
                Clear
              </button>
            </div>
          </aside>

          {/* Search + Keywords */}
          <section className="__colRight">
            <div className="__card __search">
              <label htmlFor="searchBox">Search</label>
              <input
                id="searchBox"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search titles, bodies, keywords…"
              />
              <div className="__muted __muted--spaced">
                Showing: {filtered.length} / {prompts.length}
              </div>
            </div>

            <div className="__card __card--keywords">
              <div className="__cardTitleRow">
                <h3>Keywords</h3>
                <span className="__badge">Tap to filter</span>
              </div>
              <div className="__keywordSummary">
                Browse {keywordUniverse.length} keywords across
                {" "}
                {keywordGroups.length} categories.
              </div>
              <div className="__keywordGroups">
                {keywordGroups.map((group) => (
                  <section key={group.category} className="__keywordGroup">
                    <header className="__keywordGroupHead">
                      <h4 className="__groupTitle">{group.category}</h4>
                      <span className="__groupMeta">
                        {group.keywords.length} keyword
                        {group.keywords.length === 1 ? "" : "s"}
                      </span>
                    </header>
                    <div className="__chipsWrap">
                      {group.keywords.map((k) => (
                        <Chip
                          key={`${group.category}-${k}`}
                          label={k}
                          active={selectedKeywords.has(k)}
                          onClick={() => toggleKeyword(k)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <div className="__muted __muted--spaced">
                {selectedKeywords.size > 0 ? (
                  <>
                    Active keywords: {keywordList.join(", ")} ·{" "}
                    <button
                      type="button"
                      className="__linkBtn"
                      onClick={() => setSelectedKeywords(new Set<string>())}
                    >
                      Clear
                    </button>
                  </>
                ) : (
                  <>Tap any keyword to filter the prompts below</>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Prompt grid */}
        <section className="__gridSection">
          <div className="__grid">
            {filtered.map((p) => (
              <PromptCard key={p.id} prompt={p} vars={vars} />
            ))}
          </div>
        </section>
      </main>

      <footer className="__footer">
        © {new Date().getFullYear()} Busy Realtors' Time Saver · Crafted for agents who value time and optimize profit
      </footer>
    </div>
  );
}
