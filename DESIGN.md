---
name: Kenali Divisimu
description: Kuis Head Office PTPN I. Satu sesi adalah satu perjalanan kereta, 10 soal adalah 10 stasiun.
colors:
  putih: "#ffffff"
  abu: "#f3f5f1"
  garis: "#dce3d9"
  hijau: "#1e7b3c"
  hijau-tua: "#145a2b"
  hijau-muda: "#e3f0e6"
  jingga: "#f39321"
  jingga-tua: "#d97a08"
  tinta: "#2e1b19"
  redup: "#675d5a"
  salah: "#c9372c"
typography:
  display:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "clamp(5.5rem, 3rem + 11vw, 11rem)"
    fontWeight: 700
    lineHeight: 0.82
    fontFeature: "tnum"
  headline:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "clamp(2.6rem, 1.6rem + 4vw, 4.75rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "clamp(1.75rem, 1.3rem + 1.8vw, 2.6rem)"
    fontWeight: 700
    lineHeight: 1.08
  section:
    fontFamily: "Barlow Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  option:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  label:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
rounded:
  badge-sm: "6px"
  badge-md: "8px"
  panel: "10px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  gutter: "20px"
  lg: "32px"
  xl: "44px"
components:
  button-primary:
    backgroundColor: "{colors.jingga}"
    textColor: "{colors.tinta}"
    typography: "{typography.section}"
    rounded: "{rounded.panel}"
    padding: "0 32px"
    height: "64px"
  button-primary-hover:
    backgroundColor: "{colors.jingga-tua}"
    textColor: "{colors.tinta}"
  button-primary-disabled:
    backgroundColor: "{colors.abu}"
    textColor: "{colors.redup}"
  answer-door:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.tinta}"
    typography: "{typography.option}"
    rounded: "{rounded.panel}"
    padding: "12px 16px"
    height: "64px"
  answer-door-hover:
    backgroundColor: "{colors.hijau-muda}"
  answer-door-correct:
    backgroundColor: "{colors.hijau}"
    textColor: "{colors.putih}"
  answer-door-wrong:
    backgroundColor: "{colors.salah}"
    textColor: "{colors.putih}"
  choice-tile:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.panel}"
    padding: "12px"
  choice-tile-selected:
    backgroundColor: "{colors.hijau-muda}"
  input-field:
    backgroundColor: "{colors.abu}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.panel}"
    padding: "0 16px"
    height: "56px"
  input-field-focus:
    backgroundColor: "{colors.putih}"
  line-badge:
    backgroundColor: "{colors.putih}"
    textColor: "{colors.hijau}"
    rounded: "{rounded.badge-md}"
    padding: "0 10px"
    height: "36px"
  line-badge-selected:
    backgroundColor: "{colors.hijau}"
    textColor: "{colors.putih}"
  line-badge-muted:
    backgroundColor: "{colors.abu}"
    textColor: "{colors.redup}"
  station-board:
    backgroundColor: "{colors.hijau}"
    textColor: "{colors.putih}"
    typography: "{typography.title}"
    rounded: "{rounded.panel}"
    padding: "20px"
  route-panel:
    backgroundColor: "{colors.abu}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.panel}"
    padding: "20px 12px 16px"
  service-strip:
    backgroundColor: "{colors.hijau}"
    textColor: "{colors.putih}"
    height: "64px"
---

# Design System: Kenali Divisimu

## Overview

**Creative North Star: "Peta Jalur Divisi"**

Every session is a train journey along the player's own green line: ten questions are ten stations, the player's position is an orange marker, and every answered station gets a stamp. The interface reads like station signage. Enamel-cornered green boards carry the questions, a white ground carries everything else, and the route map is always in sight so progress is never abstract.

The world is bright, signage-flat and legible at arm's length in a noisy room. Density is low on purpose: one board, four doors, one map. Motion is the train's motion. Boards slide in from the right like a carriage pulling in, the marker glides to the next stop and pings once, stamps scale in and settle, and the results screen redraws the whole route station by station. The world rejects the multicoloured tile grid of stock quiz apps and the paper card floating on a navy background.

The PTPN I identity drives the palette. The colours were sampled from the logo wall in the event photos and still need checking against an official guideline. The official logo files are not in the repo yet, so the service strip carries a route glyph and the product name until they arrive.

**Key Characteristics:**
- White ground, green line and boards, orange only for "you, now, go".
- Barlow Condensed for station names, codes and numbers; Barlow for running text.
- 10px enamel-panel corners on every board, door, tile, input and button; circles for stations and answer keys.
- Flat surfaces. Depth comes from tonal layering, not shadows.
- Status is always icon plus colour: filled dot with a check for correct, red ring with a cross for wrong.
- Motion follows the train metaphor and degrades to fades under reduced motion.

## Colors

A signage palette: dominant white, PTPN green as the line and the boards, a small dose of PTPN orange for the player, and a dark maroon ink taken from the wordmark.

