(async () => {
  "use strict";
  const DATA_VERSION = "26";
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const loadJson = async path => {
    const response = await fetch(`${path}?v=${DATA_VERSION}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load ${path}`);
    return response.json();
  };
  const root = document.getElementById("relationship-list-page");
  const params = new URLSearchParams(window.location.search);
  const requestedIds = [...new Set((params.get("ids") || "").split(",").filter(Boolean))];
  const rowLabel = params.get("row") || "Visualization cases";
  const columnLabel = params.get("column") || "Psychology concepts";
  const fromSection = ["overview", "cases", "psychology"].includes(params.get("from")) ? params.get("from") : "overview";
  const returnHref = fromSection === "overview" ? "index.html" : `index.html#${fromSection}`;
  const returnLabel = fromSection === "cases" ? "visualization cases" : fromSection === "psychology" ? "psychological concepts" : "overview matrix";

  try {
    const [taxonomy, concepts, cases, relationships, references] = await Promise.all([
      loadJson("data/taxonomy.json"), loadJson("data/psychology-concepts.json"), loadJson("data/cases.json"),
      loadJson("data/relationships.json"), loadJson("data/references.json")
    ]);
    const caseMap = new Map(cases.map(item => [item.id, item]));
    const conceptMap = new Map(concepts.map(item => [item.id, item]));
    const familyMap = new Map(taxonomy.psychologyFamilies.map(item => [item.id, item]));
    const referenceRecords = references.records || [];
    const relationshipMap = new Map(relationships.map(item => [item.id, item]));
    const results = requestedIds.map(id => relationshipMap.get(id)).filter(Boolean);

    if (!results.length) {
      root.innerHTML = `<div class="relationship-error"><p class="eyebrow">Relationships not found</p><h1>The requested relationship collection is unavailable.</h1><p>Check the URL or return to the platform.</p><a class="button" href="${returnHref}">← Return to ${returnLabel}</a></div>`;
      return;
    }

    document.title = `${rowLabel} × ${columnLabel} — VisPsych`;
    const cards = results.map((relationship, index) => {
      const caseItem = caseMap.get(relationship.caseId);
      const concept = conceptMap.get(relationship.conceptId);
      if (!caseItem || !concept) return "";
      const family = familyMap.get(concept.family);
      const studyCount = referenceRecords.filter(record => relationship.evidenceRecordIds?.includes(record.id) || record.relationshipId === relationship.id).length;
      const evidenceLabel = relationship.evidenceStatus ? relationship.evidenceStatus.charAt(0).toUpperCase() + relationship.evidenceStatus.slice(1) : "Not assessed";
      const detailHref = `relationship.html?id=${encodeURIComponent(relationship.id)}&collection=${results.map(item => encodeURIComponent(item.id)).join(",")}&row=${encodeURIComponent(rowLabel)}&column=${encodeURIComponent(columnLabel)}&from=${encodeURIComponent(fromSection)}&position=${index + 1}`;
      return `<a class="relationship-result" href="${detailHref}">
        <p class="eyebrow">${escapeHtml(caseItem.family)} × ${escapeHtml(family?.name || "Psychology")}</p>
        <h2>${escapeHtml(caseItem.name)} × ${escapeHtml(concept.name)}</h2>
        <p class="result-summary">${escapeHtml(relationship.outcome)}</p>
        <p class="result-feature"><strong>Design feature:</strong> ${escapeHtml(relationship.designFeature)}</p>
        <div class="result-meta"><span class="evidence-badge"><i class="dot ${escapeHtml(relationship.evidenceStatus)}"></i>${escapeHtml(evidenceLabel)}</span><span class="chip">${studyCount} supporting ${studyCount === 1 ? "study" : "studies"}</span><span class="chip">${escapeHtml(relationship.evidenceAssessment?.synthesisStatus || "unassessed")}</span><span class="chip">Open details →</span></div>
      </a>`;
    }).join("");

    root.innerHTML = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${returnHref}">${escapeHtml(returnLabel.charAt(0).toUpperCase() + returnLabel.slice(1))}</a><span>›</span><span aria-current="page">${escapeHtml(rowLabel)} × ${escapeHtml(columnLabel)}</span></nav>
      <a class="back-link" href="${returnHref}">← Return to ${returnLabel}</a>
      <article class="relationship-list-document">
        <header class="relationship-list-header"><p class="eyebrow">Relationship collection</p><h1>${escapeHtml(rowLabel)} × ${escapeHtml(columnLabel)}</h1><p>${results.length} ${results.length === 1 ? "relationship is" : "relationships are"} included in this selection. Select one to open its complete details and scholarly evidence.</p></header>
        <section class="relationship-results" aria-label="Relationships">${cards}</section>
      </article>`;
  } catch (error) {
    root.innerHTML = `<div class="relationship-error"><h1>Unable to load relationships</h1><p>${escapeHtml(error.message)}</p><a class="button" href="${returnHref}">← Return to ${returnLabel}</a></div>`;
  }
})();
