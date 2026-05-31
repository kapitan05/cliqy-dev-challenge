# Cliqy Studio — Dev Challenge

> **Czas:** maksymalnie 3 godziny  
> **Deadline:** 7 dni od otrzymania zaproszenia  
> **Stack:** Next.js 15 · TypeScript · OpenAI API

---

## Kontekst

[Cliqy Studio](https://studio.cliqy.ai) buduje systemy automatyzacji AI dla polskich firm (10–100 osób).

Jeden z produktów to **Panel Weryfikacji** — operator widzi wiadomości od klientów razem z draftem odpowiedzi wygenerowanym przez AI i zatwierdza je jednym kliknięciem przed wysyłką. System używany jest m.in. w agencjach, sklepach e-commerce i firmach logistycznych.

Twoim zadaniem jest zbudowanie mini wersji tego systemu.

---

## Setup (5 minut)

```bash
# 1. Sklonuj repo
git clone https://github.com/clickandgrowpl/cliqy-dev-challenge
cd cliqy-dev-challenge

# 2. Zainstaluj zależności
npm install

# 3. Skonfiguruj klucz API
cp .env.example .env.local
# Otwórz .env.local i wpisz swój klucz OpenAI (platform.openai.com/api-keys)
# Free tier wystarczy — zadanie używa gpt-4o-mini, koszt kilku centów

# 4. Uruchom serwer developerski
npm run dev
# → http://localhost:3000
```

Po uruchomieniu zobaczysz stronę `/queue` z przykładowymi danymi — to punkt startowy UI.

---

## Zadanie

### Krok 1 — Endpoint klasyfikacji (≈ 45 min)

Zaimplementuj `src/app/api/classify/route.ts`.

**Wejście:**
```json
{ "message": "string", "company": "string" }
```

**Wyjście:**
```json
{
  "category": "zamówienie" | "pytanie" | "reklamacja" | "spam",
  "priority": "high" | "medium" | "low",
  "draft_reply": "string (gotowy szkic po polsku)",
  "confidence": 0.0–1.0
}
```

Typy są już zdefiniowane w `src/types/index.ts` — nie zmieniaj ich.

**Kryteria akceptacji:**
- Zwraca poprawny JSON dla każdej z 4 kategorii
- `draft_reply` jest po polsku i pasuje tonem do firmy i kategorii
- Zwraca `400` gdy `message` lub `company` jest pusty
- `confidence` jest liczbą między 0 a 1

---

### Krok 2 — Kolejka weryfikacji (≈ 60 min)

Zaimplementuj `src/app/queue/page.tsx`.

Szkielet komponentu jest już gotowy z przykładowymi danymi i strukturą UI.

**Kryteria akceptacji:**
- Lista wiadomości z widocznym: oryginał + draft AI + kategoria + priorytet
- Przycisk **✅ Zatwierdź** → zmienia status na `approved`
- Przycisk **❌ Odrzuć** → zmienia status na `rejected`
- Przycisk **✏️ Edytuj** → pozwala zmienić treść `draft_reply` przed zatwierdzeniem
- Filtrowanie po kategorii działa
- Stan zarządzany przez React (bez zewnętrznych bibliotek do state managementu)

---

### Krok 3 — Twoja funkcja (≈ 30 min)

Dodaj **jedną** funkcję, którą sam/a uznasz za wartościową.

Kilka pomysłów (wybierz jeden lub zaproponuj własny):
- Formularz do ręcznego dodawania wiadomości → wywołuje `/api/classify` → dodaje do kolejki
- Licznik statystyk: ile zatwierdzonych / odrzuconych / oczekujących
- Skrót klawiaturowy (np. `A` = zatwierdź, `R` = odrzuć) dla przyspieszenia pracy
- Eksport zatwierdzonych odpowiedzi do pliku CSV
- Animacja/toast po akcji z opcją "Cofnij"

W `SUBMISSION.md` napisz co wybrałeś/aś i dlaczego.

---

## Zgłoszenie

### Plik `SUBMISSION.md` (utwórz w root katalogu projektu)

```markdown
## Krok 3 — co zrobiłem/am i dlaczego
[2–3 zdania]

## AI — jak używałem/am narzędzi
- Narzędzia: [np. Cursor, Claude Code, Copilot]
- Prompt który zadziałał najlepiej: [wklej dosłownie]
- Gdzie AI się pomylił/a i co poprawiłem/am ręcznie: [konkretny przykład]
- Szacowany udział AI w kodzie: [np. 70% wygenerowane, 30% napisane ręcznie]
```

### Co wysyłasz

Odpowiedz na email rekrutacyjny:
1. **Link do swojego repo** na GitHubie (publiczne lub dostęp dla `b.podgorski`)
2. **Treść `SUBMISSION.md`** wklejona bezpośrednio w mailu

---

## Kryteria oceny

| Kryterium | Waga |
|---|---|
| Endpoint działa poprawnie (klasyfikacja + draft) | 35% |
| UI kolejki — akcje działają, state zarządzany poprawnie | 30% |
| Krok 3 — pomysłowość i wykonanie | 20% |
| AI writeup — konkretność (prawdziwy prompt, gdzie AI się mylił) | 15% |

**TypeScript:** strict mode jest włączony — `tsc --noEmit` powinno przejść bez błędów.

---

## Pytania

Pisz bezpośrednio na **b.podgorski@mycliqy.com** — odpowiadam w ciągu kilku godzin.

Powodzenia!

---

*Cliqy Studio · studio.cliqy.ai · BMP Software sp. z o.o.*
