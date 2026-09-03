from copy import deepcopy
import polars as pl
from app.ingestion.models import IngestedDataset, IngestionMetadata, SourceFormat
from app.profiling import profile_dataset
from app.quality import evaluate_quality
from app.recommendations import generate_recommendations
from app.recommendations.models import RecommendationPriority as P, RecommendationCategory as C, RecommendationSource as S
from app.governance import evaluate_governance

def profile(data):
    frame=pl.DataFrame(data, strict=False)
    return profile_dataset(IngestedDataset("synthetic.csv",SourceFormat.CSV,None,frame.height,frame.width,tuple(frame.columns),frame,(),IngestionMetadata(",")))

def recs(data):
    p=profile(data); return p,evaluate_quality(p),evaluate_governance(p),generate_recommendations(evaluate_quality(p),evaluate_governance(p))

def test_duplicate_candidate_quality_bridge_exact_contract():
    values=[f"id-{i}" for i in range(99)]+["id-0"]
    p=profile({"customer_id":values}); q=evaluate_quality(p)
    f=next(x for x in q.findings if x.category=="duplicate_structural_identifier")
    e=q.evidence[0]
    assert f.id=="F-QUALITY-COL-0-DUPLICATE-IDENTIFIER" and f.assertion_level.value=="DETECTED" and f.severity.value=="WARNING" and f.confidence.value=="HIGH"
    assert e.id=="E-QUALITY-COL-0-DUPLICATE-IDENTIFIER" and e.observed_value==1 and e.denominator==100 and "id-0" not in repr(e)

def test_duplicate_bridge_excludes_non_candidate_and_zero_excess():
    assert not any(x.category=="duplicate_structural_identifier" for x in evaluate_quality(profile({"code":["x"]*20})).findings)
    assert not any(x.category=="duplicate_structural_identifier" for x in evaluate_quality(profile({"customer_id":[f"id-{i}" for i in range(20)]})).findings)

def test_missing_identifier_bridge_exact_contract():
    vals=[f"id-{i}" for i in range(19)]+[None]
    q=evaluate_quality(profile({"customer_id":vals}))
    f=next(x for x in q.findings if x.category=="structural_identifier_missingness"); e=next(x for x in q.evidence if x.id=="E-QUALITY-COL-0-MISSING-IDENTIFIER")
    assert f.id=="F-QUALITY-COL-0-MISSING-IDENTIFIER" and f.assertion_level.value=="DETECTED" and e.observed_value==1 and e.denominator==20
    assert not any(x.category=="structural_identifier_missingness" for x in evaluate_quality(profile({"customer_id":[f"id-{i}" for i in range(20)]})).findings)

def test_recommendation_active_rules_and_traceability():
    data={"customer_id":[f"id-{i}" for i in range(99)]+["id-0"],"email":[f"a{i}@x.test" for i in range(100)],"age":list(range(100)),"city":["x","y"]*50,"when":["2025-01-01","bad"]+["2025-01-01"]*98}
    p,q,g,r=recs(data)
    assert [x.rule_id for x in r.recommendations]==["REC-QUALITY-DUPLICATE-ID-001","REC-QUALITY-MALFORMED-001","REC-GOV-PERSONAL-001","REC-GOV-PERSONAL-001","REC-GOV-PERSONAL-001","REC-GOV-QUASI-001","REC-GOV-QUASI-001"]
    assert all(x.assertion_level.value=="SUGGESTED" for x in r.recommendations)
    assert all(any(x.finding_id==f.id for f in q.findings) or any(x.finding_id==f.id for f in g.findings) for x in r.recommendations)
    assert r.recommendations[0].priority is P.P0 and r.recommendations[0].category is C.DATA_QUALITY and r.recommendations[0].source is S.QUALITY

def test_recommendation_empty_and_no_direct_semantic_noise():
    _,q,g,r=recs({"temporal":["2025-01-01","2025-01-02"],"city":["x","y"],"revenue":[1,2]})
    assert r.recommendations==() and r.summary.total_count==0

def test_recommendation_deterministic_immutable_and_safe():
    p,q,g,_=recs({"customer_id":[f"id-{i}" for i in range(19)]+["id-0"],"email":["alice@example.test"]*20})
    before=(deepcopy(q),deepcopy(g)); a=generate_recommendations(q,g); b=generate_recommendations(q,g)
    assert a==b and (q,g)==before and "alice@example.test" not in repr(a) and "primary key" not in repr(a).casefold()
    assert not hasattr(a,"evidence")

def test_recommendation_models_have_no_raw_fields():
    assert not ({"raw_value","sample","samples","example","row","rows","cell_value"} & set(generate_recommendations.__annotations__))
