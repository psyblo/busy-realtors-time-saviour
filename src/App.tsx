import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import prompts from "./data/prompts.json";

const BUILD = "v12-diagnostics";

/* =========================
   Types (robust to body/text/prompt)
========================= */
type Category = "Listings" | "Tone" | "Social" | "Ads" | "Email" | "Client" | "SEO" | "Business";
type Prompt = {
  id?: string;
  title: string;
  category: Category | string;
  keywords?: string[];
  body?: string;
  text?: string;
  prompt?: string;
};

/* =========================
   Filters
========================= */
const CATEGORIES: Category[] = ["Listings", "Tone", "Social", "Ads", "Email", "Client", "SEO", "Business"];
const KEYWORD_GROUPS: Record<string, string[]> = {
  "Property Type": ["condo", "single-family", "townhome", "multifamily", "new-build"],
  Audience: ["luxury", "family", "investor", "first-time", "downsizer", "young-professional", "vacation", "eco", "tech", "relocation"],
  Feature: ["waterfront", "garden", "pool", "smart-home", "garage", "views", "amenities", "finishes"],
  Intent: ["retargeting", "lead-gen", "open-house", "price", "seo", "brand"],
  Channel: ["mls", "website", "instagram", "facebook", "tiktok", "google", "email"],
};

/* =========================
   Placeholder helpers
========================= */
// Support multiple delimiter styles and weird spacing.
const PH_PATTERNS = [
  { name: "brackets", re: /\[(.+?)\]/g, open: "[", close: "]" },
  { name: "curly2",  re: /\{\{(.+?)\}\}/g, open: "{{", close: "}}" },
  { name: "curly1",  re: /\{(.+?)\}/g, open: "{", close: "}" },
];

const normalizeSpaces = (s: string) =>
  s.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();

const toKey = (s: string) =>
  normalizeSpaces(s.toLowerCase().replace(/[^\w\s-]/g, ""));

const getBodyText = (p: Prompt) => {
  const raw = p.body ?? p.text ?? p.prompt ?? "";
  // normalize stray unicode and whitespace
  return raw.replace(/\r\n/g, "\n");
};

// Canonical prompt placeholders → alt names users type in the form
const ALIASES: Record<string, string[]> = {
  "number of bedrooms": ["bedrooms", "beds"],
  "number of bathrooms": ["bathrooms", "baths"],
  "unique selling points": ["key features", "features"],
  "hoa": ["hoa fee", "hoa fees"],
  "hoa fees": ["hoa fee", "hoa"],
  "price per sqft": ["ppsf", "price/ sqft", "price per sq ft"],
  "property type": ["ptype", "type"],
  "neighbourhood": ["neighborhood"], // UK↔US
  "neighbourhood characteristics": ["neighborhood characteristics"],
  "city/town": ["city"],
  "year built": ["built year", "yr built"],
};

function buildExpandedVars(vars: Record<string, string>) {
  // normalize + drop empties
  const base: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    const nk = toKey(k);
    if (v && normalizeSpaces(v) !== "") base[nk] = normalizeSpaces(v);
  }
  const out: Record<string, string> = { ...base };

  // alt → canonical
  for (const [canonRaw, alts] of Object.entries(ALIASES)) {
    const canon = toKey(canonRaw);
    if (!out[canon]) {
      for (const alt of alts) {
        const val = out[toKey(alt)];
        if (val) { out[canon] = val; break; }
      }
    }
  }
  // canonical → alts (don’t overwrite)
  for (const [canonRaw, alts] of Object.entries(ALIASES)) {
    const canon = toKey(canonRaw);
    const val = out[canon];
    if (val) {
      for (const alt of alts) {
        const ak = toKey(alt);
        if (!out[ak]) out[ak] = val;
      }
    }
  }
  return out;
}

function extractAllPlaceholders(s: string) {
  const found = new Set<string>();
  for (const { re } of PH_PATTERNS) {
    for (const m of s.matchAll(re)) {
      found.add(m[1]);
    }
  }
  return Array.from(found);
}

