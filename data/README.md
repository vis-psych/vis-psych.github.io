# VisPsych knowledge model

The interface loads these files at runtime with `fetch()`. Edit the JSON and reload the site; no JavaScript build is required.

The current release is a full working demonstration. The original relationships link to invented evidence records, while 35 added case-linkage and taxonomy relationships use the interface's reviewed-evidence placeholder. All mock values begin with `m-`; they are deliberately not real citations or findings.

Five selected relationships link to three mock studies each to demonstrate one-to-many scholarly support. Evidence remains stored once in `references.json`, while `relationships.json` lists the supporting record IDs in `evidenceRecordIds`.

## Relationship evidence workflow

1. Add a reviewed study to `references.json.records`, following the included `template`.
2. Give the evidence record a stable ID such as `ev-smith-2024-proximity`.
3. Add that ID to the relevant entry in `relationships.json` under `evidenceRecordIds`.
4. Change `curatorStatus` from `evidence-required` to an agreed review status.
5. Record the curator and review date in the evidence record.

Each evidence record has placeholders for:

- paper title, authors, year, DOI and URL
- study type
- participant count, population, expertise and demographics
- visualization case, visualization type, encoding and stimulus
- analytical task
- findings and effect size
- evidence strength and replication status
- curator identity, notes and review date

## Planned extensions

- Deeper ontology levels below the implemented family → concept subcolumns
- Additional visualization cases automatically appear as subrows beneath their `family`
- Generated case pages: `/cases/text-similarity/`
- Interactive demonstrations registered against a stable case ID
- Evidence-derived assessments replacing illustrative strength values