### Primary
- **PTPN Line Green** (hijau): the route rail, filled stations, the service strip, the question board, the score board, the departure board, correct answers and correct text. This is the 30%.
- **Deep Line Green** (hijau-tua): the photo well behind the departure-board images and the correct-answer text in review cards.
- **Pale Line Green** (hijau-muda): selected choice tiles, answer-door hover, and the correct-answer card in the review.

### Secondary
- **PTPN Signal Orange** (jingga): the train marker and its arrival ping, the timer bar, primary buttons, the floating point pop, the final-station dot on the departure board, the focus ring and text selection. This is the 10%.
- **Pressed Orange** (jingga-tua): primary button hover.

### Tertiary
- **Wrong-Station Red** (salah): wrong stations (ring plus cross), the wrong-answer door, the "salah" count and error messages. It is a status colour only, never decoration.

### Neutral
- **Signage White** (putih): the page ground (60%), answer doors, and text on green.
- **Platform Grey** (abu): the route-map panel, input fields at rest, disabled buttons and empty-state panels.
- **Door Frame** (garis): 2px borders on doors, tiles and inputs, the empty timer track and the sticky-bar divider.
- **Wordmark Maroon** (tinta): all body text, text on orange, and the A to D answer keys.
- **Muted Maroon** (redup): hints, captions, secondary labels and placeholder text.

### Named Rules
**The 60-30-10 Rule.** Binding, pinned by the user: about 60% white and neutral ground, 30% PTPN green, 10% PTPN orange on every screen. If orange starts to look like a theme colour, it is over budget.

**The Orange Means You Rule.** Orange marks only the player and the player's next move: position, time left, the primary action and points just earned. It is never used for headings or borders, and its only decorative use is the high-score falling leaves.

**The No Blue Rule.** The blue in the PTPN I logo appears only inside the logo itself. It is never used in the UI.

**The Two Signals Rule.** Correct and wrong are never shown by colour alone. Every status carries a check or a cross icon as well.

## Typography

**Display Font:** Barlow Condensed 600/700 (with Barlow, ui-sans-serif)
**Body Font:** Barlow 400/500/600/700 (with ui-sans-serif, system-ui)

**Character:** Barlow Condensed is the station sign: tight, tall, bold and readable at a distance. Barlow is the timetable small print: plain, open and friendly in Indonesian.

### Hierarchy
- **Display** (Condensed 700, clamp 5.5–11rem, 0.82, tabular): the final score on the results board, counted up from zero.
- **Headline** (Condensed 700, clamp 2.6–4.75rem, 0.95, -0.01em, max 16ch, balanced): the start-screen question title.
- **Title** (Condensed 700, clamp 1.75–2.6rem, 1.08, max 30ch, balanced): the question on the station board, and the results verdict (clamp 1.6–2.2rem).
- **Section** (Condensed 700, 1.5rem): fieldset legends, "Perjalananmu" and review prompts. The "Pembahasan" heading steps up to clamp 2.2–3.2rem.
- **Body** (Barlow 400, 1.125rem, 1.625, max 62ch): rules copy and explanations.
- **Option** (Barlow 600, 1.125rem, 1.375): answer-door text and mode labels.
- **Label** (Barlow 500, 0.875rem): station counters, captions, dt labels and hints.

### Named Rules
**The Condensed Speaks Numbers Rule.** Division codes, scores, seconds, station numbers and answer keys use Barlow Condensed bold. Changing numbers (score, timer) are also tabular.

**The Sign Never Shouts Rule.** No uppercase transforms and no wide-tracked labels. Hierarchy comes from the condensed face and size alone. Badges use `tracking-wide` only on division codes.

## Layout

Mobile-first, designed at 390px for the event. Mobile gutters are 20px (16px in the play column), widening to 32–40px from `sm` (640px).

- **Start:** single column on mobile, with the compact departure board placed above the form so the route shows before scrolling. From `lg` (1024px) it splits into the form and a sticky full-height departure board (`1fr` / `minmax(400px, 0.8fr)`). Division tiles run 2 columns, 3 at `sm`, 2 at `lg` and 3 at `xl`. Form groups are spaced 44px apart. The primary button sits in a sticky bottom bar.
- **Play:** centred 880px column. A sticky service strip, then the route panel (full-bleed on mobile, a 10px panel from `sm`), the station board and the answer doors (one column, 2×2 from `sm`, gaps of 8 to 10px). The feedback block below reserves its height so the layout never jumps.
- **Result:** centred 960px column. The score board, the route panel with its summary and the "Main lagi" button, then the review as a vertical green rail with numbered stops. Each review item is a 40px stop column plus content, adding a 300px answer column at `lg`.

## Elevation & Depth

Flat. Depth comes from tonal layering: green boards on a white ground, a grey route panel, and pale-green or white cards inside it. Borders (2px, door frame) separate interactive surfaces from the ground.

### Shadow Vocabulary
- **Train marker** (`box-shadow: 0 1px 4px rgba(46,27,25,0.35)`): only on the orange position dot, so it reads as sitting on top of the rail.

