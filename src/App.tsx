 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/src/App.tsx b/src/App.tsx
index f1674e5c78ed1af33a1857cb6d1686fda2751a82..234d075a7fe0a3c90203544fcae01084889f8475 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -1,587 +1,431 @@
- (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
-diff --git a/src/App.tsx b/src/App.tsx
-index eea2642a60ab1e9928b805d690a9fa8d613b23df..d376da97472a6651e670d0e59f66721d93d92cd4 100644
---- a/src/App.tsx
-+++ b/src/App.tsx
-@@ -1,37 +1,85 @@
-- import React, { useMemo, useState } from "react";
-+import React, { useCallback, useEffect, useMemo, useState } from "react";
- import "./index.css";
- 
- // ---------- Types ----------
- type Prompt = {
-   id: string;
-   title: string;
-   category?: string;
-   keywords?: string[];
-   body: string;
- };
- 
-+const LISTING_FIELDS = [
-+  "property type",
-+  "address",
-+  "city",
-+  "neighborhood",
-+  "bedrooms",
-+  "bathrooms",
-+  "sqft",
-+  "price",
-+  "hoa fee",
-+  "year built",
-+  "lot size",
-+  "school district",
-+  "key features",
-+  "neighborhood characteristics",
-+  "lifestyle benefits",
-+  "word count",
-+  "date",
-+  "start time",
-+  "end time",
-+  "lead source",
-+] as const;
-+
-+type ListingField = (typeof LISTING_FIELDS)[number];
-+
-+const DEFAULT_FIELD_VALUES: Record<ListingField, string> = {
-+  "property type": "",
-+  address: "",
-+  city: "Miami",
-+  neighborhood: "",
-+  bedrooms: "3",
-+  bathrooms: "2",
-+  sqft: "",
-+  price: "",
-+  "hoa fee": "",
-+  "year built": "",
-+  "lot size": "",
-+  "school district": "",
-+  "key features": "ocean views, smart-home, chef’s kitchen",
-+  "neighborhood characteristics": "",
-+  "lifestyle benefits": "",
-+  "word count": "170",
-+  date: "",
-+  "start time": "",
-+  "end time": "",
-+  "lead source": "",
-+};
-+
- // ---------- Data import (Vite JSON import) ----------
- import rawPrompts from "./data/prompts.json";
- 
- // ---------- Helpers ----------
- const toKey = (s: string) =>
-   s
-     .toLowerCase()
-     .replace(/\u00A0/g, " ")
-     .replace(/[^\w\s-]/g, "")
-     .replace(/\s+/g, " ")
-     .trim();
- 
- const PH_PATTERNS: RegExp[] = [
-   /\[(.+?)\]/g, // [city]
-   /\{\{(.+?)\}\}/g, // {{city}}
-   /\{(.+?)\}/g, // {city}
-   /<(.+?)>/g, // <city>
-   /\((.+?)\)/g, // (city)
- ];
- 
- const ALIASES: Record<string, string[]> = {
-   "number of bedrooms": ["bedrooms", "beds"],
-   "number of bathrooms": ["bathrooms", "baths"],
-   "unique selling points": ["key features", "features"],
-   "property type": ["type", "ptype"],
-diff --git a/src/App.tsx b/src/App.tsx
-index eea2642a60ab1e9928b805d690a9fa8d613b23df..d376da97472a6651e670d0e59f66721d93d92cd4 100644
---- a/src/App.tsx
-+++ b/src/App.tsx
-@@ -119,318 +167,325 @@ async function safeCopy(text: string) {
-     ta.style.position = "fixed";
-     ta.style.top = "-9999px";
-     document.body.appendChild(ta);
-     ta.focus();
-     ta.select();
-     const ok = document.execCommand("copy");
-     document.body.removeChild(ta);
-     return ok;
-   } catch {
-     return false;
-   }
- }
- 
- // ---------- Small UI atoms ----------
- function Chip({
-   label,
-   active,
-   onClick,
- }: {
-   label: string;
-   active: boolean;
-   onClick: () => void;
- }) {
-   return (
-     <button
-+      type="button"
-       onClick={onClick}
-       className={`__chip ${active ? "__chip--active" : ""}`}
-       title={label}
-     >
-       {label}
-     </button>
-   );
- }
- 
- // ---------- Prompt Card ----------
- function PromptCard({
-   prompt,
-   vars,
- }: {
-   prompt: Prompt;
-   vars: Record<string, string>;
- }) {
-   const [filled, setFilled] = useState<string | null>(null);
-   const expanded = useMemo(() => buildExpandedVars(vars), [vars]);
-   const body = prompt.body;
-   const current = filled ?? body;
- 
-+  useEffect(() => {
-+    setFilled(null);
-+  }, [body, vars]);
-+
-   return (
-     <div className="__pCard">
-       <div className="__pHead">
-         <div>
-           <div className="__cat">{prompt.category || "Other"}</div>
-           <h4 className="__pTitle">{prompt.title}</h4>
-         </div>
-         <div className="__btns">
-           <button
-             className="__btn"
-+            type="button"
-             onClick={() => {
-               const next = fillAcrossDelimiters(body, expanded);
-               setFilled(next);
-             }}
-           >
-             Insert Listing Details
-           </button>
-           <button
-             className="__btn"
-+            type="button"
-             onClick={async () => {
-               const ok = await safeCopy(current);
-               if (!ok)
-                 alert("Copied text selected. If blocked, use Ctrl/Cmd+C.");
-             }}
-           >
-             Copy
-           </button>
-         </div>
-       </div>
- 
-       <div
-         className="__pBody"
-         dangerouslySetInnerHTML={{ __html: escapeHtml(current) }}
-       />
- 
-       {!!(prompt.keywords && prompt.keywords.length) && (
-         <div className="__chipsRow">
-           {prompt.keywords!.map((k) => (
-             <span key={k} className="__chipTag">
-               #{k}
-             </span>
-           ))}
-         </div>
-       )}
-     </div>
-   );
- }
- 
- // ---------- Main Component ----------
- export default function App() {
-   // Normalize prompts from JSON
-   const prompts: Prompt[] = useMemo(() => {
-     const arr = (rawPrompts as any[]) || [];
-     return arr.map((p, i) => ({
-       id: String(p.id ?? i),
-       title: p.title ?? `Untitled #${i + 1}`,
-       category: p.category ?? "Other",
-       keywords: Array.isArray(p.keywords) ? p.keywords : [],
-       body: p.body ?? p.text ?? p.prompt ?? "",
-     }));
-   }, []);
- 
--  // Build keyword universe from JSON
--  const allKeywords = useMemo(() => {
--    const set = new Set<string>();
--    prompts.forEach((p) => (p.keywords || []).forEach((k) => set.add(k)));
--    return Array.from(set).sort((a, b) => a.localeCompare(b));
-+  // Build keyword universe grouped by category for richer UI
-+  const keywordGroups = useMemo(() => {
-+    const map = new Map<string, Set<string>>();
-+    prompts.forEach((p) => {
-+      const category = (p.category || "Other").trim() || "Other";
-+      if (!map.has(category)) {
-+        map.set(category, new Set());
-+      }
-+      (p.keywords || []).forEach((keyword) => {
-+        if (!keyword) return;
-+        map.get(category)!.add(keyword);
-+      });
-+    });
-+    return Array.from(map.entries())
-+      .map(([category, values]) => ({
-+        category,
-+        keywords: Array.from(values).sort((a, b) => a.localeCompare(b)),
-+      }))
-+      .sort((a, b) => a.category.localeCompare(b.category));
-   }, [prompts]);
- 
-+  const keywordUniverse = useMemo(() => {
-+    const seen = new Set<string>();
-+    keywordGroups.forEach(({ keywords }) => {
-+      keywords.forEach((keyword) => {
-+        if (!seen.has(keyword)) {
-+          seen.add(keyword);
-+        }
-+      });
-+    });
-+    return Array.from(seen).sort((a, b) => a.localeCompare(b));
-+  }, [keywordGroups]);
-+
-   const [search, setSearch] = useState("");
-   const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(
-     () => new Set()
-   );
- 
--  const [vars, setVars] = useState<Record<string, string>>({
--    "property type": "",
--    address: "",
--    city: "Miami",
--    neighborhood: "",
--    bedrooms: "3",
--    bathrooms: "2",
--    sqft: "",
--    price: "",
--    "hoa fee": "",
--    "year built": "",
--    "lot size": "",
--    "school district": "",
--    "key features": "ocean views, smart-home, chef’s kitchen",
--    "neighborhood characteristics": "",
--    "lifestyle benefits": "",
--    "word count": "170",
--    date: "",
--    "start time": "",
--    "end time": "",
--    "lead source": "",
--  });
-+  const [vars, setVars] = useState<Record<ListingField, string>>(
-+    () => ({ ...DEFAULT_FIELD_VALUES })
-+  );
- 
-   const filtered = useMemo(() => {
-     const q = search.trim().toLowerCase();
-     return prompts.filter((p) => {
-       if (selectedKeywords.size > 0) {
-         const hasAny = (p.keywords || []).some((k) => selectedKeywords.has(k));
-         if (!hasAny) return false;
-       }
-       if (!q) return true;
-       const hay = (p.title + "\n" + p.body + "\n" + (p.keywords || []).join(" ")).toLowerCase();
-       return hay.includes(q);
-     });
-   }, [prompts, search, selectedKeywords]);
- 
--  const labels: string[] = [
--    "property type","address","city","neighborhood","bedrooms","bathrooms","sqft","price",
--    "hoa fee","year built","lot size","school district","key features",
--    "neighborhood characteristics","lifestyle benefits","word count","date","start time","end time","lead source",
--  ];
-+  const clearFields = useCallback(() => {
-+    setVars(() => ({ ...DEFAULT_FIELD_VALUES }));
-+  }, []);
-+
-+  const handleFieldChange = useCallback(
-+    (key: ListingField, value: string) => {
-+      setVars((prev) => ({ ...prev, [key]: value }));
-+    },
-+    []
-+  );
-+
-+  const keywordList = useMemo(() => {
-+    const items = Array.from(selectedKeywords.values());
-+    return items.sort((a, b) => a.localeCompare(b));
-+  }, [selectedKeywords]);
- 
-   function toggleKeyword(k: string) {
-     setSelectedKeywords((prev) => {
-       const next = new Set(prev);
-       if (next.has(k)) next.delete(k);
-       else next.add(k);
-       return next;
-     });
-   }
- 
-   return (
-     <div className="__brts__root">
--      {/* Scoped styles */}
--      <style>{`
--        .__brts__root{max-width:1200px;margin:0 auto;padding:16px;color:#fff}
--        .__header{padding:20px 0}
--        .__title{margin:0;font-weight:800;line-height:1.1}
--        .__sub{opacity:.7}
--
--        .__row{display:grid;grid-template-columns:340px 1fr;gap:16px;align-items:start}
--        @media (max-width:980px){.__row{grid-template-columns:1fr}}
--
--        .__card{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);backdrop-filter:blur(8px);border-radius:16px;padding:16px}
--        .__card h3{margin:.25rem 0 .5rem 0}
--
--        .__inputs{display:grid;grid-template-columns:1fr 1fr;gap:10px}
--        .__inputs label{font-size:12px;opacity:.75}
--        .__inputs input{
--          width:100%;margin-top:4px;border-radius:10px;border:1px solid rgba(255,255,255,.18);
--          background:#0b0f17;color:#fff;padding:8px 10px;outline:none
--        }
--
--        .__muted{opacity:.7;font-size:12px}
--        .__search input{
--          width:100%;margin-top:6px;border-radius:10px;border:1px solid rgba(255,255,255,.18);
--          background:#0b0f17;color:#fff;padding:8px 10px;outline:none
--        }
--
--        .__chipsWrap{margin-top:10px;display:flex;flex-wrap:wrap;gap:8px}
--        .__chip{
--          padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.18);
--          background:rgba(255,255,255,.08);font-size:12px;color:#fff;cursor:pointer
--        }
--        .__chip--active{background:#fff;color:#000;border-color:#fff}
--
--        .__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
--        @media (max-width:1200px){.__grid{grid-template-columns:repeat(2,1fr)}}
--        @media (max-width:700px){.__grid{grid-template-columns:1fr}}
--
--        .__pCard{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:16px;padding:16px}
--        .__pHead{display:flex;justify-content:space-between;gap:8px}
--        .__cat{font-size:11px;text-transform:uppercase;opacity:.7}
--        .__pTitle{margin:6px 0 0 0}
--        .__btns{display:flex;gap:8px;flex-wrap:wrap}
--        .__btn{padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.22);background:#fff;color:#000;font-weight:700;cursor:pointer}
--        .__chipsRow{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
--        .__chipTag{padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.10);font-size:11px}
--        .__pBody{margin-top:10px;white-space:pre-wrap}
--      `}</style>
--
-       {/* Header */}
-       <header className="__header">
--        <h1 className="__title">Busy Realtors Time Saviour</h1>
--        <div className="__sub">Interactive Prompt Finder — Premium layout</div>
-+        <span className="__eyebrow">Premium Prompt Toolkit</span>
-+        <h1 className="__title">
-+          Busy Realtors' Time Saver
-+          <span className="__titleNote">
-+            (For those who value time and optimize profit)
-+          </span>
-+        </h1>
-+        <p className="__sub">
-+          A refined library of high-converting prompts to help you launch listings,
-+          nurture leads, and wow clients in minutes.
-+        </p>
-       </header>
- 
--      {/* Top row: Listing details + Search */}
--      <div className="__row">
--        {/* Listing Details (no Apply info here) */}
--        <aside className="__card">
--          <h3>Listing Details</h3>
--          <div className="__inputs">
--            {labels.map((label) => {
--              const id = "f_" + label.replace(/\s+/g, "_");
--              return (
--                <div key={label} style={{ display: "flex", flexDirection: "column" }}>
--                  <label htmlFor={id}>[{label}]</label>
--                  <input
--                    id={id}
--                    value={vars[label] ?? ""}
--                    onChange={(e) => setVars((v) => ({ ...v, [label]: e.target.value }))}
--                  />
--                </div>
--              );
--            })}
--          </div>
--          <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
--            <button
--              className="__btn"
--              onClick={() => setVars((v) => Object.fromEntries(Object.keys(v).map((k) => [k, ""])) as any)}
--            >
--              Clear
--            </button>
--          </div>
--        </aside>
--
--        {/* Search + Keywords */}
--        <section>
--          <div className="__card __search">
--            <label>Search</label>
--            <input
--              value={search}
--              onChange={(e) => setSearch(e.target.value)}
--              placeholder="Search titles, bodies, keywords…"
--            />
--            <div className="__muted" style={{ marginTop: 6 }}>
--              Showing: {filtered.length} / {prompts.length}
-+      <main className="__layout">
-+        {/* Top row: Listing details + Search */}
-+        <div className="__topRow">
-+          {/* Listing Details (no Apply info here) */}
-+          <aside className="__card __card--details">
-+            <h3>Listing Details</h3>
-+            <div className="__inputs">
-+              {LISTING_FIELDS.map((label) => {
-+                const id = "f_" + label.replace(/\s+/g, "_");
-+                return (
-+                  <div key={label} className="__field">
-+                    <label htmlFor={id}>[{label}]</label>
-+                    <input
-+                      id={id}
-+                      value={vars[label] ?? ""}
-+                      onChange={(e) => handleFieldChange(label, e.target.value)}
-+                    />
-+                  </div>
-+                );
-+              })}
-             </div>
--          </div>
--
--          <div className="__card" style={{ marginTop: 12 }}>
--            <h3>Keywords</h3>
--            <div className="__chipsWrap">
--              {allKeywords.map((k) => (
--                <Chip
--                  key={k}
--                  label={k}
--                  active={selectedKeywords.has(k)}
--                  onClick={() => toggleKeyword(k)}
--                />
--              ))}
-+            <div className="__actionsRow">
-+              <button className="__btn" type="button" onClick={clearFields}>
-+                Clear
-+              </button>
-             </div>
--            {selectedKeywords.size > 0 && (
--              <div className="__muted" style={{ marginTop: 8 }}>
--                Active: {Array.from(selectedKeywords).join(", ")} —{" "}
--                <a
--                  href="#"
--                  onClick={(e) => {
--                    e.preventDefault();
--                    setSelectedKeywords(new Set());
--                  }}
--                  style={{ color: "#fff" }}
--                >
--                  Clear
--                </a>
-+          </aside>
-+
-+          {/* Search + Keywords */}
-+          <section className="__colRight">
-+            <div className="__card __search">
-+              <label htmlFor="searchBox">Search</label>
-+              <input
-+                id="searchBox"
-+                value={search}
-+                onChange={(e) => setSearch(e.target.value)}
-+                placeholder="Search titles, bodies, keywords…"
-+              />
-+              <div className="__muted __muted--spaced">
-+                Showing: {filtered.length} / {prompts.length}
-               </div>
--            )}
--          </div>
--        </section>
--      </div>
-+            </div>
- 
--      {/* Prompt grid */}
--      <section style={{ marginTop: 16 }}>
--        <div className="__grid">
--          {filtered.map((p) => (
--            <PromptCard key={p.id} prompt={p} vars={vars} />
--          ))}
-+            <div className="__card __card--keywords">
-+              <div className="__cardTitleRow">
-+                <h3>Keywords</h3>
-+                <span className="__badge">Tap to filter</span>
-+              </div>
-+              <div className="__keywordSummary">
-+                Browse {keywordUniverse.length} keywords across
-+                {" "}
-+                {keywordGroups.length} categories.
-+              </div>
-+              <div className="__keywordGroups">
-+                {keywordGroups.map((group) => (
-+                  <section key={group.category} className="__keywordGroup">
-+                    <header className="__keywordGroupHead">
-+                      <h4 className="__groupTitle">{group.category}</h4>
-+                      <span className="__groupMeta">
-+                        {group.keywords.length} keyword
-+                        {group.keywords.length === 1 ? "" : "s"}
-+                      </span>
-+                    </header>
-+                    <div className="__chipsWrap">
-+                      {group.keywords.map((k) => (
-+                        <Chip
-+                          key={`${group.category}-${k}`}
-+                          label={k}
-+                          active={selectedKeywords.has(k)}
-+                          onClick={() => toggleKeyword(k)}
-+                        />
-+                      ))}
-+                    </div>
-+                  </section>
-+                ))}
-+              </div>
-+              <div className="__muted __muted--spaced">
-+                {selectedKeywords.size > 0 ? (
-+                  <>
-+                    Active keywords: {keywordList.join(", ")} ·{" "}
-+                    <button
-+                      type="button"
-+                      className="__linkBtn"
-+                      onClick={() => setSelectedKeywords(new Set<string>())}
-+                    >
-+                      Clear
-+                    </button>
-+                  </>
-+                ) : (
-+                  <>Tap any keyword to filter the prompts below</>
-+                )}
-+              </div>
-+            </div>
-+          </section>
-         </div>
--      </section>
- 
--      <footer style={{ padding: "24px 0", opacity: 0.7, fontSize: 12 }}>
--        © {new Date().getFullYear()} Busy Realtors Time Saviour — React build
-+        {/* Prompt grid */}
-+        <section className="__gridSection">
-+          <div className="__grid">
-+            {filtered.map((p) => (
-+              <PromptCard key={p.id} prompt={p} vars={vars} />
-+            ))}
-+          </div>
-+        </section>
-+      </main>
-+
-+      <footer className="__footer">
-+        © {new Date().getFullYear()} Busy Realtors' Time Saver · Crafted for agents who value time and optimize profit
-       </footer>
-     </div>
-   );
- }
- 
-EOF
-)
+import { useMemo, useState } from "react";
+import rawPrompts from "./data/prompts.json";
+import "./index.css";
+
+type Prompt = {
+  id: string;
+  title: string;
+  category?: string;
+  keywords?: string[];
+  body: string;
+};
+
+const PLACEHOLDER_PATTERNS: RegExp[] = [
+  /\[(.+?)\]/g,
+  /\{\{(.+?)\}\}/g,
+  /\{(.+?)\}/g,
+  /<(.+?)>/g,
+  /\((.+?)\)/g,
+];
+
+const ALIASES: Record<string, string[]> = {
+  "number of bedrooms": ["bedrooms", "beds"],
+  "number of bathrooms": ["bathrooms", "baths"],
+  "unique selling points": ["key features", "features"],
+  "property type": ["type", "ptype"],
+  "neighbourhood": ["neighborhood"],
+  "neighbourhood characteristics": ["neighborhood characteristics"],
+  "city/town": ["city"],
+  "year built": ["built year", "yr built"],
+  "hoa fee": ["hoa", "hoa fees"],
+  "hoa fees": ["hoa fee", "hoa"],
+};
+
+function toKey(value: string) {
+  return value
+    .toLowerCase()
+    .replace(/\u00a0/g, " ")
+    .replace(/[^\w\s-]/g, "")
+    .replace(/\s+/g, " ")
+    .trim();
+}
+
+function buildExpandedVars(vars: Record<string, string>) {
+  const base: Record<string, string> = {};
+  for (const key of Object.keys(vars)) {
+    const value = String(vars[key] ?? "").trim();
+    if (!value) continue;
+    base[toKey(key)] = value;
+  }
+
+  for (const canonical of Object.keys(ALIASES)) {
+    const canonicalKey = toKey(canonical);
+    if (!base[canonicalKey]) {
+      for (const alias of ALIASES[canonical]) {
+        const aliasValue = base[toKey(alias)];
+        if (aliasValue) {
+          base[canonicalKey] = aliasValue;
+          break;
+        }
+      }
+    }
+  }
+
+  for (const canonical of Object.keys(ALIASES)) {
+    const canonicalKey = toKey(canonical);
+    const canonicalValue = base[canonicalKey];
+    if (!canonicalValue) continue;
+    for (const alias of ALIASES[canonical]) {
+      const aliasKey = toKey(alias);
+      if (!base[aliasKey]) base[aliasKey] = canonicalValue;
+    }
+  }
+
+  return base;
+}
+
+function fillAcrossDelimiters(body: string, expanded: Record<string, string>) {
+  let next = body;
+  for (const pattern of PLACEHOLDER_PATTERNS) {
+    next = next.replace(pattern, (_, raw: string) => {
+      const key = toKey(raw);
+      return expanded[key] ? expanded[key] : `[${raw}]`;
+    });
+  }
+
+  next = next.replace(/\[(number of .+?)\]/gi, (_, raw: string) => {
+    const match = /^number of (.+)$/i.exec(raw);
+    if (!match) return `[${raw}]`;
+    const baseKey = toKey(match[1]);
+    const variations = [
+      baseKey,
+      baseKey.replace(/s\b/, ""),
+      baseKey.replace(/s\b/, "") + "s",
+    ];
+    for (const candidate of variations) {
+      if (expanded[candidate]) return expanded[candidate];
+    }
+    return `[${raw}]`;
+  });
+
+  return next;
+}
+
+function escapeHtml(value: string) {
+  return value
+    .replace(/&/g, "&amp;")
+    .replace(/</g, "&lt;")
+    .replace(/>/g, "&gt;")
+    .replace(/\n/g, "<br/>");
+}
+
+async function safeCopy(text: string) {
+  try {
+    if (navigator.clipboard?.writeText) {
+      await navigator.clipboard.writeText(text);
+      return true;
+    }
+  } catch {}
+
+  try {
+    const textarea = document.createElement("textarea");
+    textarea.value = text;
+    textarea.setAttribute("readonly", "");
+    textarea.style.position = "fixed";
+    textarea.style.top = "-9999px";
+    document.body.appendChild(textarea);
+    textarea.focus();
+    textarea.select();
+    const ok = document.execCommand("copy");
+    document.body.removeChild(textarea);
+    return ok;
+  } catch {
+    return false;
+  }
+}
+
+type ChipProps = {
+  label: string;
+  active: boolean;
+  onClick: () => void;
+};
+
+function Chip({ label, active, onClick }: ChipProps) {
+  return (
+    <button
+      type="button"
+      onClick={onClick}
+      className={`chip${active ? " chip--active" : ""}`}
+      title={label}
+    >
+      {label}
+    </button>
+  );
+}
+
+type PromptCardProps = {
+  prompt: Prompt;
+  vars: Record<string, string>;
+};
+
+function PromptCard({ prompt, vars }: PromptCardProps) {
+  const [filled, setFilled] = useState<string | null>(null);
+  const expanded = useMemo(() => buildExpandedVars(vars), [vars]);
+  const currentBody = filled ?? prompt.body;
+
+  return (
+    <article className="prompt-card">
+      <div className="prompt-card__head">
+        <div>
+          <div className="prompt-card__meta">
+            {prompt.category || "Other"}
+          </div>
+          <h3 className="prompt-card__title">{prompt.title}</h3>
+        </div>
+        <div className="prompt-card__actions">
+          <button
+            type="button"
+            className="button"
+            onClick={() => setFilled(fillAcrossDelimiters(prompt.body, expanded))}
+          >
+            Insert listing details
+          </button>
+          <button
+            type="button"
+            className="button button--ghost"
+            onClick={async () => {
+              const ok = await safeCopy(currentBody);
+              if (!ok)
+                alert("Copy blocked. Please select the text and use Cmd/Ctrl + C.");
+            }}
+          >
+            Copy
+          </button>
+        </div>
+      </div>
+
+      <div
+        className="prompt-card__body"
+        dangerouslySetInnerHTML={{ __html: escapeHtml(currentBody) }}
+      />
+
+      {!!(prompt.keywords && prompt.keywords.length) && (
+        <div className="prompt-card__tags">
+          {prompt.keywords!.map((keyword) => (
+            <span key={keyword} className="prompt-card__tag">
+              #{keyword}
+            </span>
+          ))}
+        </div>
+      )}
+    </article>
+  );
+}
+
+export default function App() {
+  const prompts: Prompt[] = useMemo(() => {
+    const list = (rawPrompts as Prompt[]) || [];
+    return list.map((prompt, index) => ({
+      id: String(prompt.id ?? index),
+      title: prompt.title ?? `Untitled #${index + 1}`,
+      category: prompt.category ?? "Other",
+      keywords: Array.isArray(prompt.keywords) ? prompt.keywords : [],
+      body: prompt.body ?? (prompt as any).text ?? (prompt as any).prompt ?? "",
+    }));
+  }, []);
+
+  const allKeywords = useMemo(() => {
+    const set = new Set<string>();
+    prompts.forEach((prompt) =>
+      (prompt.keywords || []).forEach((keyword) => set.add(keyword))
+    );
+    return Array.from(set).sort((a, b) => a.localeCompare(b));
+  }, [prompts]);
+
+  const [search, setSearch] = useState("");
+  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(
+    () => new Set()
+  );
+
+  const [vars, setVars] = useState<Record<string, string>>({
+    "property type": "",
+    address: "",
+    city: "Miami",
+    neighborhood: "",
+    bedrooms: "3",
+    bathrooms: "2",
+    sqft: "",
+    price: "",
+    "hoa fee": "",
+    "year built": "",
+    "lot size": "",
+    "school district": "",
+    "key features": "ocean views, smart-home, chef’s kitchen",
+    "neighborhood characteristics": "",
+    "lifestyle benefits": "",
+    "word count": "170",
+    date: "",
+    "start time": "",
+    "end time": "",
+    "lead source": "",
+  });
+
+  const labels: string[] = [
+    "property type",
+    "address",
+    "city",
+    "neighborhood",
+    "bedrooms",
+    "bathrooms",
+    "sqft",
+    "price",
+    "hoa fee",
+    "year built",
+    "lot size",
+    "school district",
+    "key features",
+    "neighborhood characteristics",
+    "lifestyle benefits",
+    "word count",
+    "date",
+    "start time",
+    "end time",
+    "lead source",
+  ];
+
+  const filteredPrompts = useMemo(() => {
+    const query = search.trim().toLowerCase();
+    return prompts.filter((prompt) => {
+      if (selectedKeywords.size > 0) {
+        const hasKeyword = (prompt.keywords || []).some((keyword) =>
+          selectedKeywords.has(keyword)
+        );
+        if (!hasKeyword) return false;
+      }
+
+      if (!query) return true;
+      const haystack = (
+        prompt.title +
+        "\n" +
+        prompt.body +
+        "\n" +
+        (prompt.keywords || []).join(" ")
+      ).toLowerCase();
+      return haystack.includes(query);
+    });
+  }, [prompts, search, selectedKeywords]);
+
+  const toggleKeyword = (keyword: string) => {
+    setSelectedKeywords((previous) => {
+      const next = new Set(previous);
+      if (next.has(keyword)) next.delete(keyword);
+      else next.add(keyword);
+      return next;
+    });
+  };
+
+  const clearKeywordFilters = () => setSelectedKeywords(new Set());
+
+  const clearInputs = () => {
+    setVars((current) => {
+      const cleared: Record<string, string> = {};
+      Object.keys(current).forEach((key) => {
+        cleared[key] = "";
+      });
+      return cleared;
+    });
+  };
+
+  return (
+    <div className="app-shell">
+      <div className="app-top">
+        <aside className="card">
+          <div className="card__header">
+            <h2 className="card__title">Listing details</h2>
+            <span className="card__badge">Inputs</span>
+          </div>
+
+          <div className="inputs-grid">
+            {labels.map((label) => {
+              const id = `field-${label.replace(/\s+/g, "-")}`;
+              return (
+                <label key={label} className="field" htmlFor={id}>
+                  <span className="field__label">[{label}]</span>
+                  <input
+                    id={id}
+                    value={vars[label] ?? ""}
+                    onChange={(event) =>
+                      setVars((previous) => ({
+                        ...previous,
+                        [label]: event.target.value,
+                      }))
+                    }
+                  />
+                </label>
+              );
+            })}
+          </div>
+
+          <div className="actions">
+            <button type="button" className="button" onClick={clearInputs}>
+              Clear
+            </button>
+          </div>
+        </aside>
+
+        <div className="col-right">
+          <section className="card search-card">
+            <label htmlFor="search">Search</label>
+            <input
+              id="search"
+              value={search}
+              onChange={(event) => setSearch(event.target.value)}
+              placeholder="Search titles, bodies, keywords…"
+            />
+            <p className="muted">
+              Showing {filteredPrompts.length} of {prompts.length}
+            </p>
+          </section>
+
+          <section className="card keywords-card">
+            <div className="card__header" style={{ marginBottom: 0 }}>
+              <h2 className="card__title">Keywords</h2>
+            </div>
+            <div className="chip-grid">
+              {allKeywords.map((keyword) => (
+                <Chip
+                  key={keyword}
+                  label={keyword}
+                  active={selectedKeywords.has(keyword)}
+                  onClick={() => toggleKeyword(keyword)}
+                />
+              ))}
+            </div>
+            {selectedKeywords.size > 0 && (
+              <div className="keyword-summary">
+                Active: {Array.from(selectedKeywords).join(", ")} —{" "}
+                <button
+                  type="button"
+                  className="link-button"
+                  onClick={clearKeywordFilters}
+                >
+                  Clear
+                </button>
+              </div>
+            )}
+          </section>
+        </div>
+      </div>
+
+      <section className="grid-section">
+        {filteredPrompts.length > 0 ? (
+          <div className="grid">
+            {filteredPrompts.map((prompt) => (
+              <PromptCard key={prompt.id} prompt={prompt} vars={vars} />
+            ))}
+          </div>
+        ) : (
+          <div className="empty-state">
+            No prompts match your filters yet. Try adjusting the search or
+            keyword chips.
+          </div>
+        )}
+      </section>
+
+      <footer className="footer">
+        © {new Date().getFullYear()} Busy Realtors Time Saviour — Prompt finder
+        toolkit
+      </footer>
+    </div>
+  );
+}
 
EOF
)
