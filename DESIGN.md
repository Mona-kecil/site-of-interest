---
name: Site of Interest
description: A published ratings chart for every IDX company, with the method printed beside the marks.
colors:
  ultramarine: "oklch(43% 0.215 268)"
  ultramarine-deep: "oklch(35% 0.18 268)"
  ultramarine-tint: "oklch(91.5% 0.045 268)"
  on-ultramarine-muted: "oklch(88% 0.05 268)"
  flag-red: "oklch(53% 0.205 27)"
  flag-red-tint: "oklch(92.5% 0.04 22)"
  cool-paper: "oklch(97.2% 0.004 250)"
  cool-paper-shade: "oklch(94.6% 0.007 255)"
  sheet-white: "oklch(99.5% 0.002 250)"
  press-ink: "oklch(19% 0.022 265)"
  ink-secondary: "oklch(41% 0.02 265)"
  ink-quiet: "oklch(53% 0.014 265)"
  hairline: "oklch(86% 0.008 260)"
typography:
  display:
    fontFamily: "Libre Franklin Variable, system-ui, sans-serif"
    fontSize: "clamp(36px, 4.5vw, 66px)"
    fontWeight: 850
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  symbol:
    fontFamily: "Libre Franklin Variable, system-ui, sans-serif"
    fontSize: "clamp(52px, 6.4vw, 92px)"
    fontWeight: 850
    lineHeight: 0.9
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Libre Franklin Variable, system-ui, sans-serif"
    fontSize: "clamp(30px, 3vw, 44px)"
    fontWeight: 850
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Libre Franklin Variable, system-ui, sans-serif"
    fontSize: "clamp(24px, 2.3vw, 32px)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  intro:
    fontFamily: "Libre Franklin Variable, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Libre Franklin Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "Libre Franklin Variable, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\", \"lnum\""
  label:
    fontFamily: "Libre Franklin Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  hairline: "3px"
  stamp: "4px"
  pill: "6px"
  control: "8px"
spacing:
  gutter: "clamp(20px, 3.4vw, 48px)"
  column-gap: "32px"
  section: "clamp(80px, 9vw, 128px)"
  wrap: "1280px"
components:
  button-primary:
    backgroundColor: "{colors.press-ink}"
    textColor: "{colors.sheet-white}"
    rounded: "{rounded.control}"
    padding: "0 22px"
    height: "50px"
  button-primary-hover:
    backgroundColor: "{colors.ultramarine}"
    textColor: "{colors.sheet-white}"
  button-outline:
    textColor: "{colors.press-ink}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "46px"
  input:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.press-ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  nav-link:
    textColor: "{colors.on-ultramarine-muted}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  nav-link-active:
    textColor: "{colors.sheet-white}"
  stamp-worth-a-look:
    backgroundColor: "{colors.ultramarine}"
    textColor: "{colors.sheet-white}"
    rounded: "{rounded.stamp}"
    padding: "0 11px"
    height: "30px"
  stamp-red-flags:
    textColor: "{colors.flag-red}"
    rounded: "{rounded.stamp}"
    padding: "0 11px"
    height: "30px"
  stamp-mixed:
    textColor: "{colors.press-ink}"
    rounded: "{rounded.stamp}"
    padding: "0 11px"
    height: "30px"
  stamp-thin:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.stamp}"
    padding: "0 11px"
    height: "30px"
---

# Design System: Site of Interest

## Overview

**Creative North Star: "The Published Test Report"**

Site of Interest reads like an independent testing lab's ratings page printed for the IDX: a table of marks per company, the method printed beside it, and every number traceable to its source. The page is paper and ink first. Color is reserved for two jobs only, interaction and verdicts, so a reader can tell a working control from a reading at a glance.

Density is that of a reference table, not a dashboard. Headlines are set heavy and tight in one family; the data below them is tabular and plain. Ornament is replaced by working marks: Harvey balls, rubber-stamp verdict boxes, and heavy ink rules that open each section. Nothing on a page is decorative if it cannot also be read.

The system refuses the fintech default of a hero, a gradient dashboard mock and three feature cards, and it refuses the earlier dark terminal look this redesign replaced.

**Key Characteristics:**
- Cool paper ground, near-black ink, one ultramarine, red only for flags.
- One typeface, Libre Franklin, served from the app bundle, heavy for headings and tabular for numbers.
- Harvey-ball marks and verdict stamps are the shared vocabulary on every page.
- Sections open on a 4px ink rule; rows separate on hairlines.
- Motion is brief, ease-out, and mostly confined to the landing's chart.

## Colors

A printed palette: cool off-white paper, blue-black ink in three strengths, one saturated ultramarine and one red.

