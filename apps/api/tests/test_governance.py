from copy import deepcopy
from datetime import date
import polars as pl
from app.governance import evaluate_governance
from app.governance.engine import normalize_column_name
from app.governance.models import GovernanceCategory as C
from app.ingestion.models import IngestedDataset,IngestionMetadata,SourceFormat
from app.profiling import profile_dataset

def _profile(data):
 f=pl.DataFrame(data,strict=False); return profile_dataset(IngestedDataset("synthetic.csv",SourceFormat.CSV,None,f.height,f.width,tuple(f.columns),f,(),IngestionMetadata(",")))
def _cats(a,name): return {x.category for x in a.classifications if x.column_id==next(c.column_id for c in _profile({name:["x"]}).columns)}
def test_normalizes_supported_column_name_forms(): assert normalize_column_name("CustomerEmail")==("customer","email")
def test_identifier_and_personal_data():
 a=evaluate_governance(_profile({"customer_id":[f"id-{x}" for x in range(10)]})); assert [x.category for x in a.classifications]==[C.IDENTIFIER,C.POTENTIAL_PERSONAL_DATA]
def test_temporal_and_demographic_coexist():
 a=evaluate_governance(_profile({"birth_date":[date(2026,1,1),date(2026,1,2)]})); assert {x.category for x in a.classifications}=={C.TEMPORAL_FIELD,C.DEMOGRAPHIC_INFORMATION,C.POTENTIAL_PERSONAL_DATA}
def test_contact_geo_and_metric_false_positive_controls():
 a=evaluate_governance(_profile({"email":["x"]*20,"application_state":["x"]*20,"revenue":list(range(20))})); assert [x.category for x in a.classifications if x.column_id=="col:0"]==[C.CONTACT_INFORMATION,C.POTENTIAL_PERSONAL_DATA]; assert all(x.column_id!="col:1" for x in a.classifications); assert {x.category for x in a.classifications if x.column_id=="col:2"}=={C.FINANCIAL_INFORMATION,C.BUSINESS_METRIC}
def test_deterministic_safe_and_immutable():
 p=_profile({"email":["alice@example.test"]*20,"city":["x"]*20,"age":list(range(20))}); before=deepcopy(p); a,b=evaluate_governance(p),evaluate_governance(p); assert p==before and a==b and "alice@example.test" not in str(a) and C.QUASI_IDENTIFIER in {x.category for x in a.classifications}

import pytest
from dataclasses import replace
from app.profiling.models import PrimitiveType

def _categories_for(profile, column_id="col:0"):
    return [x.category for x in evaluate_governance(profile).classifications if x.column_id == column_id]

def _one(name, values):
    return _profile({name: values})

@pytest.mark.parametrize("name", ["email","customer_email","contact_email","phone","phone_number","mobile","mobile_phone","telephone"])
def test_contact_positive_vocabulary(name):
    a=evaluate_governance(_one(name,["x"]*20)); cats=_categories_for(_one(name,["x"]*20))
    assert cats[:2] == [C.CONTACT_INFORMATION,C.POTENTIAL_PERSONAL_DATA]
    assert a.classifications[0].assertion_level.value == "INFERRED"

@pytest.mark.parametrize("name", ["email_campaign_count","email_sent_count","phone_call_count"])
def test_contact_count_false_positives(name):
    assert C.CONTACT_INFORMATION not in _categories_for(_one(name,[1]*20))
    assert C.POTENTIAL_PERSONAL_DATA not in _categories_for(_one(name,[1]*20))

@pytest.mark.parametrize("name", ["city","country","country_code","postal_code","postcode","zip_code","latitude","longitude"])
def test_geo_positive_vocabulary(name):
    cats=_categories_for(_one(name,["x","y"]))
    assert C.GEOGRAPHIC_INFORMATION in cats
    assert C.POTENTIAL_PERSONAL_DATA not in cats

@pytest.mark.parametrize("name", ["region","state","province"])
def test_geo_ambiguous_approved(name):
    assert C.GEOGRAPHIC_INFORMATION in _categories_for(_one(name,["x","y"]))

@pytest.mark.parametrize("name", ["application_state","order_state","workflow_state","sales_region","business_region"])
def test_geo_excluded_context(name):
    assert C.GEOGRAPHIC_INFORMATION not in _categories_for(_one(name,["x","y"]))

@pytest.mark.parametrize("name", ["age","gender","birth_date","date_of_birth","dob"])
def test_demographic_positive_and_personal(name):
    vals=[1,2] if name in {"age","gender"} else [date(2026,1,1),date(2026,1,2)]
    cats=_categories_for(_one(name,vals))
    assert C.DEMOGRAPHIC_INFORMATION in cats and C.POTENTIAL_PERSONAL_DATA in cats

@pytest.mark.parametrize("name", ["revenue","amount","price","cost","salary"])
def test_financial_numeric(name):
    cats=_categories_for(_one(name,[1,2,3]))
    assert C.FINANCIAL_INFORMATION in cats and C.POTENTIAL_PERSONAL_DATA not in cats

@pytest.mark.parametrize("name", ["revenue","amount","price","cost"])
def test_financial_metric_coexistence(name):
    cats=_categories_for(_one(name,[1,2,3])); assert C.FINANCIAL_INFORMATION in cats and C.BUSINESS_METRIC in cats

def test_financial_string_rejected():
    assert C.FINANCIAL_INFORMATION not in _categories_for(_one("revenue",["x","y"]))

@pytest.mark.parametrize("name", ["quantity","count","score"])
def test_metric_numeric(name):
    assert C.BUSINESS_METRIC in _categories_for(_one(name,[1,2,3]))

