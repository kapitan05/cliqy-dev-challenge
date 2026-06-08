import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import type { ClassifyRequest, ClassifyResponse } from '@/types'

// Model i limit tokenów są zablokowane — nie zmieniaj tych stałych.
const MODEL = 'gpt-4o-mini' as const
const MAX_TOKENS = 300

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// z.ZodType<ClassifyResponse> enforces compile-time alignment with the shared interface
const ClassifyResponseSchema: z.ZodType<ClassifyResponse> = z.object({
  category: z.enum(['zamówienie', 'pytanie', 'reklamacja', 'spam']),
  priority: z.enum(['high', 'medium', 'low']),
  draft_reply: z.string(),
  confidence: z.number(), 
})

const SYSTEM_PROMPT = `Jesteś asystentem klasyfikacji wiadomości klientów dla polskich firm.

Reguły kategorii:
- zamówienie: zapytanie o zakup, cenę, ilość, rabat
- pytanie: prośba o informację, godziny, dostępność
- reklamacja: skarga, opóźnienie, uszkodzenie, brak paczki
- spam: reklama, oferta zewnętrzna, bezsensowna treść

Reguły priorytetu:
- high: reklamacja LUB zamówienie powyżej 10 sztuk LUB pilny język
- medium: zamówienie standardowe
- low: pytanie, spam

draft_reply musi być po polsku, tonem pasującym do kontekstu firmy, maksymalnie 2 zdania.`

export async function POST(req: Request): Promise<NextResponse<ClassifyResponse | { error: string }>> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const b = body as ClassifyRequest
  if (!b?.message?.trim() || !b?.company?.trim()) {
    return NextResponse.json({ error: 'message and company are required' }, { status: 400 })
  }

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      response_format: zodResponseFormat(ClassifyResponseSchema, 'classify_response'),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Firma: ${b.company}\nWiadomość: ${b.message}` },
      ],
    })

    const message = completion.choices[0]?.message
    if (message?.refusal) {
      return NextResponse.json({ error: `Model refused: ${message.refusal}` }, { status: 500 })
    }

    const parsed = message?.parsed
    if (!parsed) {
      return NextResponse.json({ error: 'Empty model response' }, { status: 500 })
    }
    
    parsed.confidence = Math.min(1, Math.max(0, parsed.confidence))
    if (!parsed.draft_reply.trim()) {
      parsed.draft_reply = "Dziękujemy za kontakt. Wkrótce odpowiemy na Twoją wiadomość."
    }

    return NextResponse.json(parsed)
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      const status = err.status >= 200 && err.status <= 599 ? err.status : 500
      return NextResponse.json({ error: err.message }, { status })
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Response validation failed' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 })
  }
}
