import fs from "node:fs";

const read = path => JSON.parse(fs.readFileSync(path, "utf8"));
const write = (path, value) => fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const relationships = read("data/relationships.json");
const references = read("data/references.json");
const recordCounts = new Map();
for (const record of references.records || []) recordCounts.set(record.relationshipId, (recordCounts.get(record.relationshipId) || 0) + 1);

for (const [index, relationship] of relationships.entries()) {
  const count = recordCounts.get(relationship.id) || 0;
  const claimBasis = relationship.evidenceStatus === "empirical"
    ? "direct-visualization-evidence"
    : relationship.evidenceStatus === "theoretical"
      ? (index % 2 ? "psychology-transfer" : "theoretical-interpretation")
      : "curator-hypothesis";
  relationship.evidenceAssessment = {
    claimBasis,
    relationshipConfidence: count === 0 ? "unassessed" : relationship.illustrativeStrength >= 3 ? "moderate" : "low",
    synthesisStatus: count === 0 ? "no-reviewed-evidence" : count >= 3 ? "consistent" : "limited",
    applicability: relationship.evidenceStatus === "empirical" ? "direct" : relationship.evidenceStatus === "theoretical" ? "indirect" : "context-dependent",
    reviewSummary: `m-Demonstration assessment based on ${count} mock ${count === 1 ? "record" : "records"}; replace with a transparent scholarly synthesis.`
  };
}

references.template.sourceType = "m-journal article | conference paper | book | review | other";
references.template.verificationStatus = "mock-unverified | partially-verified | verified";
references.template.inclusionRationale = "m-Why this source informs the relationship";
references.template.relationshipContribution = "m-How the findings support, qualify or challenge the relationship";
references.template.limitations = "m-Study and transfer limitations";
references.template.transferability = "m-Direct | indirect | context-dependent";
for (const record of references.records || []) {
  record.sourceType = "m-scholarly study demonstration";
  record.verificationStatus = "mock-unverified";
  record.inclusionRationale = `m-Included to demonstrate how evidence could be connected to ${record.relationshipId}; this is not a real inclusion decision.`;
  record.relationshipContribution = "m-Demonstrates a placeholder account of how findings may support or qualify the relationship claim.";
  record.limitations = "m-Invented study and metadata; no scholarly inference may be drawn until the source is replaced and verified.";
  record.transferability = "m-unassessed demonstration";
}

write("data/relationships.json", relationships);
write("data/references.json", references);
