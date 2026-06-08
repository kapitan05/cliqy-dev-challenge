'use client'

import { useState, useEffect } from 'react'
import type { QueueItem, MessageStatus, MessageCategory, ClassifyResponse } from '@/types'

const SEED_ITEMS: QueueItem[] = [
  {
    id: '1',
    message: 'Dzień dobry, chciałbym zamówić 50 sztuk produktu X. Czy możliwy jest rabat przy takiej ilości?',
    company: 'Sklep meblowy Premium',
    category: 'zamówienie',
    priority: 'high',
    draft_reply:
      'Dzień dobry! Dziękujemy za zainteresowanie naszą ofertą. Przy zamówieniu 50 sztuk produktu X przysługuje rabat 15%. Czy mogę poprosić o dane do wyceny?',
    confidence: 0.94,
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    message: 'Kiedy przyjedzie moja paczka? Zamówiłam tydzień temu i nic.',
    company: 'Sklep meblowy Premium',
    category: 'reklamacja',
    priority: 'high',
    draft_reply:
      'Przepraszamy za niedogodności. Proszę o numer zamówienia — sprawdzimy status wysyłki i wrócimy do Pani w ciągu 2 godzin.',
    confidence: 0.91,
    status: 'pending',
    created_at: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: '3',
    message: 'Jakie są godziny otwarcia w weekend?',
    company: 'Sklep meblowy Premium',
    category: 'pytanie',
    priority: 'low',
    draft_reply: 'Jesteśmy otwarci w soboty w godz. 10:00–18:00. W niedziele sklep jest nieczynny.',
    confidence: 0.98,
    status: 'pending',
    created_at: new Date(Date.now() - 300_000).toISOString(),
  },
]

const CATEGORY_STYLES: Record<MessageCategory, string> = {
  zamówienie: 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40',
  pytanie: 'bg-blue-900/40 text-blue-400 border border-blue-700/40',
  reklamacja: 'bg-red-900/40 text-red-400 border border-red-700/40',
  spam: 'bg-zinc-800 text-zinc-500 border border-zinc-700',
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-zinc-500',
}

