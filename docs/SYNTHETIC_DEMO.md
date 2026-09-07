# Synthetic Demo Dataset

## Purpose and safety

`apps/web/public/demo/customer-operations-sample.xlsx` is the canonical V0.1 **Customer Operations Sample**. All 50 records are synthetic and represent no real individuals. Identifiers use the `SYN-CUST-` prefix, email addresses use the reserved `example.test` domain, phone-like values use the explicit `synthetic-phone-` prefix, and names are numbered `Synthetic Customer` labels. The fixture exists only to exercise deterministic V0.1 rules; it is not evidence about a real organization or a legal/compliance example.

XLSX is intentional. The current CSV ingestion contract preserves empty fields as strings, while this workbook uses genuinely empty cells so observed completeness and null counts are demonstrated without changing ingestion or analysis rules.

## Dataset design

The single visible `Customer Operations` sheet has 50 rows and 13 columns: `customer_id`, `full_name`, `email`, `phone`, `region`, `signup_date`, `last_contact_at`, `annual_revenue`, `account_status`, `notes`, `active_flag`, `service_score` and `customer_age`.

The static data includes:

- one duplicate `customer_id`, while retaining the canonical 98% uniqueness threshold for a name-based structural candidate identifier;
- three missing emails, three missing phone values, two missing regions and two missing notes;
- one malformed `service_score` among 50 values, retaining the 98% typed-signal threshold;
- mixed lower/upper Boolean formats in `active_flag` for a deterministic consistency penalty;
- names and physical types that exercise identifier, contact, geographic, temporal, financial, business-metric, categorical, free-text, demographic, potential-personal-data and quasi-identifier classifications.

No backend threshold or rule is adjusted for the demo.

## Same analysis path

The landing-page demo action fetches the bundled asset, creates a browser `File`, and sends it through the existing `analyzeDataset` client to `POST /api/v1/analyze`. The API then uses the normal ingestion → profiling → Quality → Governance → Recommendations pipeline. No result JSON, score or classification is bundled with the frontend.

## Observed V0.1 result

Validated against the real current backend:

- filename: `customer-operations-sample.xlsx`;
- selected sheet: `Customer Operations`;
- 50 rows and 13 columns;
- overall structural quality: 99/100;
- observed completeness: 98.46%;
- dimensions: structural completeness 100, uniqueness 98.4, validity 99.67 and consistency 96.66;
- 2 Quality findings: one duplicate structural identifier and one malformed value;
- 19 Governance classifications and 19 corresponding Governance findings;
- 8 recommendations;
- categories: `IDENTIFIER`, `CONTACT_INFORMATION`, `GEOGRAPHIC_INFORMATION`, `TEMPORAL_FIELD`, `FINANCIAL_INFORMATION`, `BUSINESS_METRIC`, `CATEGORICAL_DIMENSION`, `FREE_TEXT`, `DEMOGRAPHIC_INFORMATION`, `POTENTIAL_PERSONAL_DATA` and `QUASI_IDENTIFIER`.

## Reproduction

The reviewable generator is `apps/web/scripts/generate_synthetic_demo.py`. Run it with a Python environment containing the already-declared backend `openpyxl` dependency:

```text
cd apps/web
python scripts/generate_synthetic_demo.py
```

The generated workbook replaces only the bundled static demo asset.
