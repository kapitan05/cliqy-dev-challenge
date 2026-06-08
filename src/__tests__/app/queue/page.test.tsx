// @vitest-environment jsdom
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import QueuePage from '@/app/queue/page'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

function renderPage() {
  render(<QueuePage />)
}

function getCards() {
  return screen.getAllByRole('article')
}

// ─────────────────────────────────────────────────────────────────────────────

describe('QueuePage', () => {
  describe('initial render', () => {
    it('renders all 3 seed items', () => {
      renderPage()
      expect(getCards()).toHaveLength(3)
    })

    it('shows "3 oczekujących" in the header', () => {
      renderPage()
      expect(screen.getByText(/3 oczekujących/)).toBeInTheDocument()
    })

    it('renders all category filter buttons', () => {
      renderPage()
      for (const label of ['Wszystkie', 'zamówienie', 'pytanie', 'reklamacja', 'spam']) {
        expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
      }
    })

    it('renders each card with message, draft, and action buttons', () => {
      renderPage()
      const card = getCards()[0]
      expect(within(card).getByText(/chciałbym zamówić 50 sztuk/)).toBeInTheDocument()
      expect(within(card).getByText(/Dziękujemy za zainteresowanie/)).toBeInTheDocument()
      expect(within(card).getByRole('button', { name: /Zatwierdź/ })).toBeInTheDocument()
      expect(within(card).getByRole('button', { name: /Edytuj/ })).toBeInTheDocument()
      expect(within(card).getByRole('button', { name: /Odrzuć/ })).toBeInTheDocument()
    })
  })

  // ── Category filter ───────────────────────────────────────────────────────

  describe('category filter', () => {
    it('shows only reklamacja items when that filter is active', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: 'reklamacja' }))
      expect(getCards()).toHaveLength(1)
      expect(screen.getByText(/Kiedy przyjedzie moja paczka/)).toBeInTheDocument()
    })

    it('shows empty state when no items match the filter', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: 'spam' }))
      expect(screen.queryAllByRole('article')).toHaveLength(0)
      expect(screen.getByText(/Brak elementów/)).toBeInTheDocument()
    })

    it('restores all items after switching back to Wszystkie', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: 'reklamacja' }))
      fireEvent.click(screen.getByRole('button', { name: 'Wszystkie' }))
      expect(getCards()).toHaveLength(3)
    })
  })

  // ── Approve ───────────────────────────────────────────────────────────────

  describe('approve action', () => {
    it('shows "Zatwierdzone" label and hides action buttons after approval', () => {
      renderPage()
      const card = getCards()[0]
      fireEvent.click(within(card).getByRole('button', { name: /Zatwierdź/ }))
      expect(within(card).getByText(/Zatwierdzone/)).toBeInTheDocument()
      expect(within(card).queryByRole('button', { name: /Zatwierdź/ })).not.toBeInTheDocument()
      expect(within(card).queryByRole('button', { name: /Odrzuć/ })).not.toBeInTheDocument()
    })

    it('decrements the pending count by 1', () => {
      renderPage()
      fireEvent.click(within(getCards()[0]).getByRole('button', { name: /Zatwierdź/ }))
      expect(screen.getByText(/2 oczekujących/)).toBeInTheDocument()
    })
  })

  // ── Reject ────────────────────────────────────────────────────────────────

  describe('reject action', () => {
    it('shows "Odrzucone" label and hides action buttons after rejection', () => {
      renderPage()
      const card = getCards()[1]
      fireEvent.click(within(card).getByRole('button', { name: /Odrzuć/ }))
      expect(within(card).getByText(/Odrzucone/)).toBeInTheDocument()
      expect(within(card).queryByRole('button', { name: /Odrzuć/ })).not.toBeInTheDocument()
    })

    it('decrements the pending count by 1', () => {
      renderPage()
      fireEvent.click(within(getCards()[0]).getByRole('button', { name: /Odrzuć/ }))
      expect(screen.getByText(/2 oczekujących/)).toBeInTheDocument()
    })
  })

  // ── Edit mode ─────────────────────────────────────────────────────────────

  describe('edit mode', () => {
    it('shows a textarea pre-filled with the current draft on Edytuj', () => {
      renderPage()
      const card = getCards()[0]
      fireEvent.click(within(card).getByRole('button', { name: /Edytuj/ }))
      const textarea = within(card).getByRole('textbox') as HTMLTextAreaElement
      expect(textarea).toBeInTheDocument()
      expect(textarea.value).toContain('Dziękujemy za zainteresowanie')
    })

    it('hides Zatwierdź and Odrzuć while in edit mode', () => {
      renderPage()
      const card = getCards()[0]
      fireEvent.click(within(card).getByRole('button', { name: /Edytuj/ }))
      expect(within(card).queryByRole('button', { name: /Zatwierdź/ })).not.toBeInTheDocument()
      expect(within(card).queryByRole('button', { name: /Odrzuć/ })).not.toBeInTheDocument()
    })

    it('shows Zapisz and Anuluj while in edit mode', () => {
      renderPage()
      const card = getCards()[0]
      fireEvent.click(within(card).getByRole('button', { name: /Edytuj/ }))
      expect(within(card).getByRole('button', { name: /Zapisz/ })).toBeInTheDocument()
      expect(within(card).getByRole('button', { name: /Anuluj/ })).toBeInTheDocument()
    })

    it('updates draft_reply and exits edit mode on Zapisz', () => {
      renderPage()
      const card = getCards()[0]
      fireEvent.click(within(card).getByRole('button', { name: /Edytuj/ }))
      fireEvent.change(within(card).getByRole('textbox'), {
        target: { value: 'Nowy szkic odpowiedzi.' },
      })
      fireEvent.click(within(card).getByRole('button', { name: /Zapisz/ }))
      expect(within(card).queryByRole('textbox')).not.toBeInTheDocument()
      expect(within(card).getByText('Nowy szkic odpowiedzi.')).toBeInTheDocument()
    })

    it('discards changes and exits edit mode on Anuluj', () => {
      renderPage()
      const card = getCards()[0]
      fireEvent.click(within(card).getByRole('button', { name: /Edytuj/ }))
      fireEvent.change(within(card).getByRole('textbox'), {
        target: { value: 'Zmieniony tekst' },
      })
      fireEvent.click(within(card).getByRole('button', { name: /Anuluj/ }))
      expect(within(card).queryByRole('textbox')).not.toBeInTheDocument()
      expect(within(card).queryByText('Zmieniony tekst')).not.toBeInTheDocument()
      expect(within(card).getByText(/Dziękujemy za zainteresowanie/)).toBeInTheDocument()
    })

    it('only one card can be in edit mode at a time', () => {
      renderPage()
      const [card1, card2] = getCards()
      fireEvent.click(within(card1).getByRole('button', { name: /Edytuj/ }))
      fireEvent.click(within(card2).getByRole('button', { name: /Edytuj/ }))
      expect(within(card1).queryByRole('textbox')).not.toBeInTheDocument()
      expect(within(card2).getByRole('textbox')).toBeInTheDocument()
    })
  })
})
