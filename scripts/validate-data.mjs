import fs from "node:fs";

const read = path => JSON.parse(fs.readFileSync(path, "utf8"));
const cases = read("data/cases.json");
const concepts = read("data/psychology-concepts.json");
const relationships = read("data/relationships.json");
const references = read("data/references.json");
const taxonomy = read("data/taxonomy.json");
const evidenceTaxonomy = read("data/evidence-taxonomy.json");
const errors = [];
const requireFields = (item, fields, label) => fields.forEach(field => { if (item[field] === undefined || item[field] === null || item[field] === "") errors.push(`${label}: missing ${field}`); });
const unique = (items, label) => { const seen = new Set(); for (const item of items) { if (seen.has(item.id)) errors.push(`${label}: duplicate id ${item.id}`); seen.add(item.id); } return seen; };

const caseIds = unique(cases, "cases");
const conceptIds = unique(concepts, "concepts");
const relationshipIds = unique(relationships, "relationships");
const recordIds = unique(references.records || [], "references");
const familyIds = unique(taxonomy.psychologyFamilies || [], "psychology families");

for (const item of cases) requireFields(item, ["id", "name", "family", "type", "description", "designFeatures", "tasks", "contexts"], `case ${item.id}`);
for (const item of concepts) {
  requireFields(item, ["id", "name", "family", "definition"], `concept ${item.id}`);
  if (!familyIds.has(item.family)) errors.push(`concept ${item.id}: unknown family ${item.family}`);
}
const evidenceStatuses = new Set(["empirical", "theoretical", "hypothesised"]);
for (const item of relationships) {
  requireFields(item, ["id", "caseId", "conceptId", "evidenceStatus", "illustrativeStrength", "designFeature", "effect", "task", "outcome", "designImplication", "evidenceRecordIds", "evidenceAssessment"], `relationship ${item.id}`);
  if (!caseIds.has(item.caseId)) errors.push(`relationship ${item.id}: unknown case ${item.caseId}`);
  if (!conceptIds.has(item.conceptId)) errors.push(`relationship ${item.id}: unknown concept ${item.conceptId}`);
  if (!evidenceStatuses.has(item.evidenceStatus)) errors.push(`relationship ${item.id}: invalid evidenceStatus ${item.evidenceStatus}`);
  if (![1, 2, 3].includes(item.illustrativeStrength)) errors.push(`relationship ${item.id}: illustrativeStrength must be 1–3`);
  for (const recordId of item.evidenceRecordIds || []) if (!recordIds.has(recordId)) errors.push(`relationship ${item.id}: unknown evidence record ${recordId}`);
  const assessment = item.evidenceAssessment || {};
  for (const [field, vocabulary] of [["claimBasis", evidenceTaxonomy.claimBasis], ["relationshipConfidence", evidenceTaxonomy.relationshipConfidence], ["synthesisStatus", evidenceTaxonomy.synthesisStatus], ["applicability", evidenceTaxonomy.applicability]]) if (!Object.hasOwn(vocabulary || {}, assessment[field])) errors.push(`relationship ${item.id}: invalid ${field} ${assessment[field]}`);
}
for (const record of references.records || []) {
  requireFields(record, ["id", "relationshipId", "paperTitle", "authors", "doi", "studyType", "participants", "visualization", "task", "findings", "evidenceStrength", "curator", "curatorNotes", "reviewedAt", "verificationStatus", "inclusionRationale", "relationshipContribution", "limitations", "transferability"], `reference ${record.id}`);
  if (!relationshipIds.has(record.relationshipId)) errors.push(`reference ${record.id}: unknown relationship ${record.relationshipId}`);
  const doi = String(record.doi || "").replace(/^m-/, "");
  if (doi && !/^10\.\d{4,9}\/.+/.test(doi)) errors.push(`reference ${record.id}: malformed DOI ${record.doi}`);
  if (!Object.hasOwn(evidenceTaxonomy.recordVerification || {}, record.verificationStatus)) errors.push(`reference ${record.id}: invalid verificationStatus ${record.verificationStatus}`);
}
for (const relationship of relationships) for (const recordId of relationship.evidenceRecordIds || []) { const record = (references.records || []).find(item => item.id === recordId); if (record && record.relationshipId !== relationship.id) errors.push(`relationship ${relationship.id}: evidence ${recordId} points to ${record.relationshipId}`); }
for (const caseId of caseIds) if (!relationships.some(item => item.caseId === caseId)) errors.push(`case ${caseId}: no relationships`);
for (const conceptId of conceptIds) if (!relationships.some(item => item.conceptId === conceptId)) errors.push(`concept ${conceptId}: no relationships`);

if (errors.length) { console.error(`VisPsych validation failed with ${errors.length} error(s):\n- ${errors.join("\n- ")}`); process.exit(1); }
console.log(`VisPsych validation passed: ${cases.length} cases, ${concepts.length} concepts, ${relationships.length} relationships, ${(references.records || []).length} evidence records.`);