def test_metric_negative_names():
    for name in ("customer_id","postal_code","random_numeric"):
        assert C.BUSINESS_METRIC not in _categories_for(_one(name,[1,2,3]))

@pytest.mark.parametrize("name", ["description","comment","comments","note","notes","free_text"])
def test_free_text_positive(name):
    assert C.FREE_TEXT in _categories_for(_one(name,["a","b"]))

def test_free_text_negative():
    assert C.FREE_TEXT not in _categories_for(_one("random_text_column",["a","b"]))
    assert C.FREE_TEXT not in _categories_for(_one("description",[1,2]))

@pytest.mark.parametrize("name,values", [("event",[date(2026,1,1)]),("event_time",[date(2026,1,1)]),("created_at",[date(2026,1,1),date(2026,1,2)])])
def test_temporal_confidence(name, values):
    item=next(x for x in evaluate_governance(_one(name,values)).classifications if x.category is C.TEMPORAL_FIELD)
    assert item.confidence.value == ("MEDIUM" if name=="created_at" else "LOW")
    assert C.POTENTIAL_PERSONAL_DATA not in _categories_for(_one(name,values))

def test_categorical_exact_boundaries():
    base=_one("segment",["a","b"]*10).columns[0]
    cases=[(20,10,2,.20,True),(19,10,2,.20,False),(20,9,2,.20,False),(20,10,1,.10,False),(20,10,2,.2000001,False)]
    for rows,nonnull,distinct,ratio,ok in cases:
        c=replace(base,row_count=rows,non_null_count=nonnull,distinct_count=distinct,cardinality_ratio=ratio,inferred_primitive_type=PrimitiveType.STRING)
        p=replace(_one("segment",["a","b"]*10),row_count=rows,columns=(c,))
        assert (C.CATEGORICAL_DIMENSION in _categories_for(p)) is ok

def test_categorical_boolean_and_numeric_type_exclusions():
    p=_one("segment",[True,False]*10); assert C.CATEGORICAL_DIMENSION in _categories_for(p)
    for typ in (PrimitiveType.INTEGER,PrimitiveType.FLOAT,PrimitiveType.DATE,PrimitiveType.DATETIME):
        c=replace(_one("segment",["a","b"]*10).columns[0],inferred_primitive_type=typ)
        assert C.CATEGORICAL_DIMENSION not in _categories_for(replace(p,columns=(c,)))

def test_quasi_policy_and_exclusion():
    a=evaluate_governance(_profile({"age":list(range(20)),"city":["x","y"]*10})); assert [x.column_id for x in a.classifications if x.category is C.QUASI_IDENTIFIER]==["col:0","col:1"]
    assert C.QUASI_IDENTIFIER not in _categories_for(_one("age",list(range(20))))
    b=evaluate_governance(_profile({"age":list(range(20)),"city":["x","y"]*10,"email":["x"]*20})); assert [x.column_id for x in b.classifications if x.category is C.QUASI_IDENTIFIER]==["col:0","col:1"]

def test_confidence_and_signal_weights():
    a=evaluate_governance(_one("revenue",[1,2,3])); item=next(x for x in a.classifications if x.category is C.FINANCIAL_INFORMATION); assert item.confidence.value=="MEDIUM"; assert [(s.source.value,s.strength) for s in item.signals]==[("COLUMN_NAME",2),("PRIMITIVE_TYPE",1)]

def test_references_language_and_summary_safety():
    a=evaluate_governance(_profile({"customer_id":[f"id{i}" for i in range(20)],"email":[f"alice{i}@example.test" for i in range(20)],"age":list(range(20)),"city":["x","y"]*10,"revenue":list(range(20))}))
    ids={e.id for e in a.evidence}; assert all(eid in ids for c in a.classifications for eid in c.evidence_ids); assert a.summary.classified_column_count==5; assert "alice" not in repr(a)
    forbidden=("contains personal data","is pii","gdpr compliant","gdpr violation","gdpr risk","confirmed quasi-identifier","sensitive personal data","legally required","must obtain consent")
    assert not any(p in repr(a).casefold() for p in forbidden)

def test_zero_and_small_profiles_safe():
    assert evaluate_governance(_profile({"x":[]})).summary.classified_column_count == 0
    assert evaluate_governance(_profile({"x":["a"]})).summary.classified_column_count == 0

def test_confidence_high_requires_strong_signal():
    from app.governance.engine import _classification
    from app.governance.models import GovernanceSignal, SignalSource
    s1=GovernanceSignal("s1",SignalSource.VALUE_PATTERN,"reserved",3,True,"GOV-CONTACT-001","0.1","e1")
    s2=GovernanceSignal("s2",SignalSource.COLUMN_NAME,"name",2,True,"GOV-CONTACT-001","0.1","e2")
    s3=GovernanceSignal("s3",SignalSource.PRIMITIVE_TYPE,"type",1,True,"GOV-CONTACT-001","0.1","e3")
    item=_classification(_one("email",["x"]).columns[0],C.CONTACT_INFORMATION,(s1,s2,s3),())
    assert item.confidence.value == "HIGH"

def test_emitted_rule_ids_are_canonical_and_ids_unique():
    allowed={"GOV-ID-001","GOV-TEMP-001","GOV-CONTACT-001","GOV-GEO-001","GOV-GEO-002","GOV-DEMO-001","GOV-FIN-001","GOV-METRIC-001","GOV-TEXT-001","GOV-CAT-001","GOV-PERSONAL-001","GOV-QUASI-001"}
    a=evaluate_governance(_profile({"age":list(range(20)),"city":["x","y"]*10,"revenue":list(range(20))}))
    assert {c.method for c in a.classifications} <= allowed
    assert len({c.id for c in a.classifications})==len(a.classifications)
    assert len({e.id for e in a.evidence})==len(a.evidence)
