from collections import Counter
from app.profiling.models import Finding, Evidence, AssertionLevel
from app.quality.models import QualityScore
from app.governance.models import GovernanceAssessment
from .models import Recommendation, RecommendationSet, RecommendationSummary, RecommendationSource as S, RecommendationPriority as P, RecommendationCategory as C

_RULES = ("REC-QUALITY-DUPLICATE-ID-001", "REC-QUALITY-MALFORMED-001", "REC-GOV-PERSONAL-001", "REC-GOV-QUASI-001")

def generate_recommendations(quality: QualityScore, governance: GovernanceAssessment) -> RecommendationSet:
    quality_findings = tuple(quality.findings)
    governance_findings = tuple(governance.findings)
    evidence = {item.id: item for item in quality.evidence}
    candidates = []
    seen = set()
    for finding in quality_findings:
        rule = "REC-QUALITY-DUPLICATE-ID-001" if finding.category == "duplicate_structural_identifier" else "REC-QUALITY-MALFORMED-001" if finding.category == "malformed_value" else None
        if rule is not None and (rule, finding.id) not in seen:
            candidates.append(_build(finding, S.QUALITY, rule, evidence)); seen.add((rule, finding.id))
    for finding in governance_findings:
        rule = "REC-GOV-PERSONAL-001" if finding.category == "potential_personal_data" else "REC-GOV-QUASI-001" if finding.category == "quasi_identifier" else None
        if rule is not None and (rule, finding.id) not in seen:
            candidates.append(_build(finding, S.GOVERNANCE, rule, {})); seen.add((rule, finding.id))
    candidates.sort(key=_sort_key)
    items = tuple(candidates)
    pc = Counter(item.priority for item in items); cc = Counter(item.category for item in items)
    summary = RecommendationSummary(len(items), tuple((p, pc[p]) for p in P if pc[p]), tuple((c, cc[c]) for c in C if cc[c]))
    return RecommendationSet(items, summary)

def _build(finding: Finding, source: S, rule: str, evidence: dict[str, Evidence]) -> Recommendation:
    if rule == "REC-QUALITY-DUPLICATE-ID-001":
        action = "Review and resolve duplicate values in the structural candidate identifier column before relying on it for unique record identification."
        count = next((e.observed_value for eid in finding.evidence_ids if (e := evidence.get(eid)) is not None), "the detected")
        rationale = f"The Quality finding detected {count} duplicate excess rows deterministically; review is suggested before relying on structural identity."
        priority, category = P.P0, C.DATA_QUALITY
    elif rule == "REC-QUALITY-MALFORMED-001":
        action = "Validate and correct malformed values against the detected expected primitive format before downstream use."
        rationale = "The Quality finding detected values that failed the expected structural parser; validation is suggested without adding a business rule."
        priority, category = P.P1, C.DATA_QUALITY
    elif rule == "REC-GOV-PERSONAL-001":
        action = "Review and document the intended handling, ownership and retention expectations for fields inferred as potential personal data."
        rationale = "The Governance finding contains deterministic signals consistent with potential personal data; documentation review is suggested, not a legal conclusion."
        priority, category = P.P1, C.PRIVACY_REVIEW
    else:
        action = "Review whether this combination of fields needs additional governance documentation before broader sharing or reuse."
        rationale = "The Governance finding classifies a potential quasi-identifier combination; review is suggested without asserting re-identification risk."
        priority, category = P.P1, C.GOVERNANCE
    return Recommendation(f"R-{rule}-{finding.id}", finding.id, source, priority, category, action, rationale, AssertionLevel.SUGGESTED, rule, "0.1")

def _sort_key(item: Recommendation):
    return (list(P).index(item.priority), list(S).index(item.source), _RULES.index(item.rule_id), _subject_position(item.finding_id), item.finding_id, item.id)

def _subject_position(finding_id: str) -> int:
    parts = finding_id.split("-")
    try: return int(parts[3])
    except (IndexError, ValueError): return 10**9