const STORAGE_KEY = 'cliqy_queue_items'

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>(SEED_ITEMS)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const [filter, setFilter] = useState<MessageCategory | 'all'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState<string>('')

  // ── Add-message form ──────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState<boolean>(false)
  const [formCompany, setFormCompany] = useState<string>('')
  const [formMessage, setFormMessage] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Load from localStorage once on first client mount only.
  // Runs after hydration so SSR and client HTML always match on first paint.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setItems(JSON.parse(stored) as QueueItem[])
      }
    } catch {
      // Corrupted storage — fall back to seed data already in state
    }
    setIsLoaded(true)
  }, [])

  // Persist to localStorage whenever items change, but only after the
  // initial load so we never overwrite storage with the SSR seed state.
  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage quota exceeded or unavailable — silently ignore
    }
  }, [items, isLoaded])

  function handleAction(id: string, action: MessageStatus) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action } : item)),
    )
  }

  function handleEditReply(id: string, newReply: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, draft_reply: newReply } : item)),
    )
  }

  function startEditing(item: QueueItem) {
    setEditingId(item.id)
    setEditText(item.draft_reply)
  }

  function saveEdit(id: string) {
    handleEditReply(id, editText)
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleSubmitMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setFormError(null)
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: formMessage, company: formCompany }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setFormError(data.error ?? `Błąd serwera (${res.status})`)
        return
      }
      const classified = (await res.json()) as ClassifyResponse
      const newItem: QueueItem = {
        ...classified,
        id: crypto.randomUUID(),
        message: formMessage,
        company: formCompany,
        status: 'pending',
        created_at: new Date().toISOString(),
      }
      setItems((prev) => [newItem, ...prev])
      setFormMessage('')
      setFormCompany('')
      setFormOpen(false)
    } catch {
      setFormError('Nie udało się połączyć z serwerem.')
    } finally {
      setIsLoading(false)
    }
  }

  const visible = filter === 'all' ? items : items.filter((i) => i.category === filter)
  const pending = items.filter((i) => i.status === 'pending').length

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      {/* ── Header ─────────────────────────── */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Cliqy Studio</p>
        <h1 className="text-2xl font-bold text-zinc-100">Panel weryfikacji</h1>
        <p className="text-zinc-400 mt-1 text-sm">
          {pending} oczekujących · {items.length} łącznie
        </p>
      </div>

      {/* ── Formularz dodawania ───────────────── */}
      <div className="mb-6">
        <button
          onClick={() => { setFormOpen((v) => !v); setFormError(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-colors"
        >
          <span className="text-base leading-none">{formOpen ? '−' : '+'}</span>
          Dodaj wiadomość
        </button>

        {formOpen && (
          <form
            onSubmit={handleSubmitMessage}
            className="mt-3 p-4 rounded-xl border flex flex-col gap-3"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1">
                Firma
              </label>
              <input
                type="text"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                required
                placeholder="np. Sklep meblowy Premium"
                className="w-full text-sm text-zinc-200 bg-zinc-900/60 border border-zinc-700 rounded-lg px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1">
                Wiadomość
              </label>
              <textarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                required
                rows={3}
                placeholder="Wklej lub wpisz wiadomość od klienta…"
                className="w-full text-sm text-zinc-200 bg-zinc-900/60 border border-zinc-700 rounded-lg px-3 py-2 resize-none placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            {formError && (
              <p className="text-xs text-red-400">{formError}</p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'AI analizuje…' : 'Klasyfikuj i dodaj'}
              </button>
              <button
                type="button"
                onClick={() => { setFormOpen(false); setFormError(null) }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 transition-colors"
              >
                Anuluj
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Filtr kategorii ────────────────── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'zamówienie', 'pytanie', 'reklamacja', 'spam'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === cat
                ? 'bg-white text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {cat === 'all' ? 'Wszystkie' : cat}
          </button>
        ))}
      </div>

      {/* ── Lista elementów ────────────────── */}
      <div className="flex flex-col gap-4" aria-busy={!isLoaded}>
        {!isLoaded && (
          <p className="text-zinc-600 text-sm py-12 text-center">Ładowanie…</p>
        )}

        {isLoaded && visible.length === 0 && (
          <p className="text-zinc-500 text-sm py-12 text-center">Brak elementów w tej kategorii.</p>
        )}

        {isLoaded && visible.map((item) => {
          const isEditing = editingId === item.id

          return (
            <article
              key={item.id}
              className={`rounded-xl border p-5 transition-opacity ${
                item.status !== 'pending' ? 'opacity-50' : ''
              }`}
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              {/* Nagłówek karty */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLES[item.category]}`}>
                    {item.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[item.priority]}`} />
                    {item.priority}
                  </span>
                  <span className="text-xs text-zinc-600">{item.company}</span>
                </div>
                {/* suppressHydrationWarning: seed data uses new Date() at module load time,
                    which differs between server and client renders */}
                <span suppressHydrationWarning className="text-xs text-zinc-600 shrink-0">
                  {new Date(item.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Wiadomość klienta */}
              <div className="mb-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Wiadomość</p>
                <p className="text-sm text-zinc-200">{item.message}</p>
              </div>

              {/* Draft AI */}
              <div className="mb-4 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                  Draft AI · {Math.round(item.confidence * 100)}% pewności
                </p>
                {isEditing ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full text-sm text-zinc-300 bg-transparent border border-zinc-700 rounded-md p-2 resize-none focus:outline-none focus:border-zinc-500"
                  />
                ) : (
                  <p className="text-sm text-zinc-300">{item.draft_reply}</p>
                )}
              </div>

              {/* Akcje */}
              {item.status === 'pending' && (
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveEdit(item.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-900/40 text-blue-400 border border-blue-700/40 hover:bg-blue-800/50 transition-colors"
                      >
                        💾 Zapisz
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 transition-colors"
                      >
                        Anuluj
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleAction(item.id, 'approved')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 hover:bg-emerald-800/50 transition-colors"
                      >
                        ✅ Zatwierdź
                      </button>
                      <button
                        onClick={() => startEditing(item)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-colors"
                      >
                        ✏️ Edytuj
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/40 text-red-400 border border-red-700/40 hover:bg-red-800/50 transition-colors"
                      >
                        ❌ Odrzuć
                      </button>
                    </>
                  )}
                </div>
              )}

              {item.status !== 'pending' && (
                <p className="text-xs text-zinc-600 italic">
                  {item.status === 'approved' ? '✅ Zatwierdzone' : '❌ Odrzucone'}
                </p>
              )}
            </article>
          )
        })}
      </div>
    </main>
  )
}
