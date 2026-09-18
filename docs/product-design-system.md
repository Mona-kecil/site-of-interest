# Product design system

Site of Interest is a research console. It should feel precise, quiet, and fast. The interface borrows terminal discipline, not terminal cosplay.

## Visual direction

Use a near-black canvas, warm white text, thin rules, and one acid-green status color. Information density is welcome when the hierarchy remains obvious.

Do not add fake window controls, scan-line effects, command prompts, glowing panels, glass blur, decorative gradients, or animated noise. Those effects compete with research data.

## Typography

Use `DM Mono` for numbers, tickers, dates, labels, statuses, and navigation. Use `Manrope` for names, explanations, notes, and long evidence text.

Minimum working sizes:

| Content | Minimum size |
| --- | --- |
| Long body text | 13px |
| Table values | 11px |
| Labels and dates | 9px |
| Interactive navigation | 12px |

Do not shrink text to fit another column. Reduce the number of columns or allow horizontal scrolling inside the table.

## Color roles

Use the variables in `src/styles.css` rather than adding one-off accents.

| Token | Role |
| --- | --- |
| `--ink` | Main canvas |
| `--panel` | Raised working region |
| `--line` | Dividers and table rules |
| `--muted` | Secondary text |
| `--acid` | Selection, checked status, and positive emphasis |
| `--amber` | Partial coverage or a watch state |
| `--blue` | Peer or comparison series |

Red is reserved for negative reported values and failures. Green does not mean “buy.”

## Layout

Build pages around scan paths, not card collections.

- Use a strong page header with subject identity and current research state.
- Show at most four headline metrics per row on desktop.
- Put the primary analysis in the wider column.
- Put coverage, connections, and evidence in the narrower column.
- Separate sections with rules and whitespace.
- Flatten containers that do not need their own interaction or state.

On narrow screens, use one column. A table may scroll inside its own wrapper, but the document must not scroll horizontally.

## Components

### Status labels

Write compact labels in brackets, such as `[status / valuation]`. A status label introduces a section; it does not replace the heading.

### Metrics

Use a definition list. Keep the label, value, and date together. Align numeric values with tabular figures.

### Tables

Use tables for repeated financial periods and exact comparisons. Keep units in the values or the column heading. Highlight negative values without hiding their sign.

### Graphs and maps

Give selection, hover, and keyboard focus distinct states. A visual mark must have a text equivalent in the detail panel.

### Evidence records

Show authenticated Sectors endpoints as plain API references, not links. A source record includes its title, access mode, path, and retrieval date.

### Empty and gap states

State what is missing and name the next research action. Do not use generic empty-state illustrations.

## Motion

Use motion only to preserve spatial context during graph reflow, map elevation, or panel transitions. Keep durations short and honor `prefers-reduced-motion`.

Do not stagger metric cards, pulse status dots, or animate decoration on page load.

## Product language

Write like an analyst recording evidence.

- Name the company, metric, period, and source.
- Separate observation from interpretation.
- Use “not returned by Sectors” instead of “unavailable” when the distinction matters.
- Use “research priority” instead of “opportunity score.”
- Never use “buy”, “sell”, “winner”, “dark horse”, or a price target in system-generated copy.

## Accessibility check

Every route must pass these checks:

- Keyboard focus is visible.
- Text and status colors meet WCAG AA contrast.
- Color is not the only status signal.
- Graphs, maps, and bars have textual values.
- The page has no document-level horizontal overflow at 390px.
- Reduced-motion mode keeps the full workflow usable.

