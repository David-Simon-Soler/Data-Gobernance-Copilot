import re
from collections import Counter
from app.profiling.models import AssertionLevel, Confidence, DatasetProfile, Evidence, Finding, PrimitiveType, Severity
from .models import GovernanceAssessment, GovernanceCategory as C, GovernanceClassification, GovernanceSignal, GovernanceSummary, SignalSource as S

V="0.1"; NUM={PrimitiveType.INTEGER,PrimitiveType.FLOAT}; TEXT={PrimitiveType.STRING,PrimitiveType.BOOLEAN}
RULES={C.IDENTIFIER:"GOV-ID-001",C.TEMPORAL_FIELD:"GOV-TEMP-001",C.CONTACT_INFORMATION:"GOV-CONTACT-001",C.GEOGRAPHIC_INFORMATION:"GOV-GEO-001",C.DEMOGRAPHIC_INFORMATION:"GOV-DEMO-001",C.FINANCIAL_INFORMATION:"GOV-FIN-001",C.BUSINESS_METRIC:"GOV-METRIC-001",C.FREE_TEXT:"GOV-TEXT-001",C.CATEGORICAL_DIMENSION:"GOV-CAT-001",C.POTENTIAL_PERSONAL_DATA:"GOV-PERSONAL-001",C.QUASI_IDENTIFIER:"GOV-QUASI-001"}

def normalize_column_name(name:str)->tuple[str,...]:
    return tuple(x for x in re.split(r"[_\-\s]+",re.sub(r"(?<=[a-z0-9])(?=[A-Z])"," ",name).casefold()) if x)

def evaluate_governance(profile:DatasetProfile)->GovernanceAssessment:
    selected={c.column_id:_categories(c) for c in profile.columns}
    eligible=[c for c in profile.columns if C.DEMOGRAPHIC_INFORMATION in selected[c.column_id] or C.GEOGRAPHIC_INFORMATION in selected[c.column_id]]
    if len(eligible)>=2:
        for c in eligible:
            if C.IDENTIFIER not in selected[c.column_id] and C.CONTACT_INFORMATION not in selected[c.column_id]: selected[c.column_id].add(C.QUASI_IDENTIFIER)
    for c in profile.columns:
        cats=selected[c.column_id]
        if cats & {C.IDENTIFIER,C.CONTACT_INFORMATION,C.DEMOGRAPHIC_INFORMATION}: cats.add(C.POTENTIAL_PERSONAL_DATA)
    classes=[]; evidence=[]; findings=[]
    for c in profile.columns:
        for cat in C:
            if cat in selected[c.column_id]:
                sig=_signals(c,cat); ev=tuple(_evidence(c,cat,x) for x in sig); item=_classification(c,cat,sig,ev)
                classes.append(item); evidence.extend(ev); findings.append(_finding(item,c.name))
    counts=Counter(x.category for x in classes); personal=tuple(x.column_id for x in classes if x.category is C.POTENTIAL_PERSONAL_DATA)
    return GovernanceAssessment(tuple(classes),tuple(findings),tuple(evidence),GovernanceSummary(len({x.column_id for x in classes}),personal,tuple((x,counts[x]) for x in C if counts[x])))

def _categories(c):
    t=normalize_column_name(c.name); out=set(); typ=c.inferred_primitive_type
    if c.is_candidate_identifier and c.candidate_identifier and c.candidate_identifier.name_signal and (t in {("id",),("identifier",),("uuid",),("guid",)} or t[-1:]==("id",)): out.add(C.IDENTIFIER)
    if typ in {PrimitiveType.DATE,PrimitiveType.DATETIME}: out.add(C.TEMPORAL_FIELD)
    if _match(t,{("email",),("phone",),("phone","number"),("telephone",),("mobile",),("mobile","phone")}, {"campaign","sent","count","call"}): out.add(C.CONTACT_INFORMATION)
    if _match(t,{("country",),("country","code"),("city",),("postal","code"),("postcode",),("zip","code"),("latitude",),("longitude",)},set()) or t in {("region",),("state",),("province",)}: out.add(C.GEOGRAPHIC_INFORMATION)
    if _match(t,{("age",),("birth","date"),("date","of","birth"),("dob",),("gender",)},set()): out.add(C.DEMOGRAPHIC_INFORMATION)
    if typ in NUM and _match(t,{("revenue",),("amount",),("price",),("cost",),("salary",)},set()): out.add(C.FINANCIAL_INFORMATION)
    if typ in NUM and _match(t,{("revenue",),("amount",),("price",),("cost",),("quantity",),("count",),("score",)},set()): out.add(C.BUSINESS_METRIC)
    if typ is PrimitiveType.STRING and _match(t,{("description",),("comment",),("comments",),("note",),("notes",),("free","text")},set()): out.add(C.FREE_TEXT)
    if typ in TEXT and c.row_count>=20 and c.non_null_count>=10 and c.distinct_count>=2 and c.cardinality_ratio is not None and c.cardinality_ratio<=.2 and not out & {C.IDENTIFIER,C.FREE_TEXT,C.BUSINESS_METRIC}: out.add(C.CATEGORICAL_DIMENSION)
    return out