### Named Rules
**The Enamel Is Flat Rule.** Panels, boards, doors and buttons have no shadows. The only exceptions are the train marker above and the sticky submit bar (white at 95% with a light backdrop blur and a door-frame top border).

## Shapes

Two shapes. Every rectangle takes the enamel-panel corner (10px): boards, doors, tiles, inputs, buttons, review cards and the photo well. Every station is a circle: route stops (22px on mobile, 28px from `sm`) with a 3px stroke, 40px review stops, 40px answer keys and the 36px status disc. Rails and the timer are fully rounded bars (6px rails, 10px timer). Division badges use smaller corners at small sizes (6px at sm, 8px at md) and the panel radius at lg/xl. The one organic shape is the falling leaf (a 14×22px leaf with `0 100% 0 100%` corners) in the high-score celebration.

## Components

### Buttons
Bold, wide, and impossible to miss in a crowded room.
- **Shape:** enamel panel (10px), 64px tall on the start bar and 56px elsewhere, full width on mobile.
- **Primary:** orange with maroon ink, Barlow Condensed 700 at 1.5rem with wide tracking, and a trailing arrow that moves 6px right on hover.
- **Hover / Active:** pressed orange; scales to 0.98 on press. 200ms colour and transform transitions.
- **Disabled:** platform grey with muted text, no press scale.
- **Focus:** a global 3px orange outline with a 3px offset.

### Answer Doors
Four framed white doors under the board.
- **Rest:** white, 2px door-frame border, option type, a 40px maroon circular key A–D, min height 64px (80px from `sm`). Hover brings a green border and pale-green fill.
- **Correct:** green fill and white text. The key flips to white with a green check and stamps in, and a "+N" orange pill floats up from the right edge.
- **Wrong pick:** red fill and white text, the key shows a red cross, and the contents shake.
- **Others:** fade to 40% opacity. Doors enter staggered from the right (60ms per step).

### Choice Tiles (division and route)
- **Style:** white with a 2px door-frame border and 10px corners. A muted line badge plus a two-line division name, or a label and hint for the mode.
- **Selected:** green border, pale-green fill, and the badge turns green. Focus shows an orange outline on the tile via `:has(:focus-visible)`.

### Inputs / Fields
- **Style:** 56px tall, platform-grey fill, 2px door-frame border, 10px corners, 1.125rem text, green caret.
- **Focus:** the border turns green and the fill turns white. No outline ring.

### Navigation (Service Strip)
A full-width green strip: 56px on start, 64px in play and result. It holds the line badge, the division name (white at 90%, truncated) and the score or product name on the right. It is sticky in start and play.

### Line Badge (signature)
The division code as a line-name badge on a route map: Barlow Condensed 700, sizes sm/md/lg/xl (28/36/48/80px tall). White on green strips, green when selected, muted grey at rest. On the departure board it stamps in when a division is chosen.

### Route Map (signature)
Ten circular stops on a 6px rail. The rail is green at 25% ahead of the player and solid green behind, filling over 0.7s. Upcoming stops are white with a green ring and a number. The current stop is an empty ring with the orange marker gliding onto it and pinging once. Answered stops stamp in as a filled green disc with a check, or a white disc with a red ring and cross. On the results screen the rail draws from the left over 1.4s and stamps follow at 140ms intervals.

### Station Board / Departure Board
Green enamel panels. The station board holds the question in Title type and slides in from 48px right on each new question. The departure board shows the chosen badge, the division name, a 10-stop white route whose last stop is orange, the passenger and route details, and a crossfading strip of event photos captioned in a green tab.

### Timer
A 10px pill track in door-frame grey with an orange fill that shrinks linearly, next to a Condensed seconds count. In the last 5 seconds the bar pulses in opacity and each second ticks to 1.14 scale.

## Do's and Don'ts

### Do:
- **Do** keep the 60-30-10 ratio: a white ground, green for the line and boards, orange for the player only.
- **Do** put question and score content on green enamel boards with white text, and everything interactive on white or grey with a 2px door-frame border.
- **Do** pair every correct/wrong colour with a check or cross icon and screen-reader text.
- **Do** use the shared ease (`cubic-bezier(0.22, 1, 0.36, 1)`) and the train vocabulary: arrive from the right, stamp, glide and ping, draw the rail.
- **Do** keep feedback alive under reduced motion: remove translation, shaking, leaves and pings, but keep the fades, colour changes and the score count-up.
- **Do** keep secondary text on green at 90% white or stronger.

### Don't:
- **Don't** use the PTPN logo blue anywhere in the UI.
- **Don't** use orange for headings, borders or panel backgrounds. Its only use outside the player signals is one leaf in three in the high-score celebration.
- **Don't** build a multicoloured tile grid for answers or float paper cards on a navy background.
- **Don't** add shadows to panels, boards, doors or buttons.
- **Don't** recreate or approximate the PTPN I logo. Leave the space for the official file.
- **Don't** signal correct or wrong with colour alone.
