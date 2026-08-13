(async () => {
  "use strict";
  const DATA_VERSION = "26";
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const loadJson = async path => {
    const response = await fetch(`${path}?v=${DATA_VERSION}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load ${path}`);
    return response.json();
  };
  const root = document.getElementById("relationship-page");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const collectionIds = [...new Set((params.get("collection") || "").split(",").filter(Boolean))];
  const collectionRow = params.get("row") || "Visualization cases";
  const collectionColumn = params.get("column") || "Psychology concepts";
  const collectionFrom = ["overview", "cases", "psychology"].includes(params.get("from")) ? params.get("from") : "overview";

  function evidenceLabel(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Not assessed"; }
  function doiLink(doi) {
    if (!doi) return "Not recorded";
    const normalized = String(doi).replace(/^m-/, "").trim();
    if (!/^10\.\d{4,9}\//i.test(normalized)) return escapeHtml(doi);
    const href = `https://doi.org/${normalized.split("/").map(encodeURIComponent).join("/")}`;
    return `<a class="doi-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(doi)}<span class="sr-only"> (opens DOI in a new tab)</span></a>`;
  }
  function chainNode(label, value) { return `<div class="chain-node"><small>${escapeHtml(label)}</small>${escapeHtml(value)}</div>`; }

  try {
    const [taxonomy, concepts, cases, relationships, references, evidenceTaxonomy] = await Promise.all([
      loadJson("data/taxonomy.json"), loadJson("data/psychology-concepts.json"), loadJson("data/cases.json"),
      loadJson("data/relationships.json"), loadJson("data/references.json"), loadJson("data/evidence-taxonomy.json")
    ]);
    const relationship = relationships.find(item => item.id === id);
    const caseItem = cases.find(item => item.id === relationship?.caseId);
    const concept = concepts.find(item => item.id === relationship?.conceptId);
    const family = taxonomy.psychologyFamilies.find(item => item.id === concept?.family);
    if (!relationship || !caseItem || !concept) {
      root.innerHTML = `<div class="relationship-error"><p class="eyebrow">Relationship not found</p><h1>The requested relationship is unavailable.</h1><p>Check the URL or return to the matrix.</p><a class="button" href="index.html">← Return to matrix</a></div>`;
      return;
    }
    document.title = `${caseItem.name} × ${concept.name} — VisPsych`;
    const collectionIndex = collectionIds.indexOf(relationship.id);
    const collectionQuery = collectionIds.length ? `ids=${collectionIds.map(encodeURIComponent).join(",")}&row=${encodeURIComponent(collectionRow)}&column=${encodeURIComponent(collectionColumn)}&from=${encodeURIComponent(collectionFrom)}` : "";
    const detailUrl = (relationshipId, index) => `relationship.html?id=${encodeURIComponent(relationshipId)}&collection=${collectionIds.map(encodeURIComponent).join(",")}&row=${encodeURIComponent(collectionRow)}&column=${encodeURIComponent(collectionColumn)}&from=${encodeURIComponent(collectionFrom)}&position=${index + 1}`;
    const collectionNavigation = collectionIndex >= 0 ? `<nav class="collection-navigation" aria-label="Relationship collection navigation">
      ${collectionIndex > 0 ? `<a class="button secondary" href="${detailUrl(collectionIds[collectionIndex - 1], collectionIndex - 1)}">← Previous relationship</a>` : `<span></span>`}
      <a class="collection-position" href="relationship-list.html?${collectionQuery}">${collectionIndex + 1} of ${collectionIds.length} · Back to collection</a>
      ${collectionIndex < collectionIds.length - 1 ? `<a class="button secondary" href="${detailUrl(collectionIds[collectionIndex + 1], collectionIndex + 1)}">Next relationship →</a>` : `<span></span>`}
    </nav>` : "";
    const records = (references.records || []).filter(record => relationship.evidenceRecordIds?.includes(record.id) || record.relationshipId === relationship.id);
    const evidence = records.length ? records.map(record => `<article class="evidence-record">
      <strong>${escapeHtml(record.paperTitle)}</strong>
      <p>${escapeHtml(record.authors?.join(", ") || "")} ${record.year ? `(${escapeHtml(record.year)})` : ""}</p>
      <p><b>DOI:</b> ${doiLink(record.doi)} · <b>Study type:</b> ${escapeHtml(record.studyType || "Not recorded")}</p>
      <p><b>Participants:</b> ${escapeHtml(record.participants?.count ?? "Not recorded")} — ${escapeHtml(record.participants?.population || "")}</p>
      <p><b>Expertise:</b> ${escapeHtml(record.participants?.expertise || "Not recorded")} · <b>Demographics:</b> ${escapeHtml(record.participants?.demographics || "Not recorded")}</p>
      <p><b>Visualization:</b> ${escapeHtml(record.visualization?.type || "Not recorded")} · <b>Encoding:</b> ${escapeHtml(record.visualization?.encoding || "Not recorded")}</p>
      <p><b>Task:</b> ${escapeHtml(record.task?.name || "Not recorded")} — ${escapeHtml(record.task?.description || "")}</p>
      <p><b>Findings:</b> ${escapeHtml(record.findings || "Not recorded")}</p>
      <p><b>Evidence strength:</b> ${escapeHtml(record.evidenceStrength || "Unassessed")} · <b>Effect size:</b> ${escapeHtml(record.effectSize || "Not recorded")}</p>
      <p><b>Verification:</b> ${escapeHtml(record.verificationStatus || "Not recorded")} · <b>Source type:</b> ${escapeHtml(record.sourceType || "Not recorded")}</p>
      <p><b>Inclusion rationale:</b> ${escapeHtml(record.inclusionRationale || "Not recorded")}</p>
      <p><b>Relationship contribution:</b> ${escapeHtml(record.relationshipContribution || "Not recorded")}</p>
      <p><b>Limitations:</b> ${escapeHtml(record.limitations || "Not recorded")}</p>
      <p><b>Transferability:</b> ${escapeHtml(record.transferability || "Not recorded")}</p>
      <p><b>Curator:</b> ${escapeHtml(record.curator || "Not recorded")} · <b>Review date:</b> ${escapeHtml(record.reviewedAt || "Not recorded")}</p>
      <p><b>Curator notes:</b> ${escapeHtml(record.curatorNotes || "None")}</p>
    </article>`).join("") : `<div class="evidence-placeholder"><h3>Scholarly evidence — placeholder</h3><p>No reviewed evidence record has been linked yet. Add evidence IDs to this relationship in <code>data/relationships.json</code>.</p></div>`;

    root.innerHTML = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Overview matrix</a><span>›</span><a href="case.html?id=${encodeURIComponent(caseItem.id)}">${escapeHtml(caseItem.name)}</a><span>›</span><a href="psychology.html?id=${encodeURIComponent(concept.id)}">${escapeHtml(concept.name)}</a><span>›</span><span aria-current="page">Relationship</span></nav>
      ${collectionIndex >= 0 ? `<a class="back-link" href="relationship-list.html?${collectionQuery}">← Return to relationship collection</a>` : `<a class="back-link" href="index.html">← Return to overview matrix</a>`}
      <article class="relationship-document">
        <header class="relationship-hero">
          <p class="eyebrow">${escapeHtml(caseItem.family)} × ${escapeHtml(family?.name || "Psychology")}</p>
          <h1>${escapeHtml(caseItem.name)} × ${escapeHtml(concept.name)}</h1>
          <p>${escapeHtml(concept.definition)}</p>
          <div class="chip-row"><span class="evidence-badge"><i class="dot ${relationship.evidenceStatus}"></i>${escapeHtml(evidenceLabel(relationship.evidenceStatus))}</span><span class="chip">Illustrative strength ${escapeHtml(relationship.illustrativeStrength)}/3</span><span class="chip">${records.length} supporting ${records.length === 1 ? "study" : "studies"}</span></div>
        </header>
        <section class="relationship-page-section"><h2>Relationship summary</h2><p class="lead-summary">${escapeHtml(relationship.outcome)}</p>
          <dl class="summary-grid page-summary-grid"><div><dt>Design feature</dt><dd>${escapeHtml(relationship.designFeature)}</dd></div><div><dt>Psychological mechanism</dt><dd>${escapeHtml(concept.name)}</dd></div><div><dt>Likely effect</dt><dd>${escapeHtml(relationship.effect)}</dd></div><div><dt>Task</dt><dd>${escapeHtml(relationship.task)}</dd></div><div><dt>Curator status</dt><dd>${escapeHtml(relationship.curatorStatus)}</dd></div><div><dt>Relationship ID</dt><dd><code>${escapeHtml(relationship.id)}</code></dd></div></dl>
        </section>
        <div class="relationship-page-grid"><div>
          <section class="relationship-page-section"><h2>Complete relationship chain</h2><div class="relation-chain">${chainNode("Visualization case", caseItem.name)}<div class="chain-arrow">↓</div>${chainNode("Design feature", relationship.designFeature)}<div class="chain-arrow">↓</div>${chainNode("Psychological mechanism", concept.name)}<div class="chain-arrow">↓</div>${chainNode("Effect", relationship.effect)}<div class="chain-arrow">↓</div>${chainNode("Task", relationship.task)}<div class="chain-arrow">↓</div>${chainNode("Outcome", relationship.outcome)}</div></section>
          <section class="relationship-page-section"><h2>Design implication</h2><p>${escapeHtml(relationship.designImplication)}</p></section>
          ${relationship.caveat ? `<section class="relationship-page-section"><h2>Condition / trade-off</h2><p>${escapeHtml(relationship.caveat)}</p></section>` : ""}
          <section class="relationship-page-section"><h2>Evidence synthesis</h2><dl class="evidence-assessment"><div><dt>Claim basis</dt><dd>${escapeHtml(relationship.evidenceAssessment?.claimBasis || "unassessed")}</dd></div><div><dt>Relationship confidence</dt><dd>${escapeHtml(relationship.evidenceAssessment?.relationshipConfidence || "unassessed")}</dd></div><div><dt>Synthesis status</dt><dd>${escapeHtml(relationship.evidenceAssessment?.synthesisStatus || "no-reviewed-evidence")}</dd></div><div><dt>Applicability</dt><dd>${escapeHtml(relationship.evidenceAssessment?.applicability || "unassessed")}</dd></div></dl><p>${escapeHtml(relationship.evidenceAssessment?.reviewSummary || evidenceTaxonomy.mockDataWarning)}</p></section>
        </div><div><section class="relationship-page-section"><h2>Scholarly evidence (${records.length})</h2>${records.some(record => record.mockData) ? `<div class="notice"><strong>m-Mock evidence demonstration.</strong> Replace all prefixed values with verified scholarly records.</div>` : ""}${evidence}</section><section class="relationship-page-section"><h2>Curator notes</h2><p>${escapeHtml(relationship.curatorNotes || "None")}</p></section></div></div>
        ${collectionNavigation}
      </article>`;
  } catch (error) {
    root.innerHTML = `<div class="relationship-error"><h1>Unable to load relationship</h1><p>${escapeHtml(error.message)}</p><a class="button" href="index.html">← Return to matrix</a></div>`;
  }
})();
