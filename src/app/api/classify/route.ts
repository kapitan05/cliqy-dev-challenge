import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { ClassifyRequest, ClassifyResponse } from '@/types'

// Model i limit tokenów są zablokowane — nie zmieniaj tych stałych.
const MODEL = 'gpt-4o-mini' as const
const MAX_TOKENS = 300

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ────────────────────────────────────────────────────────────
// POST /api/classify
//
// Wejście (body JSON):
//   { message: string, company: string }
//
// Wyjście (JSON):
//   {
//     category:    "zamówienie" | "pytanie" | "reklamacja" | "spam"
//     priority:    "high" | "medium" | "low"
//     draft_reply: string  — gotowy szkic odpowiedzi po polsku
//     confidence:  number  — 0–1, pewność klasyfikacji
//   }
//
// TODO: Zaimplementuj ten endpoint.
//
// Wskazówki:
//   - Wywołaj openai.chat.completions.create() używając stałych MODEL i MAX_TOKENS
//   - Poproś model o odpowiedź w formacie JSON (response_format lub system prompt)
//   - draft_reply powinien być w tonie pasującym do firmy i kategorii
//   - Zwróć 400 gdy message lub company jest pusty
// ────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse<ClassifyResponse | { error: string }>> {
  const body: ClassifyRequest = await req.json()

  // TODO: Walidacja wejścia
  // if (!body.message || !body.company) { ... }

  // TODO: Wywołaj OpenAI API używając MODEL i MAX_TOKENS
  // const completion = await openai.chat.completions.create({
  //   model: MODEL,
  //   max_tokens: MAX_TOKENS,
  //   ...
  // })

  // TODO: Sparsuj odpowiedź i zwróć ClassifyResponse

  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
