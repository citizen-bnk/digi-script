/**
 * Query/response generation abstraction (PRD 4.7 Chat & Query Interface,
 * Use Case 1: Parent Queries). Production deployments back this with an LLM
 * call over the school's knowledge base (PRD 4.6 — semantic search across
 * embeddings). This mock implementation matches the question against a
 * student's already-categorized documents by keyword, so the conversation
 * pipeline, confidence-threshold escalation, and "source documents" UI
 * contract (docs/design/mobile-app-screens-catalog.md, page 02) are fully
 * exercisable without a vector store or LLM API key.
 */
export interface QueryAnswer {
  answer: string;
  confidence: number;
  sourceDocumentIds: string[];
}

export interface QueryDocument {
  id: string;
  category: string;
  originalFilename: string;
}

export interface QueryService {
  answer(input: { question: string; documents: QueryDocument[] }): Promise<QueryAnswer>;
}

const TOPIC_KEYWORDS: Record<string, string[]> = {
  "Attendance Register": ["attendance", "absent", "present", "late"],
  "Report Card": ["report card", "grade", "grades", "marks", "academic"],
  "Health Record": ["health", "medical", "allergy", "immunization", "medication"],
  "Behavioral / Incident": ["behavior", "behaviour", "incident", "discipline"],
};

export class HeuristicQueryService implements QueryService {
  async answer(input: { question: string; documents: QueryDocument[] }): Promise<QueryAnswer> {
    const q = input.question.toLowerCase();

    const matchedCategory = Object.entries(TOPIC_KEYWORDS).find(([, keywords]) =>
      keywords.some((keyword) => q.includes(keyword)),
    )?.[0];

    if (!matchedCategory) {
      return {
        answer: "I'm not confident I understand that question yet — I'll connect you with a staff member.",
        confidence: 0.3,
        sourceDocumentIds: [],
      };
    }

    const matchingDocs = input.documents.filter((doc) => doc.category === matchedCategory);

    if (matchingDocs.length === 0) {
      return {
        answer: `I couldn't find any ${matchedCategory} documents on file for this student yet — a staff member can check further.`,
        confidence: 0.5,
        sourceDocumentIds: [],
      };
    }

    const confidence = Math.min(0.97, 0.8 + matchingDocs.length * 0.03);
    const fileList = matchingDocs.map((doc) => doc.originalFilename).join(", ");

    return {
      answer: `Based on ${matchingDocs.length} ${matchedCategory} document(s) on file (${fileList}), here's what's available. Let me know if you'd like more detail.`,
      confidence,
      sourceDocumentIds: matchingDocs.map((doc) => doc.id),
    };
  }
}

export const queryService: QueryService = new HeuristicQueryService();
