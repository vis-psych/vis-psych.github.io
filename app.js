(async () => {
  "use strict";

  const DATA_VERSION = "26";

  async function loadJson(path) {
    const separator = path.includes("?") ? "&" : "?";
    const versionedPath = `${path}${separator}v=${DATA_VERSION}`;
    const response = await fetch(versionedPath, { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load ${path}`);
    return response.json();
  }

  const [taxonomy, psychologyConcepts, caseRecords, relationshipRecords, references] = await Promise.all([
    loadJson("data/taxonomy.json"),
    loadJson("data/psychology-concepts.json"),
    loadJson("data/cases.json"),
    loadJson("data/relationships.json"),
    loadJson("data/references.json")
  ]);

  const DB = {
    psychologyFamilies: taxonomy.psychologyFamilies,
    psychologyConcepts,
    references,
    cases: caseRecords.map(caseItem => ({
      ...caseItem,
      relations: relationshipRecords
        .filter(relation => relation.caseId === caseItem.id)
        .map(relation => ({
          id: relation.id,
          concept: relation.conceptId,
          evidence: relation.evidenceStatus,
          strength: relation.illustrativeStrength,
          feature: relation.designFeature,
          effect: relation.effect,
          task: relation.task,
          outcome: relation.outcome,
          implication: relation.designImplication,
          caveat: relation.caveat,
          evidenceRecordIds: relation.evidenceRecordIds,
          curatorStatus: relation.curatorStatus,
          curatorNotes: relation.curatorNotes,
          proposedCaseUrl: relation.proposedCaseUrl
        }))
    }))
  };
  const byId = (id) => document.getElementById(id);
  const state = {
    section: "overview",
    view: "matrix",
    selectedCase: "text-similarity",
    selectedConcept: null,
    focusMode: false,
    preFocusExpansion: null,
    search: "",
    caseFamily: "all",
    psychFamily: "all",
    evidence: "all",
    expandedFamilies: new Set(),
    expandedCaseFamilies: new Set(["Text & Language"])
  };

  const caseMap = new Map(DB.cases.map(d => [d.id, d]));
  const conceptMap = new Map(DB.psychologyConcepts.map(d => [d.id, d]));
  const familyMap = new Map(DB.psychologyFamilies.map(d => [d.id, d]));

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function slugText(value) {
    return String(value || "").toLowerCase();
  }

  function relationMatches(relation) {
    if (state.evidence !== "all" && relation.evidence !== state.evidence) return false;
    const concept = conceptMap.get(relation.concept);
    if (state.psychFamily !== "all" && concept?.family !== state.psychFamily) return false;

    if (state.search) {
      const q = state.search;
      const haystack = [
        concept?.name, concept?.definition, relation.feature, relation.effect,
        relation.task, relation.outcome, relation.implication, relation.caveat
      ].map(slugText).join(" ");
      if (!haystack.includes(q)) return false;
    }
    return true;
  }

  function caseMatches(caseItem) {
    if (state.caseFamily !== "all" && caseItem.family !== state.caseFamily) return false;
    if (!state.search) return true;
    const q = state.search;
    const own = [
      caseItem.name, caseItem.family, caseItem.type, caseItem.description,
      ...(caseItem.designFeatures || []), ...(caseItem.tasks || [])
    ].map(slugText).join(" ");
    return own.includes(q) || caseItem.relations.some(relationMatches);
  }

  function filteredCases() {
    return DB.cases.filter(caseMatches);
  }

  function filteredRelations(caseItem) {
    return caseItem.relations.filter(relationMatches);
  }

  function initialise() {
    populateFilters();
    updateStats();
    readStateFromUrl();
    applyStateToControls();
    bindControls();
    render();
    updateFocusControls();
  }

  function readStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const requestedSection = window.location.hash.replace("#", "");
    if (["overview", "cases", "psychology", "gaps", "about"].includes(requestedSection)) state.section = requestedSection;
    if (["matrix", "network"].includes(params.get("view"))) state.view = params.get("view");
    if (caseMap.has(params.get("case"))) state.selectedCase = params.get("case");
    state.focusMode = params.get("focus") === "1";
    state.search = slugText(params.get("q") || "");
    if (params.get("caseFamily") === "all" || [...new Set(DB.cases.map(item => item.family))].includes(params.get("caseFamily"))) state.caseFamily = params.get("caseFamily");
    if (params.get("psychFamily") === "all" || familyMap.has(params.get("psychFamily"))) state.psychFamily = params.get("psychFamily");
    if (["all", "empirical", "theoretical", "hypothesised"].includes(params.get("evidence"))) state.evidence = params.get("evidence");
    if (params.has("rows")) state.expandedCaseFamilies = new Set((params.get("rows") || "").split(",").filter(family => DB.cases.some(item => item.family === family)));
    if (params.has("columns")) state.expandedFamilies = new Set((params.get("columns") || "").split(",").filter(id => familyMap.has(id)));
  }

  function applyStateToControls() {
    byId("search-input").value = state.search;
    byId("case-family-filter").value = state.caseFamily;
    byId("psych-family-filter").value = state.psychFamily;
    byId("evidence-filter").value = state.evidence;
    setView(state.view, false);
  }

  function syncUrlState() {
    const params = new URLSearchParams();
    if (state.view !== "matrix") params.set("view", state.view);
    if (state.selectedCase && state.selectedCase !== "text-similarity") params.set("case", state.selectedCase);
    if (state.focusMode) params.set("focus", "1");
    if (state.search) params.set("q", state.search);
    if (state.caseFamily !== "all") params.set("caseFamily", state.caseFamily);
    if (state.psychFamily !== "all") params.set("psychFamily", state.psychFamily);
    if (state.evidence !== "all") params.set("evidence", state.evidence);
    params.set("rows", [...state.expandedCaseFamilies].join(","));
    params.set("columns", [...state.expandedFamilies].join(","));
    const query = params.toString();
    const hash = state.section === "overview" ? "" : `#${state.section}`;
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${hash}`);
  }

  function populateFilters() {
    const caseFamilies = [...new Set(DB.cases.map(d => d.family))].sort();
    const caseSelect = byId("case-family-filter");
    caseFamilies.forEach(family => {
      const option = document.createElement("option");
      option.value = family;
      option.textContent = family;
      caseSelect.appendChild(option);
    });

    const psychSelect = byId("psych-family-filter");
    DB.psychologyFamilies.forEach(family => {
      const option = document.createElement("option");
      option.value = family.id;
      option.textContent = family.name;
      psychSelect.appendChild(option);
    });
  }

  function updateStats() {
    const relationCount = DB.cases.reduce((sum, d) => sum + d.relations.length, 0);
    byId("stat-cases").textContent = DB.cases.length;
    byId("stat-concepts").textContent = DB.psychologyConcepts.length;
    byId("stat-relations").textContent = relationCount;
  }

  function bindControls() {
    byId("search-input").addEventListener("input", event => {
      state.search = slugText(event.target.value.trim());
      renderCurrentSection();
      syncUrlState();
    });

    byId("case-family-filter").addEventListener("change", event => {
      state.caseFamily = event.target.value;
      renderCurrentSection();
      syncUrlState();
    });

    byId("psych-family-filter").addEventListener("change", event => {
      state.psychFamily = event.target.value;
      renderCurrentSection();
      syncUrlState();
    });

    byId("evidence-filter").addEventListener("change", event => {
      state.evidence = event.target.value;
      renderCurrentSection();
      syncUrlState();
    });

    byId("reset-filters").addEventListener("click", () => {
      state.search = "";
      state.caseFamily = "all";
      state.psychFamily = "all";
      state.evidence = "all";
      byId("search-input").value = "";
      byId("case-family-filter").value = "all";
      byId("psych-family-filter").value = "all";
      byId("evidence-filter").value = "all";
      renderCurrentSection();
      syncUrlState();
    });

    byId("expand-all-rows").addEventListener("click", () => {
      state.expandedCaseFamilies = new Set(DB.cases.map(caseItem => caseItem.family));
      renderMatrix();
      syncUrlState();
    });
    byId("collapse-all-rows").addEventListener("click", () => {
      state.expandedCaseFamilies.clear();
      renderMatrix();
      syncUrlState();
    });
    byId("expand-all-columns").addEventListener("click", () => {
      state.expandedFamilies = new Set(DB.psychologyFamilies.map(family => family.id));
      renderMatrix();
      syncUrlState();
    });
    byId("collapse-all-columns").addEventListener("click", () => {
      state.expandedFamilies.clear();
      renderMatrix();
      syncUrlState();
    });
    byId("focus-selected").addEventListener("click", focusSelectedMatrix);
    byId("exit-focus").addEventListener("click", exitFocusMode);

    document.querySelectorAll(".view-button").forEach(button => {
      button.addEventListener("click", () => setView(button.dataset.view));
    });

    document.querySelectorAll(".nav-link").forEach(button => {
      button.addEventListener("click", () => setSection(button.dataset.section));
    });

    document.body.addEventListener("click", event => {
      const shortcut = event.target.closest("[data-case-shortcut]");
      if (shortcut) {
        setSection("overview");
        selectCase(shortcut.dataset.caseShortcut);
      }
    });
  }

  function render() {
    setSection(state.section);
  }

  function setSection(section) {
    state.section = section;
    document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.section === section));

    byId("overview-section").classList.toggle("hidden", section !== "overview");
    byId("cards-section").classList.toggle("hidden", !["cases","psychology","gaps"].includes(section));
    byId("about-section").classList.toggle("hidden", section !== "about");
    document.querySelector(".toolbar").classList.toggle("hidden", section === "about");
    document.querySelector(".view-switch").classList.toggle("hidden", section !== "overview");

    if (section === "overview") {
      renderMatrix();
      renderNetwork();
    } else if (section === "cases") {
      renderCaseCards();
    } else if (section === "psychology") {
      renderPsychologyCards();
    } else if (section === "gaps") {
      renderGapCards();
    }
    syncUrlState();
  }

  function renderCurrentSection() {
    if (state.section === "overview") {
      renderMatrix();
      renderNetwork();
    } else if (state.section === "cases") {
      renderCaseCards();
    } else if (state.section === "psychology") {
      renderPsychologyCards();
    } else if (state.section === "gaps") {
      renderGapCards();
    }
  }

  function setView(view, sync = true) {
    state.view = view;
    document.querySelectorAll(".view-button").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    byId("matrix-view").classList.toggle("hidden", view !== "matrix");
    byId("network-view").classList.toggle("hidden", view !== "network");
    byId("view-title").textContent = view === "matrix" ? "Vis × Psychology matrix" : "Local conceptual network";
    byId("interaction-hint").textContent = view === "matrix"
      ? "Expand visualization families into case subrows and psychology families into concept subcolumns. Select a populated cell to open its dedicated relationship page."
      : "The network shows the selected visualization case and connected psychology concepts. Select a concept to open its dedicated relationship page.";
    if (view === "network") renderNetwork();
    if (sync) syncUrlState();
  }

  function renderMatrix() {
    const container = byId("matrix-view");
    let cases = filteredCases();
    let concepts = DB.psychologyConcepts.filter(c => state.psychFamily === "all" || c.family === state.psychFamily);
    if (state.focusMode && state.selectedCase) {
      const focusedCase = caseMap.get(state.selectedCase);
      cases = cases.filter(item => item.id === state.selectedCase);
      const relatedConceptIds = new Set(focusedCase ? filteredRelations(focusedCase).map(relationship => relationship.concept) : []);
      concepts = concepts.filter(concept => relatedConceptIds.has(concept.id));
    }

    if (!cases.length || !concepts.length) {
      container.innerHTML = `<div class="network-empty">No matrix entries match the current filters.</div>`;
      return;
    }

    const families = DB.psychologyFamilies.filter(f => state.psychFamily === "all" || f.id === state.psychFamily);
    const columnGroups = families.map(family => {
      const familyConcepts = concepts.filter(concept => concept.family === family.id);
      const expanded = state.expandedFamilies.has(family.id);
      return {
        family,
        expanded,
        columns: expanded
          ? familyConcepts.map(concept => ({ type: "concept", family, concept }))
          : [{ type: "family", family, concept: null }]
      };
    });
    const columns = columnGroups.flatMap(group => group.columns);
    const usesHorizontalScroll = columns.length > 15;
    const matrixMinimumWidth = 250 + columns.length * 72;

    const familyHead = columnGroups.map(group => `
      <th scope="colgroup" colspan="${group.columns.length}" class="matrix-family-group ${group.expanded ? "expanded" : ""}">
        <button class="family-expand-button" data-expand-family="${group.family.id}"
          aria-expanded="${group.expanded}" aria-label="${group.expanded ? "Collapse" : "Expand"} ${escapeHtml(group.family.name)} concepts">
          <span class="matrix-family-header">Psychology</span>
          <span>${escapeHtml(group.family.name)}</span>
          <i aria-hidden="true">${group.expanded ? "−" : "+"}</i>
          <small>${group.expanded ? "Hide concepts" : `Show ${group.columns.length === 1 ? concepts.filter(concept => concept.family === group.family.id).length : group.columns.length} concepts`}</small>
        </button>
      </th>`).join("");
    const conceptHead = columns.map(column => column.type === "concept"
      ? `<th scope="col" class="matrix-concept-header"><span>${escapeHtml(column.concept.name)}</span></th>`
      : `<th scope="col" class="matrix-collapsed-header"><span>All ${escapeHtml(column.family.name)}</span></th>`
    ).join("");

    const caseGroups = [...new Set(cases.map(caseItem => caseItem.family))].map(name => ({
      name,
      cases: cases.filter(caseItem => caseItem.family === name),
      expanded: state.expandedCaseFamilies.has(name)
    }));

    function cellMarkup(caseItems, column, rowContext) {
      const matches = caseItems.flatMap(caseItem => filteredRelations(caseItem)
        .filter(relationship => column.type === "concept"
          ? relationship.concept === column.concept.id
          : conceptMap.get(relationship.concept)?.family === column.family.id)
        .map(relationship => ({ caseItem, relationship }))
      );
      const columnName = column.type === "concept" ? column.concept.name : column.family.name;
      if (!matches.length) {
        return `<td><button class="matrix-cell" aria-label="${escapeHtml(rowContext.label)} and ${escapeHtml(columnName)}: no matching relationships" disabled><span class="cell-empty">—</span></button></td>`;
      }
      const marks = [...new Set(matches.map(match => match.relationship.evidence))].map(e =>
        `<i class="evidence-mark ${e}" aria-hidden="true"></i>`
      ).join("");
      const selected = rowContext.type === "case" && state.selectedCase === rowContext.caseId && state.selectedConcept && (column.type === "concept"
        ? state.selectedConcept === column.concept.id
        : conceptMap.get(state.selectedConcept)?.family === column.family.id
      );
      const target = rowContext.type === "case"
        ? `data-cell-case="${rowContext.caseId}" ${column.type === "concept" ? `data-cell-concept="${column.concept.id}"` : `data-cell-family="${column.family.id}"`}`
        : `data-aggregate-row="${escapeHtml(rowContext.family)}" data-aggregate-concept="${column.type === "concept" ? column.concept.id : ""}" data-aggregate-family="${column.family.id}"`;
      const exact = rowContext.type === "case" && column.type === "concept";
      const firstMatch = matches[0];
      const href = exact
        ? `relationship.html?id=${encodeURIComponent(firstMatch.relationship.id)}`
        : relationshipListUrl(matches.map(match => match.relationship), rowContext.label, columnName, "overview");
      return `<td class="${exact ? "exact-cell" : "aggregate-cell"}">
        <a class="matrix-cell ${selected ? "selected" : ""}" href="${href}" ${target}
          aria-label="${escapeHtml(rowContext.label)} and ${escapeHtml(columnName)}: ${matches.length} ${matches.length === 1 ? "relationship" : "relationships"}">
          <span><span class="evidence-stack">${marks}</span>
          <span class="cell-count">${exact ? evidenceLabel(matches[0].relationship.evidence) : `${matches.length} ${matches.length === 1 ? "relationship" : "relationships"}`}</span></span>
        </a>
      </td>`;
    }

    const rows = caseGroups.map(group => {
      const aggregateCells = columns.map(column => cellMarkup(group.cases, column, { type: "family", family: group.name, label: group.name })).join("");
      const familyRow = `<tr class="matrix-case-family-row ${group.expanded ? "expanded" : ""}">
        <th scope="row" class="matrix-row-label family-label">
          <button class="case-family-expand-button" data-expand-case-family="${escapeHtml(group.name)}" aria-expanded="${group.expanded}"
            aria-label="${group.expanded ? "Collapse" : "Expand"} ${escapeHtml(group.name)} visualization cases">
            <i aria-hidden="true">${group.expanded ? "−" : "+"}</i>
            <span><strong>${escapeHtml(group.name)}</strong><small>${group.cases.length} ${group.cases.length === 1 ? "case" : "cases"} · ${group.expanded ? "Hide case rows" : "Show case rows"}</small></span>
          </button>
        </th>${aggregateCells}</tr>`;
      if (!group.expanded) return familyRow;
      const childRows = group.cases.map(caseItem => {
      const cells = columns.map(column => {
        return cellMarkup([caseItem], column, { type: "case", caseId: caseItem.id, label: caseItem.name });
      }).join("");

      return `<tr class="matrix-case-child-row">
        <th scope="row" class="matrix-row-label child-label">
          <button class="row-button ${state.selectedCase === caseItem.id && !state.selectedConcept ? "selected" : ""}" data-case="${caseItem.id}">
            <span class="row-branch" aria-hidden="true">↳</span>
            <span class="row-family">${escapeHtml(caseItem.type)}</span>
            <span class="row-name">${escapeHtml(caseItem.name)}</span>
          </button>
        </th>
        ${cells}
      </tr>`;
      }).join("");
      return familyRow + childRows;
    }).join("");

    container.innerHTML = `
      <table class="matrix ${columns.length > 10 ? "dense-matrix" : ""} ${usesHorizontalScroll ? "matrix-scroll" : "matrix-fit"}"
        style="--matrix-min-width:${matrixMinimumWidth}px">
        <colgroup>
          <col class="case-column">
          ${columns.map(() => `<col class="psychology-column">`).join("")}
        </colgroup>
        <thead>
          <tr><th scope="col" rowspan="2" class="case-heading">Visualization family / case</th>${familyHead}</tr>
          <tr>${conceptHead}</tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    container.querySelectorAll("[data-expand-family]").forEach(button => {
      button.addEventListener("click", () => toggleFamilyExpansion(button.dataset.expandFamily));
    });
    container.querySelectorAll("[data-expand-case-family]").forEach(button => {
      button.addEventListener("click", () => toggleCaseFamilyExpansion(button.dataset.expandCaseFamily));
    });

    container.querySelectorAll("[data-case]").forEach(button => {
      button.addEventListener("click", () => selectCase(button.dataset.case));
    });

  }

  function toggleFamilyExpansion(familyId) {
    if (state.expandedFamilies.has(familyId)) state.expandedFamilies.delete(familyId);
    else state.expandedFamilies.add(familyId);
    renderMatrix();
    syncUrlState();
  }

  function toggleCaseFamilyExpansion(familyName) {
    if (state.expandedCaseFamilies.has(familyName)) state.expandedCaseFamilies.delete(familyName);
    else state.expandedCaseFamilies.add(familyName);
    renderMatrix();
    syncUrlState();
  }

  function openRelationship(caseId, conceptId) {
    const caseItem = caseMap.get(caseId);
    const relationship = caseItem?.relations.find(item => item.concept === conceptId);
    if (!relationship) return;
    window.location.href = `relationship.html?id=${encodeURIComponent(relationship.id)}`;
  }

  function focusSelectedMatrix() {
    if (!state.selectedCase) return;
    const caseItem = caseMap.get(state.selectedCase);
    state.preFocusExpansion = {
      rows: new Set(state.expandedCaseFamilies),
      columns: new Set(state.expandedFamilies)
    };
    state.focusMode = true;
    state.expandedCaseFamilies = new Set([caseItem.family]);
    const relatedFamilies = new Set(filteredRelations(caseItem).map(relationship => conceptMap.get(relationship.concept)?.family).filter(Boolean));
    state.expandedFamilies = relatedFamilies;
    renderMatrix();
    updateFocusControls();
    syncUrlState();
  }

  function exitFocusMode() {
    state.focusMode = false;
    if (state.preFocusExpansion) {
      state.expandedCaseFamilies = new Set(state.preFocusExpansion.rows);
      state.expandedFamilies = new Set(state.preFocusExpansion.columns);
    }
    state.preFocusExpansion = null;
    renderMatrix();
    updateFocusControls();
    syncUrlState();
  }

  function updateFocusControls() {
    const caseItem = caseMap.get(state.selectedCase);
    byId("focus-selected").classList.toggle("hidden", state.focusMode);
    byId("exit-focus").classList.toggle("hidden", !state.focusMode);
    byId("focus-indicator").classList.toggle("hidden", !state.focusMode);
    byId("focus-indicator").textContent = state.focusMode && caseItem ? `Focused on: ${caseItem.name}` : "";
  }

  function selectCase(caseId, rerender = true) {
    state.selectedCase = caseId;
    state.selectedConcept = null;
    if (state.focusMode) {
      const caseItem = caseMap.get(caseId);
      state.expandedCaseFamilies = new Set([caseItem.family]);
      state.expandedFamilies = new Set(filteredRelations(caseItem).map(relationship => conceptMap.get(relationship.concept)?.family).filter(Boolean));
    }
    updateFocusControls();
    syncUrlState();
    if (rerender) {
      renderMatrix();
      renderNetwork();
    }
  }

  function evidenceLabel(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function renderNetwork() {
    const container = byId("network-view");
    const caseItem = caseMap.get(state.selectedCase);
    if (!caseItem) {
      container.innerHTML = `<div class="network-empty">Select a visualization case in the matrix to reveal its conceptual neighbourhood.</div>`;
      return;
    }

    const relations = filteredRelations(caseItem);
    if (!relations.length) {
      container.innerHTML = `<div class="network-empty">No relationships for ${escapeHtml(caseItem.name)} match the current filters.</div>`;
      return;
    }

    const width = 900, height = 550;
    const cx = width / 2, cy = height / 2;
    const radius = Math.min(width, height) * .34;
    const nodes = relations.map((r, i) => {
      const angle = -Math.PI / 2 + (i / relations.length) * Math.PI * 2;
      return { relation: r, concept: conceptMap.get(r.concept), x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });

    const edges = nodes.map(n => `<line class="network-edge ${n.relation.evidence}" x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}"/>`).join("");
    const nodeMarkup = nodes.map(n => `
      <g class="network-node" data-network-concept="${n.concept.id}" transform="translate(${n.x},${n.y})">
        <circle r="43"></circle>
        <text>
          ${wrapSvgText(n.concept.name)}
        </text>
      </g>`).join("");

    container.innerHTML = `<svg class="network-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Psychology network for ${escapeHtml(caseItem.name)}">
      <g>${edges}</g>
      <g class="network-node case" transform="translate(${cx},${cy})">
        <circle r="62"></circle>
        <text>${wrapSvgText(caseItem.name)}</text>
      </g>
      ${nodeMarkup}
    </svg>`;

    container.querySelectorAll("[data-network-concept]").forEach(node => {
      node.addEventListener("click", () => openRelationship(caseItem.id, node.dataset.networkConcept));
    });
  }

  function wrapSvgText(text) {
    const words = text.split(" ");
    if (words.length <= 2) return `<tspan x="0" dy="0">${escapeHtml(text)}</tspan>`;
    const split = Math.ceil(words.length / 2);
    const first = words.slice(0, split).join(" ");
    const second = words.slice(split).join(" ");
    return `<tspan x="0" dy="-6">${escapeHtml(first)}</tspan><tspan x="0" dy="14">${escapeHtml(second)}</tspan>`;
  }

  function evidenceSummary(relations) {
    return ["empirical", "theoretical", "hypothesised"].map(status => {
      const count = relations.filter(relation => relation.evidence === status).length;
      return count ? `<span><i class="dot ${status}"></i>${count} ${escapeHtml(evidenceLabel(status))}</span>` : "";
    }).join("");
  }

  function relationshipButton(caseItem, concept, relationship, label) {
    return `<a class="relationship-link" href="relationship.html?id=${encodeURIComponent(relationship.id)}" data-browse-case="${caseItem.id}" data-browse-concept="${concept.id}"
      title="Open ${escapeHtml(caseItem.name)} × ${escapeHtml(concept.name)} relationship page">
      ${escapeHtml(label)} <i class="dot ${relationship.evidence}" aria-hidden="true"></i>
    </a>`;
  }

  function relationshipListUrl(relationships, rowLabel, columnLabel, fromSection) {
    const ids = relationships.map(relationship => encodeURIComponent(relationship.id)).join(",");
    return `relationship-list.html?ids=${ids}&row=${encodeURIComponent(rowLabel)}&column=${encodeURIComponent(columnLabel)}&from=${encodeURIComponent(fromSection)}`;
  }

  function bindBrowseRelationships(container) {
    container.querySelectorAll(".relationship-link, .profile-link").forEach(link => link.addEventListener("click", event => event.stopPropagation()));
  }

  function renderCaseCards() {
    byId("cards-eyebrow").textContent = "Browse";
    byId("cards-title").textContent = "Visualization cases";
    byId("cards-description").textContent = "Select a case card to view all of its relationships, or select a psychology link to open that exact relationship.";
    const cases = filteredCases();
    const container = byId("cards-grid");
    container.classList.add("grouped");
    const families = [...new Set(cases.map(caseItem => caseItem.family))];
    container.innerHTML = families.map(family => {
      const familyCases = cases.filter(caseItem => caseItem.family === family);
      return `<section class="browse-group">
        <div class="browse-group-heading"><h3>${escapeHtml(family)}</h3><span>${familyCases.length} ${familyCases.length === 1 ? "case" : "cases"}</span></div>
        <div class="group-grid">${familyCases.map(caseItem => {
          const relations = filteredRelations(caseItem);
          const allRelationships = caseItem.relations;
          return `<article class="card" data-card-case="${caseItem.id}" data-list-href="${escapeHtml(relationshipListUrl(allRelationships, caseItem.name, "All psychology concepts", "cases"))}" tabindex="0" role="link" aria-label="View all relationships for ${escapeHtml(caseItem.name)}">
            <div class="family">${escapeHtml(caseItem.type)}</div>
            <h3>${escapeHtml(caseItem.name)}</h3>
            <p>${escapeHtml(caseItem.description)}</p>
            <a class="profile-link" href="case.html?id=${encodeURIComponent(caseItem.id)}">View case profile →</a>
            <div class="mini-list"><strong>Tasks</strong>${caseItem.tasks.slice(0,3).map(task => `<span>${escapeHtml(task)}</span>`).join("")}</div>
            <div class="card-links"><strong>Linked psychology</strong>${relations.map(relation => {
              const concept = conceptMap.get(relation.concept);
              return concept ? relationshipButton(caseItem, concept, relation, concept.name) : "";
            }).join("")}</div>
            <div class="card-evidence">${evidenceSummary(relations)}</div>
            <div class="card-meta">${allRelationships.length} ${allRelationships.length === 1 ? "relationship" : "relationships"} · view all relationships →</div>
          </article>`;
        }).join("")}</div>
      </section>`;
    }).join("") || `<p>No cases match the current filters.</p>`;

    container.querySelectorAll("[data-card-case]").forEach(card => {
      const open = () => {
        if (card.dataset.listHref) window.location.href = card.dataset.listHref;
      };
      card.addEventListener("click", event => { if (!event.target.closest(".relationship-link, .profile-link")) open(); });
      card.addEventListener("keydown", event => { if (event.target === card && (event.key === "Enter" || event.key === " ")) open(); });
    });
    bindBrowseRelationships(container);
  }

  function renderPsychologyCards() {
    byId("cards-eyebrow").textContent = "Browse";
    byId("cards-title").textContent = "Psychological concepts";
    byId("cards-description").textContent = `${DB.psychologyConcepts.length} psychological concepts across ${DB.psychologyFamilies.length} families. Select a concept card to view all of its relationships, or select a visualization case link to open the exact relationship.`;

    const concepts = DB.psychologyConcepts.filter(concept => {
      if (state.psychFamily !== "all" && concept.family !== state.psychFamily) return false;
      if (state.search && !slugText(concept.name + " " + concept.definition).includes(state.search)) {
        const related = DB.cases.some(c => caseMatches(c) && c.relations.some(r => r.concept === concept.id && relationMatches(r)));
        if (!related) return false;
      }
      return true;
    });

    const container = byId("cards-grid");
    container.classList.add("grouped");
    const families = DB.psychologyFamilies.filter(family => concepts.some(concept => concept.family === family.id));
    container.innerHTML = families.map(family => {
      const familyConcepts = concepts.filter(concept => concept.family === family.id);
      return `<section class="browse-group">
        <div class="browse-group-heading"><h3>${escapeHtml(family.name)}</h3><span>${familyConcepts.length} concepts</span></div>
        <div class="group-grid">${familyConcepts.map(concept => {
          const linked = DB.cases.flatMap(caseItem => caseMatches(caseItem)
            ? filteredRelations(caseItem).filter(relation => relation.concept === concept.id).map(relationship => ({ caseItem, relationship }))
            : []);
          const allRelationships = DB.cases.flatMap(caseItem => caseItem.relations.filter(relationship => relationship.concept === concept.id));
          return `<article class="card" data-card-concept="${concept.id}" data-list-href="${escapeHtml(relationshipListUrl(allRelationships, "All visualization cases", concept.name, "psychology"))}" tabindex="0" role="link" aria-label="View all relationships for ${escapeHtml(concept.name)}">
            <div class="family">${escapeHtml(family.name)}</div>
            <h3>${escapeHtml(concept.name)}</h3>
            <p>${escapeHtml(concept.definition)}</p>
            <a class="profile-link" href="psychology.html?id=${encodeURIComponent(concept.id)}">View concept profile →</a>
            <div class="card-links"><strong>Linked visualization cases</strong>${linked.map(({caseItem, relationship}) =>
              relationshipButton(caseItem, concept, relationship, caseItem.name)).join("")}</div>
            <div class="card-evidence">${evidenceSummary(linked.map(item => item.relationship))}</div>
            <div class="card-meta">${allRelationships.length} linked ${allRelationships.length === 1 ? "case" : "cases"} · view all relationships →</div>
          </article>`;
        }).join("")}</div>
      </section>`;
    }).join("") || `<p>No psychology concepts match the current filters.</p>`;

    container.querySelectorAll("[data-card-concept]").forEach(card => {
      const open = () => {
        if (card.dataset.listHref) window.location.href = card.dataset.listHref;
      };
      card.addEventListener("click", event => { if (!event.target.closest(".relationship-link, .profile-link")) open(); });
      card.addEventListener("keydown", event => { if (event.target === card && (event.key === "Enter" || event.key === " ")) open(); });
    });
    bindBrowseRelationships(container);
  }

  function renderGapCards() {
    byId("cards-eyebrow").textContent = "Research discovery";
    byId("cards-title").textContent = "Potential research gaps";
    byId("cards-description").textContent = "Illustrative relationships marked as hypothesised or weakly represented in this seed dataset. These are prompts for review, not claims that no literature exists.";

    const gaps = [];
    DB.cases.filter(caseMatches).forEach(caseItem => {
      filteredRelations(caseItem)
        .filter(r => r.evidence === "hypothesised" || r.strength === 1)
        .forEach(r => gaps.push({caseItem, relation:r, concept:conceptMap.get(r.concept)}));
    });

    byId("cards-grid").classList.remove("grouped");
    byId("cards-grid").innerHTML = gaps.map(g => `
      <article class="card" data-gap-case="${g.caseItem.id}" data-gap-concept="${g.concept.id}" tabindex="0">
        <div class="family">${escapeHtml(g.caseItem.family)} × ${escapeHtml(familyMap.get(g.concept.family)?.name || "")}</div>
        <h3>${escapeHtml(g.caseItem.name)} × ${escapeHtml(g.concept.name)}</h3>
        <p>${escapeHtml(g.relation.outcome)}</p>
        <div class="card-meta">${escapeHtml(evidenceLabel(g.relation.evidence))} · review evidence →</div>
      </article>`).join("") || `<p>No potential gaps match the current filters.</p>`;

    document.querySelectorAll("[data-gap-case]").forEach(card => {
      const open = () => {
        openRelationship(card.dataset.gapCase, card.dataset.gapConcept);
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") open(); });
    });
  }

  initialise();
})();
