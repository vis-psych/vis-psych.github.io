# vis-psych-platform

A deployable static prototype for **https://vis-psych.github.io/**. This README describes platform release **26**.

This demonstration release uses a blue interface palette and a JSON-managed knowledge model. All invented mock values begin with `m-` and must not be treated as real papers, participant data or research findings.

The platform contains 72 relationships. The original 37 relationships link to populated mock evidence records; five of these demonstrate several supporting studies. The 35 newer case-linkage and taxonomy relationships intentionally use the reviewed-evidence placeholder.

The interface consistently uses **relationship** as the user-facing term. The technical data file remains `data/relationships.json`.

> A relationship describes how a visualization design feature may engage a psychological concept, influence a perceptual, cognitive or behavioural outcome, and lead to a design implication, supported or qualified by scholarly evidence.

## Current knowledge-base coverage

| Content | Count |
| --- | ---: |
| Visualization families | 7 |
| Visualization cases | 21 |
| Psychology families | 7 |
| Psychology concepts | 41 |
| Case–psychology relationships | 72 |
| Mock evidence records | 47 |

Every visualization case and every psychology concept has at least one matrix relationship. The seed relationships are demonstrations of the data model, not a systematic literature review.

## What this prototype includes

- **Overview matrix**: Visualization × Psychology
- Expandable concept subcolumns for every psychology family
- Expandable visualization-family subrows
- Three JSON-managed demonstration cases in every visualization family (21 cases total)
- Equal fractional widths for all psychology family and concept columns, fitted within the matrix panel
- Adaptive matrix sizing: up to 15 visible psychology columns fit the frame equally; larger expansions use equal 72 px columns with horizontal scrolling
- Sticky visualization-family/case corner heading and row labels remain visible during horizontal and vertical matrix scrolling
- Case cards list their linked psychology concepts; psychology cards list their linked visualization cases
- Cases and Psychology pages grouped by family, with tasks, evidence summaries and direct links to exact matrix relationships
- Whole case and psychology-concept cards open complete relationship collections; their individual relationship links open exact detail pages
- Seven psychology families and 41 linked concepts, including perception and psychophysics, attention, memory and learning, mental representation, judgement, affect, and persuasion
- Expand/collapse-all and focus-selected controls for large matrix states
- Genuine focus mode hides unrelated cases and concepts, provides an explicit **Exit focus**, and restores the previous expansion state
- Shareable URL state for section, Matrix/Network view, selection, focus, filters, search and row/column expansion
- Full-width overview matrix with no side panel
- Dedicated relationship pages containing the summary, complete chain, evidence and curator metadata
- Dedicated aggregate relationship-list pages for collapsed matrix cells
- Breadcrumbs plus collection-aware Previous/Next relationship navigation
- Dedicated visualization-case and psychological-concept profile pages
- Evidence claim-basis, confidence, synthesis, applicability, provenance, verification and transferability fields
- **Text Similarity** as the running case study
- Local **matrix/network hybrid** exploration
- Matrix / Network switching is shown only on Overview matrix; the selected view is preserved while visiting other sections
- Case, psychology-family and evidence filters
- Search across cases, concepts, design features, tasks and implications
- Browse pages for **Visualization Cases**, **Psychology**, and **Research Gaps**
- Relationship-centred ontology:
  `Visualization case → Design feature → Psychological mechanism → Effect → Task/outcome → Design implication`
- Evidence and context/moderator fields
- Responsive layout and keyboard-accessible primary interactions
- No framework, package manager, backend or database required

## Matrix expansion and sizing

The matrix supports independent expansion of visualization rows and psychology columns:

- A collapsed visualization row represents a visualization family; expanding it reveals its three case subrows.
- A collapsed psychology column represents a psychology family; expanding it reveals that family's concept subcolumns.
- **Expand all**, **Collapse all**, and **Focus selected** controls are available for both axes.
- **Focus selected** shows only the selected visualization case and its currently matching psychological concepts. **Exit focus** restores the preceding expansion state.
- Up to 15 visible psychology columns share the available frame width equally.
- More than 15 visible psychology columns use equal 72 px widths inside the horizontally scrollable matrix frame.
- Dense expanded states use vertical concept labels to preserve readability.
- The **Visualization family / case** corner heading stays fixed at the top-left during horizontal and vertical scrolling.
- Visualization-family and case labels remain fixed on the left while psychology columns scroll beneath their own sticky headers.
- During vertical scrolling, the psychology-family header row remains fixed at the top and the psychology-concept row remains fixed directly below it.
- In the fully collapsed state, the second-row labels (“All Perception”, “All Attention”, etc.) retain an explicit 48 px sticky row and opaque background so they remain visible while scrolling.

