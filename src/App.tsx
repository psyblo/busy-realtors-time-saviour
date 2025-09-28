import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import prompts from "./data/prompts.json"; // ← adjust if your path differs
// If you use a keys gate, keep its import & wrapper as you had before.

const BRTS_BUILD = "v4-custom-fields-live";
console.log("[BRTS] Running build:", BRTS_BUILD);

// ---------- Types ----------
type Category = "Listings" | "Tone" | "Social" | "Ads" | "Email" | "Client" | "SEO" | "Business";
type Prompt = { id: string; title: string; category: Category; keywords: string[]; body: string; };

// ---------- Static filters ----------
const CATEGORIES: Category[] = ["Listings","Tone","Social","Ads","Email","Client","SEO","Business"];
const KEYWORD_GROUPS: Record<string, string[]> = {
  "Property Type": ["condo","single-family","townhome","multifamily","new-build"],
  Audience: ["luxury","family","investor","first-time","downsizer","young-professional","vacation","eco","tech","relocation"],
  Feature: ["waterfront","garden","pool","smart-home","garage","views","amenities","finishes"],
  Intent: ["retargeting","lead-gen","open-house","price","seo","brand"],
  Channel: ["mls","website","instagram","facebook","tiktok","google","email"],
};

// ---------- Placeholder helpers ----------
const PH_RE = /\[(.+?)\]/g;
const extractPlaceholders = (s: string) => Array.from(new Set([...s.matchAll(PH_RE)].map(m => m[1])));
const applyVars = (s: string, vars: Record<string,string>) => s.replace(PH_RE, (_, k) => vars[k] ?? `[${k}]`);
const safeCopy = async (t: string) => { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } };

// ---------- UI atoms ----------
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