### Primary
- **Ultramarine** (`{colors.ultramarine}`): the masthead band, the Worth a look stamp, focus rings, active tabs, selection, the pass zone of rule lines and the owner block in ownership maps. It marks what can be acted on and the one positive verdict.
- **Deep Ultramarine** (`{colors.ultramarine-deep}`): pass-line labels on the rule rulers, where the full ultramarine would be too light on its tint.
- **Ultramarine Tint** (`{colors.ultramarine-tint}`): focus halos around inputs, the added-ticker row in the ratings chart and the pass zone fill.
- **Muted On-Ultramarine** (`{colors.on-ultramarine-muted}`): inactive masthead links and the data date on the blue band.

### Secondary
- **Flag Red** (`{colors.flag-red}`): flagged marks, the Red flags stamp and readings that cross a flag line. Never used for interaction or emphasis.
- **Flag Red Tint** (`{colors.flag-red-tint}`): the flag zone fill on rule rulers.

### Neutral
- **Cool Paper** (`{colors.cool-paper}`): the page ground everywhere, including pinned table columns.
- **Paper Shade** (`{colors.cool-paper-shade}`): row hover, the selected lookup suggestion and inline code.
- **Sheet White** (`{colors.sheet-white}`): inputs, raised panels, graph and relation-map cards, and text on ultramarine or ink.
- **Press Ink** (`{colors.press-ink}`): body text, headings, section rules, the primary button and the site footer band.
- **Secondary Ink** (`{colors.ink-secondary}`): intros, notes, captions and small print under names.
- **Quiet Ink** (`{colors.ink-quiet}`): Not reported, Not checked and the screener's Does not apply labels, dotted and dashed marks, graph strokes and input outlines. It holds 4.5:1 on paper, paper shade and white; do not lighten it.
- **Hairline** (`{colors.hairline}`): row rules, card outlines and the divider beside pinned columns.

### Named Rules
**The Two Jobs Rule.** Ultramarine means "you can act here" or "Worth a look"; red means "flag". No other hue appears, and neither is used to decorate.

**The Readable Quiet Rule.** The quietest text color still passes 4.5:1. Missing data is shown in Quiet Ink, never hidden or faded further.

## Typography

**Display Font:** Libre Franklin Variable (with system-ui, sans-serif)
**Body Font:** Libre Franklin Variable (with system-ui, sans-serif)

**Character:** One grotesque in two voices: heavy, tightly tracked headlines that read like a report's cover lines, and a plain, tabular body for the numbers underneath.

### Hierarchy
- **Display** (850, `clamp(36px, 4.5vw, 66px)`, 0.98): the landing headline and inner page titles (`clamp(40px, 4.6vw, 66px)`), balanced across two thirds of the grid.
- **Symbol** (850, `clamp(52px, 6.4vw, 92px)`, 0.9): the ticker on a company page, the largest type in the app.
- **Headline** (850, `clamp(30px, 3vw, 44px)`, 1.02): section heads that sit on a 4px ink rule; landing block heads run to `clamp(32px, 3.6vw, 52px)`.
- **Title** (800, `clamp(24px, 2.3vw, 32px)`, 1.08): the five questions and the verdict rules on the landing.
- **Intro** (400, 17px, 1.5): page intros and block standfirsts in Secondary Ink, about 42 to 64 characters wide.
- **Body** (400, 16px, 1.5): running text.
- **Data** (400, 14.5px, tabular lining numbers): every table, with row identifiers at 800.
- **Label** (700, 13px): table headers, field labels and relation-map labels. Small print under names runs 12.5px at 400.

### Named Rules
**The Tabular Rule.** Every number is set with tabular lining figures so columns align without boxes.

**The Wrap Before Shrink Rule.** Long names and sources wrap; type does not shrink below 11px to make them fit.

## Layout

Pages sit in a 1280px wrap with a fluid gutter (`{spacing.gutter}`). Heads use a 12-column grid with a 32px column gap: the title takes the first seven columns and the intro the last five, bottom-aligned, and a 4px ink rule closes the head. Sections are separated by generous vertical space (`{spacing.section}` before the footer and between landing blocks) rather than by boxes.

Tables run full width with hairline row rules and a 1.5px ink rule under the header row. Each row's identifier is pinned on the left while values scroll. At 640px and below, tables size their columns to content, pin a 160px identifier column with a hairline on its right, show a right-edge scroll shadow and print "Swipe for more columns" under the caption; the screener and group tables drop descriptive columns so the first measurements sit beside the company. The ownership graph becomes a top-to-bottom relation list on phones. Heads collapse to one column. The masthead keeps the data date beside the wordmark at 13px and scrolls its links horizontally on a second row.

## Elevation & Depth

