import { useEffect, useMemo, useState } from "react";
import rawPrompts from "./data/prompts.json";
import "./index.css";

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

const DEFAULT_VARS: Record<ListingField, string> = {
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

type KeywordGroup = {
  category: string;
  keywords: string[];
};

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\[(.+?)\]/g,
  /\{\{(.+?)\}\}/g,
  /\{(.+?)\}/g,
  /<(.+?)>/g,
  /\((.+?)\)/g,
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

function toKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildExpandedVars(vars: Record<string, string>) {
  const base: Record<string, string> = {};
  for (const key of Object.keys(vars)) {
    const value = String(vars[key] ?? "").trim();
    if (!value) continue;
    base[toKey(key)] = value;
  }

  for (const canonical of Object.keys(ALIASES)) {
    const canonicalKey = toKey(canonical);
    if (!base[canonicalKey]) {
      for (const alias of ALIASES[canonical]) {
        const aliasValue = base[toKey(alias)];
        if (aliasValue) {
          base[canonicalKey] = aliasValue;
          break;
        }
      }
    }
  }

  for (const canonical of Object.keys(ALIASES)) {
    const canonicalKey = toKey(canonical);
    const canonicalValue = base[canonicalKey];
    if (!canonicalValue) continue;
    for (const alias of ALIASES[canonical]) {
      const aliasKey = toKey(alias);
      if (!base[aliasKey]) base[aliasKey] = canonicalValue;
    }
  }

  return base;
}

function fillAcrossDelimiters(body: string, expanded: Record<string, string>) {
  let next = body;
  for (const pattern of PLACEHOLDER_PATTERNS) {
    next = next.replace(pattern, (_, raw: string) => {
      const key = toKey(raw);
      return expanded[key] ? expanded[key] : `[${raw}]`;
    });
  }

  next = next.replace(/\[(number of .+?)\]/gi, (_, raw: string) => {
    const match = /^number of (.+)$/i.exec(raw);
    if (!match) return `[${raw}]`;
    const baseKey = toKey(match[1]);
    const variations = [
      baseKey,
      baseKey.replace(/s\b/, ""),
      baseKey.replace(/s\b/, "") + "s",
    ];
    for (const candidate of variations) {
      if (expanded[candidate]) return expanded[candidate];
    }
    return `[${raw}]`;
  });

  return next;
}

function escapeHtml(value: string) {
  return value
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
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

type ChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip${active ? " chip--active" : ""}`}
      title={label}
    >
      {label}
    </button>
  );
}

type PromptCardProps = {
  prompt: Prompt;
  vars: Record<string, string>;
};

function PromptCard({ prompt, vars }: PromptCardProps) {
  const [filled, setFilled] = useState<string | null>(null);
  const expanded = useMemo(() => buildExpandedVars(vars), [vars]);
  const currentBody = filled ?? prompt.body;

  useEffect(() => {
    setFilled(null);
  }, [prompt.body, vars]);

  return (
    <article className="prompt-card">
      <div className="prompt-card__head">
        <div>
          <div className="prompt-card__meta">
            {prompt.category || "Other"}
          </div>
          <h3 className="prompt-card__title">{prompt.title}</h3>
        </div>
        <div className="prompt-card__actions">
          <button
            type="button"
            className="button"
            onClick={() => setFilled(fillAcrossDelimiters(prompt.body, expanded))}
          >
            Insert listing details
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={async () => {
              const ok = await safeCopy(currentBody);
              if (!ok)
                alert("Copy blocked. Please select the text and use Cmd/Ctrl + C.");
            }}
          >
            Copy
          </button>
        </div>
      </div>

      <div
        className="prompt-card__body"
        dangerouslySetInnerHTML={{ __html: escapeHtml(currentBody) }}
      />

      {!!(prompt.keywords && prompt.keywords.length) && (
        <div className="prompt-card__tags">
          {prompt.keywords!.map((keyword) => (
            <span key={keyword} className="prompt-card__tag">
              #{keyword}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export default function App() {
  const prompts: Prompt[] = useMemo(() => {
    const list = (rawPrompts as Prompt[]) || [];
    return list.map((prompt, index) => ({
      id: String(prompt.id ?? index),
      title: prompt.title ?? `Untitled #${index + 1}`,
      category: prompt.category ?? "Other",
      keywords: Array.isArray(prompt.keywords) ? prompt.keywords : [],
      body: prompt.body ?? (prompt as any).text ?? (prompt as any).prompt ?? "",
    }));
  }, []);

  const keywordGroups: KeywordGroup[] = useMemo(() => {
    const map = new Map<string, Set<string>>();

    prompts.forEach((prompt) => {
      const category = (prompt.category || "Other").trim() || "Other";
      if (!map.has(category)) map.set(category, new Set());
      (prompt.keywords || []).forEach((keyword) => {
        if (!keyword) return;
        map.get(category)!.add(keyword);
      });
    });

    return Array.from(map.entries())
      .map(([category, keywords]) => ({
        category,
        keywords: Array.from(keywords).sort((a, b) => a.localeCompare(b)),
      }))
      .filter((group) => group.keywords.length > 0)
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [prompts]);

  const keywordUniverse = useMemo(() => {
    const seen = new Set<string>();
    keywordGroups.forEach((group) => {
      group.keywords.forEach((keyword) => seen.add(keyword));
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [keywordGroups]);

  const [search, setSearch] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(
    () => new Set()
  );

  const activeKeywords = useMemo(
    () => keywordUniverse.filter((keyword) => selectedKeywords.has(keyword)),
    [keywordUniverse, selectedKeywords]
  );

  const selectedKeywordsList = useMemo(
    () => Array.from(selectedKeywords).sort((a, b) => a.localeCompare(b)),
    [selectedKeywords]
  );

  const summaryKeywords =
    activeKeywords.length > 0 ? activeKeywords : selectedKeywordsList;

  const [vars, setVars] = useState<Record<ListingField, string>>({
    ...DEFAULT_VARS,
  });

  const filteredPrompts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return prompts.filter((prompt) => {
      if (selectedKeywords.size > 0) {
        const hasKeyword = (prompt.keywords || []).some((keyword) =>
          selectedKeywords.has(keyword)
        );
        if (!hasKeyword) return false;
      }

      if (!query) return true;
      const haystack = (
        prompt.title +
        "\n" +
        prompt.body +
        "\n" +
        (prompt.keywords || []).join(" ")
      ).toLowerCase();
      return haystack.includes(query);
    });
  }, [prompts, search, selectedKeywords]);

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords((previous) => {
      const next = new Set(previous);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  };

  const clearKeywordFilters = () => setSelectedKeywords(new Set());

  const clearInputs = () => {
    setVars({ ...DEFAULT_VARS });
  };

  return (
    <div className="app-shell">
      <div className="app-top">
        <aside className="card">
          <div className="inputs-grid">
            {LISTING_FIELDS.map((label) => {
              const id = `field-${label.replace(/\s+/g, "-")}`;
              return (
                <label key={label} className="field" htmlFor={id}>
                  <span className="field__label">[{label}]</span>
                  <input
                    id={id}
                    value={vars[label] ?? ""}
                    onChange={(event) =>
                      setVars((previous) => ({
                        ...previous,
                        [label]: event.target.value,
                      }))
                    }
                  />
                </label>
              );
            })}
          </div>

          <div className="actions">
            <button type="button" className="button" onClick={clearInputs}>
              Clear
            </button>
          </div>
        </aside>

        <div className="col-right">
          <section className="card search-card">
            <label htmlFor="search">Search</label>
            <input
              id="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search titles, bodies, keywords…"
            />
            <p className="muted">
              Showing {filteredPrompts.length} of {prompts.length}
            </p>
          </section>

          <section className="card keywords-card">
            <div className="card__header" style={{ marginBottom: 0 }}>
              <h2 className="card__title">Keywords</h2>
            </div>
            <div className="keyword-groups">
              {keywordGroups.length === 0 ? (
                <p className="muted">No keywords available.</p>
              ) : (
                keywordGroups.map(({ category, keywords }) => (
                  <div key={category} className="keyword-group">
                    <h3 className="keyword-group__title">{category}</h3>
                    <div className="chip-grid">
                      {keywords.map((keyword) => (
                        <Chip
                          key={`${category}-${keyword}`}
                          label={keyword}
                          active={selectedKeywords.has(keyword)}
                          onClick={() => toggleKeyword(keyword)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            {selectedKeywords.size > 0 && (
              <div className="keyword-summary">
                Active: {summaryKeywords.join(", ")} —{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={clearKeywordFilters}
                >
                  Clear
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="grid-section">
        {filteredPrompts.length > 0 ? (
          <div className="grid">
            {filteredPrompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} vars={vars} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            No prompts match your filters yet. Try adjusting the search or
            keyword chips.
          </div>
        )}
      </section>

      <footer className="footer">
        © {new Date().getFullYear()} Busy Realtors Time Saviour — Prompt finder
        toolkit
      </footer>
    </div>
  );
}
 