## Visualization Cases, Psychology and matrix linkages

The **Visualization Cases** page groups all 21 cases into seven visualization families. Each card shows its tasks, linked psychology concepts, relationship count and evidence-status summary.

The **Psychology** page groups all 41 concepts into seven psychology families. Each card shows its definition, linked visualization cases, relationship count and evidence-status summary.

Case cards and psychology cards also link to stable profile pages (`case.html?id=...` and `psychology.html?id=...`). Profile pages collect definitions, tasks or design features, and every linked relationship.

Selecting a case–concept link on either page opens the same dedicated relationship page used by matrix cells.

All 72 relationships are exposed from both browse routes.

## Relationship interaction

Relationship exploration uses two levels:

Clicking an exact, fully expanded case–concept cell navigates in the same browser tab to `relationship.html?id=RELATIONSHIP_ID`. Clicking a collapsed or otherwise aggregated cell opens `relationship-list.html` with every relationship represented by that cell; selecting a result then opens its exact relationship page. There are no hover or keyboard-focus popups. Dedicated pages provide direct access to Overview matrix, Visualization Cases, Psychology, Research gaps and About.

Recorded DOI values are clickable and open through `https://doi.org/` in a new tab. Values beginning with `m-` remain visibly marked as mock data even though the demonstration link is active.

Relationship pages distinguish claim basis, overall confidence, synthesis status and applicability. Individual records include verification status, inclusion rationale, relationship contribution, limitations and transferability. Controlled vocabulary definitions are stored in `data/evidence-taxonomy.json`.

## Psychology taxonomy

The 41 concepts are organised into:

| Family | Concepts |
| --- | ---: |
| Perception | 8 |
| Attention | 6 |
| Memory & Learning | 8 |
| Cognition & Mental Representation | 9 |
| Judgement & Decision | 6 |
| Emotion & Affect | 2 |
| Social Influence & Persuasion | 2 |

Semiotics, epistemology/philosophy of knowledge, Critical Theory, Actor–Network Theory and visual rhetoric are recorded as adjacent interpretive or sociotechnical lenses rather than psychological mechanisms.

## Files

```text
/
├── index.html
├── styles.css
├── app.js
├── relationship.html
├── relationship.js
├── relationship-list.html
├── relationship-list.js
├── case.html
├── case.js
├── psychology.html
├── psychology.js
├── data/
│   ├── taxonomy.json
│   ├── psychology-concepts.json
│   ├── cases.json
│   ├── relationships.json
│   ├── references.json
│   └── evidence-taxonomy.json
├── schemas/
│   ├── cases.schema.json
│   ├── psychology-concepts.schema.json
│   ├── relationships.schema.json
│   └── references.schema.json
├── scripts/
│   ├── validate-data.mjs
│   └── enrich-evidence.mjs
├── .github/workflows/validate-data.yml
├── README.md
└── .nojekyll
```

## Deploy to GitHub Pages

If `vis-psych.github.io` is the GitHub Pages repository:

1. Back up the existing repository.
2. Copy the contents of this folder to the repository root.
3. Commit and push to the branch currently used by GitHub Pages (commonly `main`).
4. In **Settings → Pages**, ensure the site is deploying from the repository root/appropriate branch or your existing Pages workflow.
5. Open `https://vis-psych.github.io/`.

Because this prototype is plain HTML/CSS/JavaScript, no build command is required.

The release-26 stylesheet and scripts use `?v=26`. All JSON requests also use `?v=26` with `cache: "no-store"`, so GitHub Pages visitors receive the current knowledge model rather than older browser-cached data.

After deployment, the Psychology page should display: **41 psychological concepts across 7 families**. If it does not, confirm that `index.html`, `app.js`, and every file in `data/` were replaced before refreshing the site.

## Preview locally

Python:

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Validate the knowledge model

Run the dependency-free validator before deployment:

```bash
node scripts/validate-data.mjs
```

