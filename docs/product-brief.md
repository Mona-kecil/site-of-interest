# Site of Interest product brief

## Product

Site of Interest is a research application for Indonesian conglomerates. It connects each conglomerate's people, public companies, private companies, ownership links, company fundamentals and sourced news.

The product puts related records and calculations in one view. The researcher decides what the data means and which company or event to examine. The product does not recommend a trade or accuse a person or company of wrongdoing.

An **Empire** is the product's record of one conglomerate within a named dataset and retrieval date. A ticker is one entity inside that Empire.

## Primary user

The primary user researches Indonesian public companies through company fundamentals, news, and ownership records. The user needs to answer these questions:

1. Which entities does the dataset connect to this conglomerate?
2. Which relationship establishes each connection?
3. What changed in the public companies?
4. Which formula, inputs, and period produced the measurement?
5. Which source or missing fact should the user inspect next?

## Core research loop

The product supports one loop:

1. Find a measured signal in **What's happening?** for a selected time frame.
2. Open the company record behind the signal.
3. Compare the company's fundamentals and sourced news.
4. Inspect the source records and data gaps.
5. Open **Empire** when ownership and group context matter.
6. Save the finding and open questions in a research case.

Every main workspace must move the user through this loop. A route that displays placeholder content does not count as a product workspace.

## Product workspaces

### What's happening?

**What's happening?** is the home page. Its current feed lists fundamental measurements and exact ticker news matches for the imported Empire for all available records, Today, Yesterday, or a selected date range. Measurement dates come from provider facts; news uses publication dates. A signal detail shows the value or gap, formula version, reporting period, exact inputs, and source locators.

The workspace uses a stable split layout: a scannable record list remains visible beside a persistent detail inspector. Selecting a record updates the inspector without expanding the list or moving surrounding records.

The inspector pins the selected record and its calculation first, then lists the company's fundamental measurements. Each measurement opens its inputs and sources without navigating away. News detail shows entity matches, the source article, and import coverage.

The current feed filters by record kind, Empire, metric, reporting period, and date. It sorts numeric values only after the researcher selects one metric and period with a common unit. Sector, coverage-state, and review-status filters remain future work. It has no composite score.

### Focus

**Focus** is the comparison workspace for listed companies in one Empire. It currently has a Fundamentals board using stored company facts. That board shows the latest annual P/E, provider peer P/E, a premium only when both P/E values are positive, reported quarterly revenue and earnings growth, and latest annual free cash flow. Each value has a fact ID, date, and source locator. Missing or non-comparable values remain visible as gaps. The quarterly growth fields do not identify their reporting quarter.

The Fundamentals board's default research-priority order puts companies with more fundamental board gaps first, then the largest difference between the two reported growth values. Researchers can change its sort, filter for incomplete fundamental board metrics, or filter by a descriptive growth state. The state compares the signs of quarterly revenue and earnings growth; it does not label company quality or predict returns. Opening Focus makes no Sectors request.

### Empire

**Empire** supplies ownership and group context for a signal, company, or news item. It maps one conglomerate from a versioned dataset. The default graph includes entities that the dataset classifies as members of the selected group. A separate boundary view includes outside owners and counterparties.

The Sectors company screener's `affiliates` field is the starting point for each Empire's listed-company universe. The importer stores each returned classification as provider-reported membership. Company reports and ownership records then add private entities, direct stakes, listed descendants, and conflicting evidence. An affiliate match alone never establishes ownership or control.

The graph displays:

- people and business groups;
- listed, private, and operating companies;
- ownership and control relationships;
- group affiliations that have a separate source assertion;
- operating assets returned by the provider;
- signals linked to graph entities; and
- dated company events and news records.

An Empire is complete only with respect to its manifest. The manifest names the provider, retrieval date, discovery rules, traversal limits, included data areas, and unresolved gaps. The product never claims that the manifest contains every real-world interest of a conglomerate.

### Company

A listed-company workspace shows fundamentals, sourced news, ownership context, and coverage.

The **Fundamentals** section is a primary product area. It shows annual financial history, growth, margins, cash flow, leverage, liquidity, return metrics, valuation history, peer comparison, ownership, and corporate actions when the provider returns the required fields. Each sector template lists the metrics it supports. The interface does not compare a company with a metric that its sector template excludes.

A private-company record shows only provider-backed ownership, group membership, assets, events, news, sources, and gaps. It does not display estimated financial statements.

### Research cases

