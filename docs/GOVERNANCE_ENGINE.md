# Governance Engine V0.1

`evaluate_governance(profile)` consume un `DatasetProfile` inmutable y devuelve `GovernanceAssessment`; no reabre archivos, no usa DataFrame, Quality, IA, recomendaciones ni conclusiones legales. La taxonomía canónica incluye `QUASI_IDENTIFIER`, siempre con el significado cauteloso de potential quasi-identifier.

Las salidas son `INFERRED`, deterministas y ordenadas por la taxonomía. Señales: `COLUMN_NAME`, `PRIMITIVE_TYPE`, `UNIQUENESS`, `VALUE_DISTRIBUTION`; `VALUE_PATTERN` está diferida. Pesos: name=2, type/uniqueness/distribution=1, pattern=3; LOW 1–2, MEDIUM 3–4, HIGH 5+ con señal fuerte.

Nombres: camelCase y separadores se tokenizan y casefold sin fuzzy/substrings. Reglas activas y versionadas: `GOV-ID-001`, `GOV-TEMP-001`, `GOV-CONTACT-001`, `GOV-GEO-001`, `GOV-DEMO-001`, `GOV-FIN-001`, `GOV-METRIC-001`, `GOV-TEXT-001`, `GOV-CAT-001`, `GOV-PERSONAL-001`, `GOV-QUASI-001`. Sus vocabularios, exclusiones, umbrales categóricos, coexistencia y reglas derivadas están definidos canónicamente en [GOVERNANCE.md](GOVERNANCE.md).

Evidence solo contiene metadata estructural aprobada; nunca valores, muestras o filas. CONTACT/IDENTIFIER/DEMOGRAPHIC pueden derivar `POTENTIAL_PERSONAL_DATA`; no geografía, finanzas, temporal, texto, métricas o categorías. Findings usan lenguaje de inferencia/potencial, nunca PII/GDPR/compliance.