The GitHub Actions workflow runs this validation and JavaScript syntax checks automatically on pull requests and pushes to `main`.

## Editing the knowledge base

The seed data is separated from the interface:

```text
data/taxonomy.json
data/psychology-concepts.json
data/cases.json
data/relationships.json
data/references.json
```

Each visualization case has:

- `id`
- `name`
- `family`
- `type`
- `description`
- `designFeatures`
- `tasks`
- `contexts`

Each record in `relationships.json` links a case to a psychology concept and includes:

- `caseId`
- `conceptId`
- `evidenceStatus`
- `illustrativeStrength`
- `designFeature`
- `effect`
- `task`
- `outcome`
- `designImplication`
- `caveat`
- `evidenceRecordIds`
- `curatorStatus`
- `curatorNotes`
- proposed stable `caseUrl`

When adding a case or concept, also add at least one corresponding relationship. Otherwise the item can appear on a browse page but will have no active matrix cell or cross-page linkage.

## Adding scholarly evidence

`data/references.json` contains a complete template for evidence records. Add one record per paper or study, then add its ID to the relevant relationship's `evidenceRecordIds` array.

The placeholders cover:

- paper title, authors, year, DOI and URL
- study type
- participant count, population, expertise and demographics
- visualization case, type, encoding and stimulus
- task name and description
- findings and effect size
- evidence strength and replication status
- curator identity, notes and review date

The original 37 demonstration relationships link to fully populated mock evidence records. The 35 later case-linkage and taxonomy relationships deliberately expose the built-in reviewed-evidence placeholder and are marked `m-awaiting-reviewed-evidence`. Replace all mock records and placeholders with verified evidence before scholarly publication.

## Planned knowledge-model extensions

Once evidence records have been curated:

1. Extend the implemented concept subcolumns with deeper ontology levels where needed.
2. Generate stable individual case URLs such as `/cases/text-similarity/`.
3. Add richer interactive demonstrations inside each case study.
4. Replace illustrative strength values with an evidence assessment derived from reviewed studies.

## Important scholarly note

The included relationship data is **illustrative seed content**, not a completed literature review.
Evidence labels and strength scores must be verified and replaced with curated evidence before scholarly publication or public claims.

The evidence schema and placeholders for this extension are now included in `data/references.json` and `data/relationships.json`.

## Suggested next development milestones

1. Add reviewed references/evidence records.
2. Add full case-study pages with stable URLs.
3. Add deeper nested row and column ontology levels where the evidence model requires them.
4. Add cross-case psychology traversal in the network view.
5. Add provenance / curator metadata and versioning.
6. Add JSON-LD export or a formal ontology representation if the project becomes a research infrastructure.

## Verification completed for release 26

- JavaScript syntax and all JSON files validated.
- No duplicate family, case, concept, relationship or reference IDs.
- No broken `caseId`, `conceptId`, psychology-family or evidence-record references.
- All 21 cases and all 41 concepts have relationship coverage.
- All 72 populated relationship IDs resolve to dedicated detail-page URLs.
- Matrix states verified for collapsed, single-family, multi-family and all-expanded columns.
- Sticky corner heading and row labels verified in every expansion state.
- Both psychology header tiers verified as a non-overlapping vertical sticky stack in collapsed, partial and fully expanded states.
- Fully collapsed “All …” subheaders verified at 48 px height before and after vertical scrolling.
- Cell hover and keyboard-focus popups removed from collapsed aggregate, partially expanded and exact case–concept cells.
- Side panel removed and the matrix verified at full workspace width.
- Collapsed and partially aggregated matrix cells navigate to list pages containing every relationship represented by the cell.
- Fully expanded case–concept cells, network concepts, Case/Psychology links and Research Gap cards navigate directly to exact relationship pages.
- Dedicated pages verified for populated mock evidence, multiple studies, evidence placeholders, invalid IDs and clickable DOI links.
- Genuine focus and Exit focus verified with restoration of the preceding expansion state.
- Shareable URL restoration verified for view, selected case, focus, search, filters and expanded axes.
- Breadcrumbs and collection-aware Previous/Next navigation verified.
- Dedicated profiles verified for all 21 visualization cases and all 41 psychology concepts.
- Evidence taxonomy and provenance fields validated across all 72 relationships and 47 mock records.
- JSON schemas parse successfully; the dependency-free validator and GitHub Actions checks pass.