The system is flat. Depth comes from tone (paper, paper shade, white) and from rules, not shadows. Outlines are drawn as inset box shadows so they never shift layout.

### Shadow Vocabulary
- **Pop** (`box-shadow: 0 16px 40px -14px oklch(19% 0.04 265 / 0.4), 0 2px 6px oklch(19% 0.04 265 / 0.14)`): only for layers that float over content: the landing's mark callout and the screener's gap tooltip.
- **Scroll edge** (a 14px radial shade of ink at 20% on the right edge of a scrolling table, phones only): signals more columns; it disappears at the end of the scroll.

### Named Rules
**The Flat Page Rule.** Nothing at rest casts a shadow. Pop appears only on layers that float over content.

## Shapes

Corners are small and functional. Controls and cards round at 8px, stamps at 4px, mark buttons and nav pills at 6px, graph nodes and relation-map rows at 3px. Floating layers (the callout and the suggestion list) round at 10px. Marks are drawn on a 24px grid: a full ink disc for a pass, a half disc for partly passes, a red disc with a white cross for flagged, a dotted ring for not reported and a short dash for not checked. Rules are the dominant line: 4px ink for section openings, 1.5px ink under table heads, 1px hairline between rows.

## Components

### Buttons
Confident ink slabs that turn ultramarine under the pointer.
- **Shape:** gently rounded (8px).
- **Primary:** Press Ink fill, Sheet White text, 16px at 700, 50px tall with 22px side padding.
- **Hover / Focus:** fill shifts to Ultramarine over 160ms ease-out on fine pointers; a 2px ultramarine outline at 2px offset on keyboard focus; `scale(0.97)` while pressed.
- **Outline:** transparent with a 1.5px Press Ink inset outline, 46px tall, 15px at 700, for secondary actions such as Show more.

### Verdict Stamps
Rubber-stamp boxes, 30px tall, 4px corners, 14px at 750.
- **Worth a look:** Ultramarine fill, Sheet White text.
- **Red flags:** 2px Flag Red inset outline, red text.
- **Mixed:** 2px Press Ink inset outline.
- **Not enough data:** 1.5px Quiet Ink outline, Secondary Ink text.

### Outcome Marks (signature)
Harvey balls on a 24px grid, the shared reading of every pillar on every page. In the landing chart they fill in row by row (420ms, ease-out) and the stamps land once (320ms); hover or tap opens a callout with the measurement and its pass and flag lines. Reduced motion replaces both with a 200ms fade.

### Inputs / Fields
- **Style:** Sheet White fill, 8px corners, 44px tall (46px for the landing lookup), a 1.5px inset outline in Quiet Ink (Press Ink on the landing lookup).
- **Focus:** a 2px ultramarine inset ring plus a 4px Ultramarine Tint halo.
- **Select:** native select with a drawn chevron 14px from the right.

### Navigation
A solid ultramarine masthead band, 60px tall, with the wordmark at 850, section links at 15px/550 in Muted On-Ultramarine and the Sectors data date on the right, kept on phones so every first screen is dated. The active link gets a 14% white pill (6px corners) and white text; hover shows a 10% white pill on fine pointers. Tabs inside pages use a 3px ultramarine inset underline for the selected lens. The footer is a Press Ink band carrying "Not investment advice." and the data date.

### Tables
Plain reference tables: tabular data at 14.5px, 12px by 14px cells, values right-aligned and names left-aligned, hairline rows, a 1.5px ink rule under the header, Paper Shade on row hover, and the identifier pinned on the left.

### Relation Map
On phones, ownership reads top to bottom on a white card: a Held by list, an arrow, the owner in an ultramarine block, an arrow, and a Holds list. Rows are paper with a Quiet Ink outline, 44px minimum, name left and stake right.

## Do's and Don'ts

### Do:
- **Do** keep the ground Cool Paper and the text Press Ink; reach for Paper Shade or Sheet White before any new color.
- **Do** show every verdict with the shared marks and stamps, and every number with tabular figures.
- **Do** open each major section with a 4px Press Ink rule and a heavy headline.
- **Do** keep motion under 300ms with the ease-out curve (`cubic-bezier(0.23, 1, 0.32, 1)`), except the 420ms mark fill, and gate hover effects behind fine pointers.
- **Do** label missing data in Quiet Ink as Not reported, Not checked or Does not apply.

### Don't:
- **Don't** use Ultramarine or Flag Red for decoration, illustration or emphasis.
- **Don't** add gradients, glass, glows or resting shadows.
- **Don't** introduce a second typeface or load fonts from a third-party host.
- **Don't** lighten Quiet Ink below 4.5:1 on paper.
- **Don't** return to the dark terminal look or the hero, dashboard mock and feature-card landing.