def _match(tokens, names, excluded): return any(tokens==n or tokens[-len(n):]==n for n in names) and not any(x in tokens for x in excluded) and tokens not in {("application","state"),("order","state"),("workflow","state"),("sales","region"),("business","region")}
def _signals(c,cat):
    rule=RULES[cat]; items=[]; name={C.IDENTIFIER,C.CONTACT_INFORMATION,C.GEOGRAPHIC_INFORMATION,C.DEMOGRAPHIC_INFORMATION,C.FINANCIAL_INFORMATION,C.BUSINESS_METRIC,C.FREE_TEXT,C.TEMPORAL_FIELD}
    if cat in name and (cat is not C.TEMPORAL_FIELD or normalize_column_name(c.name) in {("date",),("datetime",),("timestamp",),("time",),("created","at"),("updated","at")}): items.append(_signal(c,cat,S.COLUMN_NAME,"approved_name",2,rule))
    if cat in {C.IDENTIFIER}: items.append(_signal(c,cat,S.UNIQUENESS,"structural_candidate_identifier",1,rule))
    if cat in {C.TEMPORAL_FIELD,C.DEMOGRAPHIC_INFORMATION,C.FINANCIAL_INFORMATION,C.BUSINESS_METRIC,C.FREE_TEXT,C.CATEGORICAL_DIMENSION}: items.append(_signal(c,cat,S.PRIMITIVE_TYPE,c.inferred_primitive_type.value,1,rule))
    if cat is C.CATEGORICAL_DIMENSION: items.append(_signal(c,cat,S.VALUE_DISTRIBUTION,"bounded_cardinality",1,rule))
    if cat in {C.POTENTIAL_PERSONAL_DATA,C.QUASI_IDENTIFIER}: items.append(_signal(c,cat,S.COLUMN_NAME,"contributing_category",1,rule))
    return tuple(items)
def _signal(c,cat,src,kind,strength,rule): return GovernanceSignal(f"S-GOV-COL-{c.position}-{cat.value}-{src.value}",src,kind,strength,True,rule,V,f"E-GOV-COL-{c.position}-{cat.value}-{src.value}")
def _evidence(c,cat,s): return Evidence(s.evidence_id,"governance_signal",c.column_id,s.rule_id,V,"governance_signal_strength",s.strength,details=(("position",c.position),("normalized_name_tokens",','.join(normalize_column_name(c.name))),("primitive_type",c.inferred_primitive_type.value),("candidate_identifier",c.is_candidate_identifier)))
def _classification(c,cat,sig,ev):
    score=sum(x.strength for x in sig); conf=Confidence.HIGH if score>=5 and any(x.strength==3 for x in sig) else Confidence.MEDIUM if score>=3 else Confidence.LOW
    return GovernanceClassification(f"C-GOV-{c.column_id}-{cat.value}",c.column_id,cat,AssertionLevel.INFERRED,conf,True,RULES[cat],V,sig,tuple(x.id for x in ev))
def _finding(i,name): return Finding(f"F-GOV-{i.column_id}-{i.category.value}",AssertionLevel.INFERRED,Severity.INFO,i.confidence,i.category.value.casefold(),i.column_id,f"Inferred {i.category.value.casefold().replace('_',' ')}",f"Column {name} matched deterministic governance signals; this is not a legal or compliance determination.",i.method,i.evidence_ids)