function fillAcrossDelimiters(body: string, expanded: Record<string, string>) {
  let result = body;
  // pass 1: exact keys
  for (const { re, name } of PH_PATTERNS) {
    result = result.replace(re, (_, raw) => {
      const k = toKey(raw);
      if (expanded[k]) return expanded[k];
      return `[${raw}]`; // unify missing into bracket style so user can spot it
    });
  }
  // pass 2: intelligent “number of X” fallback
  result = result.replace(/\[(number of .+?)\]/gi, (_, raw) => {
    const k = toKey(raw);
    const m = /^number of (.+)$/.exec(k);
    if (!m) return `[${raw}]`;
    const base = m[1];
    const singular = base.replace(/s\b/, "");
    const tries = [base, singular, singular + "s"];
    for (const t of tries) if (expanded[t]) return expanded[t];
    return `[${raw}]`;
  });
  return result;
}

/* =========================
   UI atoms
========================= */
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border backdrop-blur transition shadow-sm ${
        active ? "bg-white text-black border-white shadow-[0_6px_20px_rgba(255,255,255,.15)]"
               : "border-white/15 text-white/90 hover:border-white/35 hover:bg-white/5"}`}>
      {label}
    </motion.button>
  );
}

function PromptCard({
  p, appliedVars, onCopy
}: {
  p: Prompt;
  appliedVars: Record<string,string>;
  onCopy: (t: string) => void;
}) {
  const body = getBodyText(p);
  const filled = useMemo(() => fillAcrossDelimiters(body, appliedVars), [body, appliedVars]);
  const missing = useMemo(() => {
    const ph = extractAllPlaceholders(body);
    return ph.filter((x) => !appliedVars[toKey(x)]);
  }, [body, appliedVars]);

  return (
    <motion.div layout initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
      className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-[0_30px_120px_rgba(18,214,223,.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/70">{String(p.category)}</div>
          <h3 className="mt-1 font-semibold text-white/95 leading-snug">{p.title}</h3>
          {missing.length > 0 && (
            <div className="mt-1 text-[11px] text-amber-200/90">Missing: {missing.map((m) => `[${m}]`).join(", ")}</div>
          )}
        </div>
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => onCopy(filled)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-white to white/80 text-black shadow-[0_10px_30px_rgba(255,255,255,.15)]">
          Copy
        </motion.button>
      </div>
      <div className="mt-3 text-sm text-white/85 whitespace-pre-wrap leading-relaxed">{filled}</div>
      <div className="mt-3 flex flex-wrap gap-1">
        {(p.keywords||[]).map(k => (
          <span key={k} className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/10 text-white/80">#{k}</span>
        ))}
      </div>
    </motion.div>
  );
}

/* =========================
   Diagnostics Panel
========================= */
function Diagnostics({
  sample, appliedVars
}: {
  sample: Prompt | null;
  appliedVars: Record<string,string>;
}) {
  if (!sample) return null;
  const body = getBodyText(sample);
  const placeholders = extractAllPlaceholders(body).sort();
  return (
    <div className="mt-4 p-4 rounded-xl border border-white/10 bg-white/5">
      <div className="text-sm font-semibold">Diagnostics (first visible prompt)</div>
      <div className="mt-2 text-xs text-white/80">
        <div><b>Title:</b> {sample.title}</div>
        <div><b>Category:</b> {String(sample.category)}</div>
      </div>
      <div className="mt-2 text-xs">
        <div className="text-white/70">Placeholders in this prompt:</div>
        <ul className="list-disc ml-5 mt-1">
          {placeholders.map(ph => (
            <li key={ph}>
              <code className="text-amber-100">[{ph}]</code> → lookup key: <code className="text-emerald-200">{toKey(ph)}</code> → value:
              {" "}
              <code className="text-white">{appliedVars[toKey(ph)] ?? "— (missing)"}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* =========================
   Main App
========================= */
export default function App() {
  const [q, setQ] = useState("");
  const [data] = useState<Prompt[]>(prompts as unknown as Prompt[]);
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Form vars (editable)
  const [vars, setVars] = useState<Record<string,string>>({
    [toKey("property type")] :"",
    [toKey("address")] :"",
    [toKey("city")] :"",
    [toKey("neighborhood")] :"",
    [toKey("bedrooms")] :"",
    [toKey("bathrooms")] :"",
    [toKey("sqft")] :"",
    [toKey("price")] :"",
    [toKey("hoa fee")] :"",
    [toKey("year built")] :"",
    [toKey("lot size")] :"",
    [toKey("school district")] :"",
    [toKey("key features")] :"",
    [toKey("neighborhood characteristics")] :"",
    [toKey("lifestyle benefits")] :"",
    [toKey("word count")] :"170",
    [toKey("date")] :"",
    [toKey("start time")] :"",
    [toKey("end time")] :"",
    [toKey("lead source")] :"",
  });

  // Applied vars (frozen snapshot used by prompts)
  const [appliedVars, setAppliedVars] = useState<Record<string,string>>({});
  const [autoApply, setAutoApply] = useState(false);
  const [lastApplied, setLastApplied] = useState<string>("never");

  const applyNow = () => {
    const ex = buildExpandedVars(vars);
    setAppliedVars(ex);
    setLastApplied(new Date().toLocaleTimeString());
    console.log("[BRTS] appliedVars keys:", Object.keys(ex).sort());
  };

  useEffect(() => { if (autoApply) applyNow(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [vars, autoApply]);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, v: string) =>
    setter(prev => { const s = new Set(prev); s.has(v) ? s.delete(v) : s.add(v); return s; });

  const results = useMemo(() => (data||[]).filter(p => {
    const title = p.title || "";
    const body = getBodyText(p);
    const words = (p.keywords||[]).join(" ");
    if (selectedCats.size>0 && !selectedCats.has(String(p.category))) return false;
    if (selectedTags.size>0 && !(p.keywords||[]).some(k => selectedTags.has(k))) return false;
    if (q.trim()) {
      const hay = (title + "\n" + body + "\n" + words).toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [q, selectedCats, selectedTags, data]);

  const firstVisible = results[0] ?? null;

  const placeholdersInResults = useMemo(() => {
    const s = new Set<string>(); results.forEach(p => extractAllPlaceholders(getBodyText(p)).forEach(x => s.add(x)));
    return Array.from(s).sort();
  }, [results]);

  const handleCopy = async (t: string) => {
    try { await navigator.clipboard.writeText(t); }
    catch { alert("Clipboard blocked. Please select and copy manually."); }
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-24 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-30" style={{background:"radial-gradient(closest-side,#12D6DF55,transparent)"}} />
        <div className="absolute -bottom-24 -left-24 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-30" style={{background:"radial-gradient(closest-side,#7C9CFF55,transparent)"}} />
        <div className="absolute inset-0 bg-[#0b0f17]/95" />
      </div>

      {/* header */}
      <header className="max-w-7xl mx-auto px-6 pt-10 pb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">Busy Realtors Time Saver</h1>
            <p className="text-white/70 text-sm mt-1">Interactive Prompt Finder • Premium Edition</p>
            <div className="mt-2 inline-flex items-center gap-2">
              <span className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/70">Build: {BUILD}</span>
            </div>
          </div>
        </div>
      </header>

      {/* top row */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr] items-start">
          {/* Filters */}
          <aside className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
            <h3 className="font-semibold tracking-wide">Categories</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip key={c} label={c} active={selectedCats.has(c)} onClick={() => toggleSet(setSelectedCats, c)} />
              ))}
            </div>
            <div className="mt-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <h3 className="mt-6 font-semibold tracking-wide">Keywords</h3>
            <div className="mt-3 space-y-4">
              {Object.entries(KEYWORD_GROUPS).map(([group, tags]) => (
                <div key={group}>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/70">{group}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <Chip key={t} label={t} active={selectedTags.has(t)} onClick={() => toggleSet(setSelectedTags, t)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setSelectedCats(new Set()); setSelectedTags(new Set()); setQ(""); }}
              className="mt-6 w-full text-center px-4 py-2 rounded-xl border border-white/15 hover:border-white/35 backdrop-blur bg-white/5"
            >
              Clear filters
            </button>
          </aside>

          {/* Details + Search */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
            <div>
              <label className="text-sm text-white/70">Search</label>
              <input
                className="mt-1 w-full rounded-xl bg-[#0b0f17] border border-white/10 px-3 py-2 focus:outline-none"
                placeholder={`Search ${(Array.isArray(prompts) ? (prompts as any[]).length : 0)} prompts…`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="mt-5">
              <div className="text-sm font-semibold">Listing Details (fill, then click Apply)</div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "property type","address","city","neighborhood","bedrooms","bathrooms","sqft","price",
                  "hoa fee","year built","lot size","school district","key features",
                  "neighborhood characteristics","lifestyle benefits","word count","date","start time","end time","lead source",
                ].map((raw) => {
                  const k = toKey(raw);
                  return (
                    <div key={k}>
                      <label className="block text-[11px] uppercase tracking-[0.12em] text-white/60">[{raw}]</label>
                      <input
                        className="mt-1 w-full rounded-lg bg-[#0b0f17] border border-white/10 px-2 py-2 text-sm"
                        value={vars[k] ?? ""}
                        onChange={(e) => setVars((prev) => ({ ...prev, [k]: e.target.value }))}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 text-xs text-white/70">Add custom field</div>
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                <input className="rounded-lg bg-[#0b0f17] border border-white/10 px-2 py-2 text-sm" placeholder="placeholder name (e.g., garage spaces)" />
                <input className="rounded-lg bg-[#0b0f17] border border-white/10 px-2 py-2 text-sm" placeholder="value (e.g., 2)" />
                <button
                  onClick={() => {
                    const nameEl = (document.querySelector("#__add_name") as HTMLInputElement) || null;
                    const valEl = (document.querySelector("#__add_val") as HTMLInputElement) || null;
                  }}
                  className="hidden"
                >
                  Add
                </button>
              </div>

              {/* Apply bar */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => {
                  const ex = buildExpandedVars(vars);
                  setAppliedVars(ex);
                  setLastApplied(new Date().toLocaleTimeString());
                  console.log("[BRTS] appliedVars keys:", Object.keys(ex).sort());
                }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-white to-white/80 text-black shadow-[0_10px_30px_rgba(255,255,255,.15)]">
                  Apply Changes
                </motion.button>
                <label className="flex items-center gap-2 text-xs text-white/80">
                  <input type="checkbox" checked={false} onChange={()=>{}} disabled />
                  Auto-apply (disabled for debugging)
                </label>
                <span className="text-xs text-white/60">Last applied: {lastApplied}</span>
              </div>

              {/* Placeholders found vs. applied */}
              {placeholdersInResults.length > 0 && (
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/70">Placeholders found in results</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {placeholdersInResults.map((ph) => {
                      const ok = !!appliedVars[toKey(ph)];
                      return (
                        <span key={ph}
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${ok ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-200" : "border-white/10 bg-white/10 text-white/80"}`}
                          title={ok ? "Filled (applied)" : "Empty (applied vars)"}>
                          [{ph}]
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Diagnostics Viewer (first result) */}
              <Diagnostics sample={firstVisible} appliedVars={appliedVars} />
            </div>
          </div>
        </div>
      </section>

      {/* results */}
      <section className="max-w-7xl mx-auto px-6 pb-12 mt-6">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {results.map((p) => (
              <PromptCard key={(p.id||p.title)+"-"+String(p.category)} p={p} appliedVars={appliedVars} onCopy={handleCopy} />
            ))}
          </AnimatePresence>
        </div>

        {results.length === 0 && (
          <div className="mt-6 p-6 rounded-2xl border border-white/10 bg-white/5 text-sm text-white/70 flex items-center gap-4">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="opacity-70">
              <path d="M21 21l-4.35-4.35" stroke="white" strokeOpacity=".7" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="10" cy="10" r="6" stroke="white" strokeOpacity=".7" strokeWidth="1.6" />
            </svg>
            No prompts match your filters yet. Try removing some chips or clearing the search.
          </div>
        )}
      </section>

      <footer className="max-w-7xl mx-auto px-6 py-10 text-xs text-white/60">
        <div className="flex items-center justify-between">
          <span>© {new Date().getFullYear()} Hate Writing — Busy Realtors Time Saver</span>
          <span>Built for speed. Zero fluff.</span>
        </div>
      </footer>
    </div>
  );
}
