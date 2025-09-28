
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type Prompt = {
  id: string;
  title: string;
  category: "Listings" | "Tone" | "Social" | "Ads" | "Email" | "Client" | "SEO" | "Business";
  keywords: string[];
  body: string;
};

const DEFAULT_DATA: Prompt[] = [
  {
    id: "L-std-classic",
    title: "Classic Full Description",
    category: "Listings",
    keywords: ["standard", "classic", "mls", "website", "seo"],
    body:
      "You are a professional real estate copywriter. Write a classic full description for a [property type] in [city] with [bedrooms] beds and [bathrooms] baths. Highlight [key features], [neighborhood characteristics], and [lifestyle benefits]. Keep it under [word count] words and end with a clear CTA.",
  },
  {
    id: "AD-google-first-time",
    title: "Google Ads — First-Time Buyers Lead-Gen",
    category: "Ads",
    keywords: ["first-time", "google", "lead-gen", "website", "brand"],
    body:
      "Generate RSA headlines/descriptions targeting first-time buyers in [city]. Include 2 sitelinks (mortgage pre-approval and buyer guide on website) and 3 callouts. Optimize for lead form conversions.",
  },
  {
    id: "S-instagram-condo-brand",
    title: "Condo Reveal — Instagram Carousel + Brand Hooks",
    category: "Social",
    keywords: ["condo", "instagram", "young-professional", "amenities", "brand"],
    body:
      "Create a 6-slide Instagram carousel for a condo targeting young professionals: 1) hook, 2) amenities, 3) commute/lifestyle, 4) building perks, 5) neighborhood vibe, 6) CTA. Provide caption, 10 hashtags, and 3 brand hooks.",
  },
];

const CATEGORIES: Prompt["category"][] = [
  "Listings",
  "Tone",
  "Social",
  "Ads",
  "Email",
  "Client",
  "SEO",
  "Business",
];

const KEYWORD_GROUPS: Record<string, string[]> = {
  "Property Type": ["condo", "single-family", "townhome", "multifamily", "new-build"],
  Audience: ["luxury", "family", "investor", "first-time", "downsizer", "young-professional", "vacation", "eco", "tech", "relocation"],
  Feature: ["waterfront", "garden", "pool", "smart-home", "garage", "views", "amenities", "finishes"],
  Intent: ["retargeting", "lead-gen", "open-house", "price", "seo", "brand"],
  Channel: ["mls", "website", "instagram", "facebook", "tiktok", "google", "email"],
};

function applyVars(body: string, vars: Record<string, string>) {
  return body.replace(/\[(.+?)\]/g, (_, key) => vars[key] ?? `[${key}]`);
}

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
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border backdrop-blur transition shadow-sm ${
        active
          ? "bg-white text-black border-white shadow-[0_6px_20px_rgba(255,255,255,.15)]"
          : "border-white/15 text-white/90 hover:border-white/35 hover:bg-white/5"
      }`}
    >
      {label}
    </motion.button>
  );
}

async function safeCopy(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
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
    if (ok) return true;
  } catch {}
  return false;
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={async () => {
        const success = await safeCopy(text);
        if (success) {
          setOk(true);
          setTimeout(() => setOk(false), 1400);
        }
      }}
      className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-white to-white/80 text-black shadow-[0_10px_30px_rgba(255,255,255,.15)]"
      title="Copy to clipboard"
    >
      {ok ? "Copied ✓" : "Copy"}
    </motion.button>
  );
}

function PromptCard({ p, vars }: { p: Prompt; vars: Record<string, string> }) {
  const filled = useMemo(() => applyVars(p.body, vars), [p.body, vars]);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-[0_30px_120px_rgba(18,214,223,.12)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/70">{p.category}</div>
          <h3 className="mt-1 font-semibold text-white/95 leading-snug">{p.title}</h3>
        </div>
        <CopyBtn text={filled} />
      </div>
      <div className="mt-3 text-sm text-white/85 whitespace-pre-wrap leading-relaxed">{filled}</div>
      <div className="mt-3 flex flex-wrap gap-1">
        {p.keywords.map((k) => (
          <span key={k} className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/10 text-white/80">
            #{k}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export default function App() {
  const [q, setQ] = useState("");
  const [data] = useState<Prompt[]>(DEFAULT_DATA);
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [vars, setVars] = useState<Record<string, string>>({
    "property type": "single-family home",
    city: "Miami",
    bedrooms: "3",
    bathrooms: "2",
    "key features": "ocean views, chef’s kitchen, smart-home controls",
    "neighborhood characteristics": "waterfront walks, boutique cafes, top-rated schools",
    "lifestyle benefits": "morning sun on the balcony, 5-minute park access",
    "word count": "170",
    address: "123 Bayfront Dr",
    date: "Saturday",
    "start time": "11:00",
    "end time": "14:00",
    neighborhood: "Edgewater",
    "lead source": "website form",
  });

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter((prev) => {
      const copy = new Set(prev);
      copy.has(value) ? copy.delete(value) : copy.add(value);
      return copy;
    });
  };

  const results = useMemo(() => {
    return data.filter((p) => {
      if (selectedCats.size > 0 && !selectedCats.has(p.category)) return false;
      if (selectedTags.size > 0 && !p.keywords.some((k) => selectedTags.has(k))) return false;
      if (q.trim()) {
        const hay = (p.title + "\\n" + p.body + "\\n" + p.keywords.join(" ")).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [q, selectedCats, selectedTags, data]);

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-24 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-30 bg-radial-a" />
        <div className="absolute -bottom-24 -left-24 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-30 bg-radial-b" />
        <div className="absolute inset-0 bg-[#0b0f17]/95" />
      </div>

      <header className="max-w-7xl mx-auto px-6 pt-10 pb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">Busy Realtors Time Saviour</h1>
        <p className="text-white/70 text-sm mt-1">Interactive Prompt Finder • Premium Edition</p>
        <input
          className="mt-4 w-full rounded-xl bg-[#0b0f17] border border-white/10 px-3 py-2 focus:outline-none"
          placeholder="Search prompts…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </header>

      <section className="max-w-7xl mx-auto px-6 grid xl:grid-cols-[300px_1fr] gap-6 pb-12">
        <aside className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 sticky top-6 self-start">
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
            onClick={() => {
              setSelectedCats(new Set());
              setSelectedTags(new Set());
              setQ("");
            }}
            className="mt-6 w-full text-center px-4 py-2 rounded-xl border border-white/15 hover:border-white/35 backdrop-blur bg-white/5"
          >
            Clear filters
          </button>
        </aside>

        <main>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {results.map((p) => (
                <PromptCard key={p.id} p={p} vars={vars} />
              ))}
            </AnimatePresence>
          </div>
        </main>
      </section>

      <footer className="max-w-7xl mx-auto px-6 py-10 text-xs text-white/60">
        <div className="flex items-center justify-between">
          <span>© {new Date().getFullYear()} Hate Writing — Busy Realtors Time Saviour</span>
          <span>Built for speed. Zero fluff.</span>
        </div>
      </footer>
    </div>
  );
}