An authenticated user can save a signal or entity to a research case. A case contains notes, open questions, cited records, and a review state of `new`, `reviewed`, `dismissed`, or `resolved`.

A note is user-authored content. It never becomes a provider fact, graph relationship, or system calculation.

## Measured signals

A measured signal is the stored result of a named formula applied to cited records. A signal reports the value, baseline, unit, period, and coverage. It does not label the result as normal, abnormal, positive, negative, suspicious, or important.

Every rule defines:

- the input record types;
- the subject type;
- the observation window;
- the comparison window or reference value;
- the calculation;
- the minimum data coverage;
- the output unit;
- the expiry condition; and
- a version.

Every generated signal stores the rule version, the exact input record references, the calculated value, the observation time, the achieved data coverage, and any coverage gap. A user can reproduce the displayed result from these fields.

### Fundamental signals

The first fundamental rules will cover:

- changes in revenue, earnings, and margins;
- operating cash flow compared with reported earnings;
- changes in leverage and liquidity;
- return on equity or return on capital, according to the sector template;
- P/E, P/BV, EV/EBITDA, and dividend yield when the required provider fields exist;
- valuation against the company's own stored history; and
- valuation against a named peer set and period.

## News and dated events

A news record links to an entity only through a provider ID, ticker, or registered exact alias. The record stores the provider item ID, headline, source name, publication time, event time when stated, matched entity IDs, and match rule. An ambiguous name produces a gap for human review.

Corporate actions use event records rather than news records. A timeline may place a corporate action and a news item next to one another. Their proximity does not prove causation.

The team must inspect the provider response before it defines a new event type or news field. An unavailable field remains absent. The importer does not replace it with text extracted from an unrelated field.

## Evidence policy

Sectors is the only company-data provider in the current build. The checked-in Prajogo corpus uses the company screener's `affiliates` field for initial group discovery, then uses company reports, ownership records, mining records, and one news record to extend and audit the result. The news collector preserves exact ticker matches and import coverage.

Each user-visible claim has one of three states:

- **Fact** is a normalized provider value with a source reference.
- **Calculation** is a deterministic result with cited inputs and a formula version.
- **Gap** names a question that the imported records do not answer.

Site of Interest does not create a fourth state for conclusions. A provider's group classification remains a fact about what the provider reported, not a conclusion endorsed by the app.

The current build does not add company facts from issuer websites, annual reports, external articles, or manual entry. Adding another provider requires a separate source-policy decision and a boundary parser that preserves the provider, item ID, retrieval time, and field locator.

## Delivery status

The current application provides:

- the Prajogo Pangestu Empire graph;
- relationship assertions and Sectors source references;
- listed-company financial, valuation, and calculated measurement records;
- a collector for exact ticker news matches and import coverage;
- a signal feed that opens each measurement's inputs and provider sources; and
- a Focus board for comparing the Prajogo listed companies and opening their records.

**What's happening?** shows fundamental measurements and matched IDX news for the 10 listed companies in the checked-in Prajogo corpus. Selected periods without stored records show an empty state. The app does not yet provide a second Empire, a general event timeline, authentication, or research cases.

The CUAN-to-KJP link records a Sectors news statement that names KJP as a CUAN subsidiary; it does not claim a verified ownership percentage or control. Some legacy company facts still have interpretive labels. The target product retains the cited records and numeric calculations while removing those app-generated interpretations.

The first-Empire path is implemented for stored Prajogo fundamentals and news. Empire context has a visible link back to the originating measurement or news record. Browser specs cover fundamental, news, and Empire navigation.

Current product work stays within the Prajogo Empire. A second Empire is deferred while Sectors credits are limited.

The [ticket sequence](tickets/README.md) defines the first-Empire exit check and credit boundary. Research cases follow after authentication exists.

## Non-goals

- Trade execution, portfolio management, or price targets
- A full technical-analysis terminal
- App-generated conclusions about what a measurement means
- Claims of manipulation, insider activity, coordination, or beneficial ownership without direct evidence
- Hidden signal formulas or unexplained composite scores
- Claims that one imported corpus contains every private interest of a conglomerate
- Placeholder routes that do not complete a step in the core research loop

## Prototype rule

Build product work in the production application. Use a disposable prototype only to compare two or more interaction designs that remain uncertain.

Before writing a prototype, record one question, the alternatives, and a time limit. Do not put provider clients, domain records, or persistence code in the prototype. After the comparison, record the decision, implement the selected interaction in the production route, and delete the prototype.

Do not maintain a second frontend. Git retains discarded experiments.
