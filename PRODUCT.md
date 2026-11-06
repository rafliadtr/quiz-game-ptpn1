# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Head Office staff of PTPN I (Persero). The quiz launches at a live internal event (a sharing session), where people play together, mostly on their phones. After that it stays open, so anyone can play alone at their desk or on their phone, and new hires can use it to learn the organisation.

Each player picks their own division, so the quiz is always framed as "how well do you know *your* division," with an optional mixed mode that adds questions about other divisions.

## Product Purpose

Kenali Divisimu ("Know Your Division") is a timed multiple-choice quiz about the Head Office structure: what each division code stands for, which sub-divisions sit under it, and who holds which position.

It succeeds when:
- players come away remembering division names, sub-divisions and office-holders, with the post-game review doing the teaching, and
- it works as a light, social icebreaker that people enjoy at the event.

Competition between divisions is not a goal. The leaderboard is a side feature, not the point.

## Positioning

The questions are generated from the company's own org data (divisions, sub-divisions, positions, officials). Nobody writes them by hand. A generic trivia app can't ask "who is Kepala Sub Divisi X in your division?" or set a trap by swapping in a real colleague's name.

## Operating Context

- **At the event:** many people start at once on phones, over office or venue Wi-Fi, in a noisy and social room.
- **After the event:** people play solo whenever they like, on desktop or mobile.
- **One session:** enter a name (optional), pick a division and a mode, answer 10 questions with 15 seconds each, then see the score and a review of every question with its explanation.
- **Keyboard:** players can answer with keys 1–4 on desktop.

## Capabilities and Constraints

- **Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Prisma 7 with MySQL/MariaDB (Laragon locally). The dev server is `npm run dev` on port 3000.
- **Game rules** (`src/lib/game-config.ts`): 10 questions per session, 15 s per question plus 1.5 s grace for latency, 100 base points plus up to 50 speed bonus, and a 2.5 s correct/wrong screen before moving on.
- **Question types** (`src/lib/question-generator.ts`): 28 patterns, and each session uses 10 different ones (at most 3 traps). Regular (19): division expansion and code, fill-in-the-blank expansion and sub-division name, sub-division member / not-member / owner / count, "which division has sub-divisions X and Y", official of a position, position of an official, division of an official, direct boss, same-division colleague, "who is NOT in this division", "who is NOT a Kepala Divisi", true/false, "which statement is TRUE", "which statement is FALSE". Traps (9): swapped name, wrong level, sub-division in the wrong division, fake division name, fake code (head and expansion), spliced sub-division name, numbering past the last one (Aset III, Tim Audit VI), and "one of these sub-division names is wrong". "Tidak ada" also appears as a wrong option in regular questions, so it is the right answer only about half the time. Distractors are picked to look alike (similar codes, colleagues from the same division, spliced or reversed names). Each question records the facts it asks or reveals, so no question in a session gives away another's answer. Small divisions are topped up with questions about other divisions. The answer key stays on the server; the browser only receives `PublicQuestion`. Check with `npx tsx src/scripts/test-generator.ts --check`.
- **Easter egg:** if the player name is `dpsbsb`, `keong` or `atmin` (any case), two of the 10 questions are secret DPSB jokes ("paling kaku", "jomblo") where every option counts as correct. It works with any division. Names and questions are in `easterEggQuestions()` in the generator.
- **Wording:** people in the questions are called *karyawan*, not *pejabat*.
- **Modes:** `own` (own division only) and `mixed` (about 60% own division, the rest from others).
- **Data source** (`prisma/seed.ts`): divisions and expansions from an internal list, sub-divisions from the PTPN I organisational structure document, and names from the May 2026 employee data. Board-level positions (direksi) are excluded. Rows marked `VERIFIKASI` are ambiguous and need checking. Re-seeding wipes all data, including game history.
- **Leaderboard:** the player name is described as appearing "on the card and scoreboard," and sessions are indexed by division and score, but no scoreboard screen exists yet. It is still undecided.
- **Daily challenge:** a seeded RNG exists with a daily challenge in mind. Not built, not decided.
- **Language:** all UI copy is in Bahasa Indonesia (`<html lang="id">`). No other language is planned.
- **Access:** internal only. The data holds real employees' names and positions, so the app must not be public, indexed or shared outside the company.

## Brand Commitments

- **Name:** "Kenali Divisimu", subtitled with "PTPN I Head Office".
- **Official PTPN I identity is required:** the logo and corporate colours must be used. The logo files and colour specs are not in the repo yet, and the user must supply them. Don't recreate or approximate the logo.
- **Voice:** casual Indonesian that speaks to the player as *kamu*, friendly and a little teasing ("Hati-hati, beberapa soal sengaja menjebak"). Results are encouraging and point people to the review rather than scolding them.

## Evidence on Hand

- `public/kebun/sharing-session.jpeg`, `sharing-session2.jpeg`, `sharing-session3.jpeg`: real photos from a PTPN I sharing session, portrait, 2268×4032. They show a speaker in front of the PTPN I logo wall and staff around U-shaped meeting tables.
- `public/kebun/teh-garoet.jpg`, `teh-java.jpg`, `kopi-java.jpg`, `karet-java.jpg`: historical plantation photos from Wikimedia Commons, with licences in `public/kebun/credits.json`. None are shown in the current UI. `teh-garoet.jpg` is CC BY 4.0 and must be credited if it is used again.
- PTPN I logo colours were sampled from the logo wall in the event photos (green, orange, blue leaves; dark maroon wordmark). They have not been checked against an official brand guideline.
- The org structure itself, in the seed.
- There are no testimonials, participation numbers or scores to quote yet. Don't invent any.

## Product Principles

1. **Learning lands in the review.** Every question has an explanation, and the results screen is where knowledge sticks, so it deserves as much care as the game itself.
2. **Fun first, never humiliating.** Questions name real colleagues, and some are traps. Mistakes should feel playful, and no one's score is used to shame them or their division.
3. **Fast to start in a crowded room.** At the event, people should get from link to first question in seconds on a phone. The name is optional, and the start screen asks only for a division and a mode.
4. **The data is the content.** Questions come from the org data, so its accuracy matters more than any feature. Unverified data should be fixed at the source, never worked around in the UI.
5. **It belongs to the company.** Official PTPN I identity and real people's names mean it stays internal and looks like something the company would stand behind.
