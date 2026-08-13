(async () => {
  "use strict";
  const DATA_VERSION = "26";
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const loadJson = async path => { const response = await fetch(`${path}?v=${DATA_VERSION}`, { cache: "no-store" }); if (!response.ok) throw new Error(`Unable to load ${path}`); return response.json(); };
  const root = document.getElementById("case-page");
  const id = new URLSearchParams(window.location.search).get("id");
  try {
    const [taxonomy, concepts, cases, relationships, references] = await Promise.all([loadJson("data/taxonomy.json"), loadJson("data/psychology-concepts.json"), loadJson("data/cases.json"), loadJson("data/relationships.json"), loadJson("data/references.json")]);
    const item = cases.find(entry => entry.id === id);
    if (!item) { root.innerHTML = `<div class="relationship-error"><h1>Visualization case not found</h1><a class="button" href="index.html#cases">← Return to Visualization Cases</a></div>`; return; }
    const conceptMap = new Map(concepts.map(entry => [entry.id, entry]));
    const familyMap = new Map(taxonomy.psychologyFamilies.map(entry => [entry.id, entry]));
    const linked = relationships.filter(entry => entry.caseId === item.id);
    const collection = linked.map(entry => encodeURIComponent(entry.id)).join(",");
    document.title = `${item.name} — VisPsych`;
    const relationshipCards = linked.map((relationship, index) => { const concept = conceptMap.get(relationship.conceptId); const family = familyMap.get(concept?.family); const studyCount = (references.records || []).filter(record => relationship.evidenceRecordIds?.includes(record.id) || record.relationshipId === relationship.id).length; return `<a class="profile-relationship" href="relationship.html?id=${encodeURIComponent(relationship.id)}&collection=${collection}&row=${encodeURIComponent(item.name)}&column=All%20psychology%20concepts&from=cases&position=${index + 1}"><span class="eyebrow">${escapeHtml(family?.name || "Psychology")}</span><h3>${escapeHtml(concept?.name || relationship.conceptId)}</h3><p>${escapeHtml(relationship.outcome)}</p><span class="card-meta">${escapeHtml(relationship.evidenceStatus)} · ${studyCount} ${studyCount === 1 ? "study" : "studies"} · ${escapeHtml(relationship.evidenceAssessment?.synthesisStatus || "unassessed")} →</span></a>`; }).join("");
    const list = values => `<ul class="profile-list">${(values || []).map(value => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
    root.innerHTML = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html#cases">Visualization Cases</a><span>›</span><span aria-current="page">${escapeHtml(item.name)}</span></nav><a class="back-link" href="index.html#cases">← Return to Visualization Cases</a><article class="profile-document"><header class="profile-hero"><p class="eyebrow">${escapeHtml(item.family)} · ${escapeHtml(item.type)}</p><h1>${escapeHtml(item.name)}</h1><p>${escapeHtml(item.description)}</p></header><div class="profile-grid"><aside class="profile-sidebar"><section class="profile-section"><h2>Design features</h2>${list(item.designFeatures)}</section><section class="profile-section"><h2>Tasks</h2>${list(item.tasks)}</section><section class="profile-section"><h2>Contexts</h2>${list(item.contexts)}</section></aside><div class="profile-main"><section class="profile-section"><h2>Psychology relationships (${linked.length})</h2><div class="profile-relationships">${relationshipCards}</div></section></div></div></article>`;
  } catch (error) { root.innerHTML = `<div class="relationship-error"><h1>Unable to load visualization case</h1><p>${escapeHtml(error.message)}</p><a class="button" href="index.html#cases">← Return to Visualization Cases</a></div>`; }
})();