function PromptCard({ p, vars, onCopy }: { p: Prompt; vars: Record<string,string>; onCopy: (text:string)=>void }) {
  const filled = useMemo(() => applyVars(p.body, vars), [p.body, vars]);
  const missing = useMemo(() => extractPlaceholders(p.body).filter(k => !vars[k]?.trim()), [p.body, vars]);
  return (
    <motion.div layout initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
      className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-[0_30px_120px_rgba(18,214,223,.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/70">{p.category}</div>
          <h3 className="mt-1 font-semibold text-white/95 leading-snug">{p.title}</h3>
          {missing.length > 0 && (
            <div className="mt-1 text-[11px] text-amber-200/90">Missing: {missing.map(m => `[${m}]`).join(", ")}</div>
          )}
        </div>
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => onCopy(filled)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-white to-white/80 text-black shadow-[0_10px_30px_rgba(255,255,255,.15)]">
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

// ---------- Main ----------
export default function App() {
  const [q, setQ] = useState("");
  const [data] = useState<Prompt[]>(prompts as Prompt[]);
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Listing Details + custom fields
  const [vars, setVars] = useState<Record<string,string>>({
    "property type":"", address:"", city:"", neighborhood:"", bedrooms:"", bathrooms:"", sqft:"", price:"",
    "hoa fee":"", "year built":"", "lot size":"", "school district":"",
    "key features":"", "neighborhood characteristics":"", "lifestyle benefits":"",
    "word count":"170", date:"", "start time":"", "end time":"", "lead source":""
  });
  const [newKey, setNewKey] = useState(""); const [newVal, setNewVal] = useState("");
  const [copied, setCopied] = useState(false);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, v: string) =>
    setter(prev => { const s = new Set(prev); s.has(v) ? s.delete(v) : s.add(v); return s; });

  const results = useMemo(() => (data||[]).filter(p => {
    if (selectedCats.size>0 && !selectedCats.has(p.category)) return false;
    if (selectedTags.size>0 && !(p.keywords||[]).some(k => selectedTags.has(k))) return false;
    if (q.trim()) {
      const hay = (p.title+"\n"+p.body+"\n"+(p.keywords||[]).join(" ")).toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [q, selectedCats, selectedTags, data]);

  const placeholdersInResults = useMemo(() => {
    const s = new Set<string>(); results.forEach(p => extractPlaceholders(p.body).forEach(x => s.add(x)));
    return Array.from(s).sort();
  }, [results]);

  const handleCopy = async (t: string) => { if (await safeCopy(t)) { setCopied(true); setTimeout(()=>setCopied(false),1200); } };

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-24 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-30" style={{background:"radial-gradient(closest-side,#12D6DF55,transparent)"}} />
        <div className="absolute -bottom-24 -left-24 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-30" style={{background:"radial-gradient(closest-side,#7C9CFF55,transparent)"}} />
        <div className="absolute inset-0 bg-[#0b0f17]/95" />
      </div>

      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 pt-10 pb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">Busy Realtors Time Saver</h1>
            <p className="text-white/70 text-sm mt-1">Interactive Prompt Finder • Premium Edition</p>
            <div className="mt-2 inline-flex items-center gap-2">
              <span className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/70">
                Build: {BRTS_BUILD}
              </span>
            </div>
          </div>
          <motion.div initial={{opacity:0}} animate={{opacity:copied?1:0}}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/10 border border-white/15">
            Copied ✓
          </motion.div>
        </div>

        <div className="mt-4 grid lg:grid-cols-[1fr_380px] gap-6 items-start">
          <div>
            <input
              className="w-full rounded-xl bg-[#0b0f17] border border-white/10 px-3 py-2 focus:outline-none"
              placeholder={`Search ${Array.isArray(data)?data.length:0} prompts…`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Listing Details / Custom Fields */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <div className="text-sm font-semibold">Listing Details (auto-fill placeholders)</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                "property type","address","city","neighborhood","bedrooms","bathrooms","sqft","price",
                "hoa fee","year built","lot size","school district","key features",
                "neighborhood characteristics","lifestyle benefits","word count",
                "date","start time","end time","lead source"
              ].map(k => (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-[11px] text-white/60 min-w-[110px]">[{k}]</span>
                  <input
                    className="flex-1 rounded-lg bg-[#0b0f17] border border-white/10 px-2 py-1 text-sm"
                    value={vars[k] ?? ""}
                    onChange={(e) => setVars(prev => ({ ...prev, [k]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {/* Add custom field */}
            <div className="mt-3 text-xs text-white/70">Add custom field</div>
            <div className="mt-1 flex gap-2">
              <input
                className="flex-1 rounded-lg bg-[#0b0f17] border border-white/10 px-2 py-1 text-sm"
                placeholder="placeholder name (e.g., garage spaces)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <input
                className="flex-1 rounded-lg bg-[#0b0f17] border border-white/10 px-2 py-1 text-sm"
                placeholder="value (e.g., 2)"
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
              />
              <button
                onClick={() => {
                  const k = newKey.trim();
                  if (!k) return;
                  setVars(v => ({ ...v, [k]: newVal }));
                  setNewKey(""); setNewVal("");
                }}
                className="px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/35 text-sm"
              >
                Add
              </button>
            </div>

            {/* Show placeholders detected in current results */}
            {placeholdersInResults.length>0 && (
              <div className="mt-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/70">Placeholders found in results</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {placeholdersInResults.map(ph => {
                    const ok = !!vars[ph]?.trim();
                    return (
                      <span key={ph}
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          ok ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-200"
                             : "border-white/10 bg-white/10 text-white/80"}`}
                        title={ok ? "Filled" : "Empty"}
                      >
                        [{ph}]
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Layout */}
      <section className="max-w-7xl mx-auto px-6 grid xl:grid-cols-[300px_1fr] gap-6 pb-12">
        {/* Sidebar */}
        <aside className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 sticky top-6 self-start">
          <h3 className="font-semibold tracking-wide">Categories</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map(c => <Chip key={c} label={c} active={selectedCats.has(c)} onClick={()=>toggleSet(setSelectedCats,c)} />)}
          </div>
          <div className="mt-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <h3 className="mt-6 font-semibold tracking-wide">Keywords</h3>
          <div className="mt-3 space-y-4">
            {Object.entries(KEYWORD_GROUPS).map(([group,tags]) => (
              <div key={group}>
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/70">{group}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map(t => <Chip key={t} label={t} active={selectedTags.has(t)} onClick={()=>toggleSet(setSelectedTags,t)} />)}
                </div>
              </div>
            ))}
          </div>
          <button onClick={()=>{ setSelectedCats(new Set()); setSelectedTags(new Set()); setQ(""); }}
            className="mt-6 w-full text-center px-4 py-2 rounded-xl border border-white/15 hover:border-white/35 backdrop-blur bg-white/5">
            Clear filters
          </button>
        </aside>

        {/* Results */}
        <main>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {results.map(p => <PromptCard key={p.id} p={p} vars={vars} onCopy={handleCopy} />)}
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
        </main>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-10 text-xs text-white/60">
        <div className="flex items-center justify-between">
          <span>© {new Date().getFullYear()} Hate Writing — Busy Realtors Time Saver</span>
          <span>Built for speed. Zero fluff.</span>
        </div>
      </footer>
    </div>
  );
}
