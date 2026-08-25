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

    for (const rule of KEYWORD_RULES) {
      const hit = rule.keywords.find((keyword) => haystack.includes(keyword));
      if (hit) {
        // Longer, more specific keyword matches are treated as higher confidence.
        const confidence = Math.min(0.98, 0.75 + hit.length / 100);
        return { category: rule.category, confidence };
      }
    }

    return { category: "Other", confidence: 0.4 };
  }
}

export const categorizationService: CategorizationService = new HeuristicCategorizationService();
