import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoist mock primitives so the vi.mock() factories can reference them
// ---------------------------------------------------------------------------
const { mockParse, MockAPIError } = vi.hoisted(() => {
  const mockParse = vi.fn()

  class MockAPIError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.name = 'APIError'
      this.status = status
    }
  }

  return { mockParse, MockAPIError }
})

vi.mock('openai', () => {
  class MockOpenAI {
    beta = { chat: { completions: { parse: mockParse } } }
    static APIError = MockAPIError
    constructor(_opts: unknown) {}
  }
  return { default: MockOpenAI }
})

vi.mock('openai/helpers/zod', () => ({
  zodResponseFormat: vi.fn().mockReturnValue({ type: 'json_schema', json_schema: {} }),
}))

// Import after mocks are registered
import { POST } from '@/app/api/classify/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

import type { ClassifyResponse } from '@/types'

const VALID_PARSED: ClassifyResponse = {
  category: 'zamówienie',
  priority: 'high',
  draft_reply: 'Dziękujemy za zapytanie.',
  confidence: 0.95,
}

function mockSuccess(overrides: Partial<ClassifyResponse> = {}) {
  mockParse.mockResolvedValueOnce({
    choices: [{ message: { parsed: { ...VALID_PARSED, ...overrides }, refusal: null } }],
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/classify', () => {
  beforeEach(() => mockParse.mockReset())

  // ── Input validation ────────────────────────────────────────────────────

  it('returns 400 when message is an empty string', async () => {
    const res = await POST(makeRequest({ message: '', company: 'Acme' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/required/)
  })

  it('returns 400 when company is an empty string', async () => {
    const res = await POST(makeRequest({ message: 'Hello', company: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when message is whitespace only', async () => {
    const res = await POST(makeRequest({ message: '   ', company: 'Acme' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when company is whitespace only', async () => {
    const res = await POST(makeRequest({ message: 'Hello', company: '   ' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is not valid JSON', async () => {
    const req = new Request('http://localhost/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when fields are missing entirely', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  // ── Successful classification ───────────────────────────────────────────

  it('returns 200 with a valid ClassifyResponse shape', async () => {
    mockSuccess()
    const res = await POST(makeRequest({ message: 'Chcę zamówić 50 sztuk', company: 'Sklep' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      category: 'zamówienie',
      priority: 'high',
      draft_reply: expect.any(String),
      confidence: expect.any(Number),
    })
  })

  it('passes message and company to OpenAI', async () => {
    mockSuccess()
    await POST(makeRequest({ message: 'Test wiadomość', company: 'Firma XYZ' }))
    const callArgs = mockParse.mock.calls[0][0]
    const userMsg = callArgs.messages.find((m: { role: string }) => m.role === 'user')
    expect(userMsg.content).toContain('Firma XYZ')
    expect(userMsg.content).toContain('Test wiadomość')
  })

  // ── Confidence clamping ─────────────────────────────────────────────────

  it('clamps confidence above 1 down to 1', async () => {
    mockSuccess({ confidence: 1.8 })
    const res = await POST(makeRequest({ message: 'Test', company: 'Acme' }))
    expect((await res.json()).confidence).toBe(1)
  })

  it('clamps confidence below 0 up to 0', async () => {
    mockSuccess({ confidence: -0.3 })
    const res = await POST(makeRequest({ message: 'Test', company: 'Acme' }))
    expect((await res.json()).confidence).toBe(0)
  })

  it('leaves confidence within [0, 1] unchanged', async () => {
    mockSuccess({ confidence: 0.72 })
    const res = await POST(makeRequest({ message: 'Test', company: 'Acme' }))
    expect((await res.json()).confidence).toBe(0.72)
  })

  // ── draft_reply fallback ────────────────────────────────────────────────

  it('replaces an empty draft_reply with a fallback string', async () => {
    mockSuccess({ draft_reply: '' })
    const res = await POST(makeRequest({ message: 'Test', company: 'Acme' }))
    const { draft_reply } = await res.json()
    expect(draft_reply.length).toBeGreaterThan(0)
  })

  it('replaces a whitespace-only draft_reply with the fallback', async () => {
    mockSuccess({ draft_reply: '   ' })
    const res = await POST(makeRequest({ message: 'Test', company: 'Acme' }))
    const { draft_reply } = await res.json()
    expect(draft_reply.trim().length).toBeGreaterThan(0)
  })

  // ── Model refusal ───────────────────────────────────────────────────────

  it('returns 500 when model sets refusal', async () => {
    mockParse.mockResolvedValueOnce({
      choices: [{ message: { parsed: null, refusal: 'Content policy violation' } }],
    })
    const res = await POST(makeRequest({ message: 'Test', company: 'Acme' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toMatch(/refused/)
  })

  // ── Empty / missing response ────────────────────────────────────────────

  it('returns 500 when parsed is null and no refusal', async () => {
    mockParse.mockResolvedValueOnce({
      choices: [{ message: { parsed: null, refusal: null } }],
    })
    const res = await POST(makeRequest({ message: 'Test', company: 'Acme' }))
    expect(res.status).toBe(500)
  })

  it('returns 500 when choices array is empty', async () => {
    mockParse.mockResolvedValueOnce({ choices: [] })
    const res = await POST(makeRequest({ message: 'Test', company: 'Acme' }))
    expect(res.status).toBe(500)
  })

  // ── OpenAI API errors ───────────────────────────────────────────────────

  it('propagates OpenAI APIError status code', async () => {
    mockParse.mockRejectedValueOnce(new MockAPIError(429, 'Rate limit exceeded'))
    const res = await POST(makeRequest({ message: 'Test', company: 'Acme' }))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toContain('Rate limit exceeded')
  })

  it('returns 500 for an OpenAI APIError with no status', async () => {
    const err = new MockAPIError(0, 'Unknown API error')
    err.status = 0
    mockParse.mockRejectedValueOnce(err)
    const res = await POST(makeRequest({ message: 'Test', company: 'Acme' }))
    expect(res.status).toBe(500)
  })

  it('returns 500 for unknown errors', async () => {
    mockParse.mockRejectedValueOnce(new Error('Network timeout'))
    const res = await POST(makeRequest({ message: 'Test', company: 'Acme' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBeDefined()
  })
})
