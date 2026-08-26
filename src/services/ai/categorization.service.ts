/**
 * AI categorization abstraction (PRD 4.4). Production deployments back this
 * with an LLM call (document text -> category + confidence). This mock
 * implementation uses keyword heuristics so the core ingestion pipeline,
 * confidence-threshold routing, and escalation queue are fully exercisable
 * without an LLM API key. Swap CategorizationService for an LLM-backed
 * implementation without touching the ingestion pipeline.
 */
export interface CategorizationResult {
  category: string;
  confidence: number;
  // Short human-readable reasons, shown as the "why we think this" list on
  // the AI Categorization screen (docs/design/mobile-app-screens-catalog.md, page 04).
  reasons: string[];
}

export interface CategorizationService {
  categorize(input: { filename: string; textSample?: string }): Promise<CategorizationResult>;
}

const KEYWORD_RULES: Array<{ category: string; keywords: string[] }> = [
  { category: "Health Record", keywords: ["health", "medical", "immunization", "allergy", "epipen", "vaccine"] },
  { category: "Report Card", keywords: ["report card", "term result", "grades", "academic report"] },
  { category: "Attendance Register", keywords: ["attendance", "absent", "present", "register"] },
  { category: "Behavioral / Incident", keywords: ["incident", "behavior", "behaviour", "disciplinary"] },
  { category: "Financial - Expense Invoice", keywords: ["invoice", "receipt", "expense", "purchase order"] },
  { category: "HR - Leave Request", keywords: ["leave request", "leave application", "sick leave"] },
  { category: "Compliance - Absence Note", keywords: ["absence note", "doctor note", "medical certificate"] },
];

export class HeuristicCategorizationService implements CategorizationService {
  async categorize(input: { filename: string; textSample?: string }): Promise<CategorizationResult> {
    const haystack = `${input.filename} ${input.textSample ?? ""}`.toLowerCase();

    // The longest match across every rule wins, not the first rule that
    // happens to match. Taking the first would let a coarse keyword in an
    // earlier rule beat a specific one later in the list — "absent" claiming
    // an absence note for Attendance Register — which contradicts the
    // confidence formula below, where a longer match already means a more
    // specific one.
    let best: { category: string; keyword: string } | null = null;
    for (const rule of KEYWORD_RULES) {
      for (const keyword of rule.keywords) {
        if (haystack.includes(keyword) && (best === null || keyword.length > best.keyword.length)) {
          best = { category: rule.category, keyword };
        }
      }
    }

    if (best) {
      const confidence = Math.min(0.98, 0.75 + best.keyword.length / 100);
      return {
        category: best.category,
        confidence,
        reasons: [
          `Contains "${best.keyword}"-related keywords`,
          `Matches the "${best.category}" naming pattern`,
        ],
      };
    }

    return { category: "Other", confidence: 0.4, reasons: ["No matching category keywords found"] };
  }
}

export const categorizationService: CategorizationService = new HeuristicCategorizationService();
