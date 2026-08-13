(async () => {
  "use strict";
  const DATA_VERSION = "26";
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const loadJson = async path => { const response = await fetch(`${path}?v=${DATA_VERSION}`, { cache: "no-store" }); if (!response.ok) throw new Error(`Unable to load ${path}`); return response.json(); };
  const root = document.getElementById("psychology-page");
  const id = new URLSearchParams(window.location.search).get("id");
  try {
    const [taxonomy, concepts, cases, relationships, references] = await Promise.all([loadJson("data/taxonomy.json"), loadJson("data/psychology-concepts.json"), loadJson("data/cases.json"), loadJson("data/relationships.json"), loadJson("data/references.json")]);
    const concept = concepts.find(entry => entry.id === id);
    if (!concept) { root.innerHTML = `<div class="relationship-error"><h1>Psychological concept not found</h1><a class="button" href="index.html#psychology">← Return to Psychology</a></div>`; return; }
    const family = taxonomy.psychologyFamilies.find(entry => entry.id === concept.family);
    const caseMap = new Map(cases.map(entry => [entry.id, entry]));
    const linked = relationships.filter(entry => entry.conceptId === concept.id);
    const collection = linked.map(entry => encodeURIComponent(entry.id)).join(",");
    document.title = `${concept.name} — VisPsych`;
    const relationshipCards = linked.map((relationship, index) => { const caseItem = caseMap.get(relationship.caseId); const studyCount = (references.records || []).filter(record => relationship.evidenceRecordIds?.includes(record.id) || record.relationshipId === relationship.id).length; return `<a class="profile-relationship" href="relationship.html?id=${encodeURIComponent(relationship.id)}&collection=${collection}&row=All%20visualization%20cases&column=${encodeURIComponent(concept.name)}&from=psychology&position=${index + 1}"><span class="eyebrow">${escapeHtml(caseItem?.family || "Visualization")}</span><h3>${escapeHtml(caseItem?.name || relationship.caseId)}</h3><p>${escapeHtml(relationship.outcome)}</p><span class="card-meta">${escapeHtml(relationship.evidenceStatus)} · ${studyCount} ${studyCount === 1 ? "study" : "studies"} · ${escapeHtml(relationship.evidenceAssessment?.synthesisStatus || "unassessed")} →</span></a>`; }).join("");
    root.innerHTML = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html#psychology">Psychology</a><span>›</span><span aria-current="page">${escapeHtml(concept.name)}</span></nav><a class="back-link" href="index.html#psychology">← Return to Psychology</a><article class="profile-document"><header class="profile-hero"><p class="eyebrow">${escapeHtml(family?.name || "Psychology")}</p><h1>${escapeHtml(concept.name)}</h1><p>${escapeHtml(concept.definition)}</p></header><div class="profile-grid"><aside class="profile-sidebar"><section class="profile-section"><h2>Psychology family</h2><p>${escapeHtml(family?.name || concept.family)}</p></section><section class="profile-section"><h2>Platform role</h2><p>This concept is used as a psychological mechanism in ${linked.length} visualization ${linked.length === 1 ? "relationship" : "relationships"}.</p></section></aside><div class="profile-main"><section class="profile-section"><h2>Visualization relationships (${linked.length})</h2><div class="profile-relationships">${relationshipCards}</div></section></div></div></article>`;
  } catch (error) { root.innerHTML = `<div class="relationship-error"><h1>Unable to load psychological concept</h1><p>${escapeHtml(error.message)}</p><a class="button" href="index.html#psychology">← Return to Psychology</a></div>`; }
})();
