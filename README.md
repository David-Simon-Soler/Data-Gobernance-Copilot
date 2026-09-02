# Data Governance Copilot

**Status: Phase 0 — Product & Architecture**

Futura aplicación local para perfilar CSV/XLSX y presentar calidad, riesgos potenciales de gobernanza, evidencia y acciones priorizadas. No es un comprobador de cumplimiento legal ni sustituye a un Data Steward o revisión jurídica.

## Enfoque

El núcleo será profiling determinista, reglas explícitas, evidencia trazable y scoring reproducible. La IA, si se añade, solo redactará o sugerirá sobre resultados calculados. Toda salida queda etiquetada `DETECTED`, `INFERRED` o `SUGGESTED`; la ausencia de un finding no certifica ausencia de problema.

```text
Browser → Next.js → FastAPI → Profiling → Quality → Governance → Recommendations
                                                               ↘ Optional AI
```

Procesamiento stateless, local y temporal: no persiste datasets por defecto.

## Stack previsto

- Frontend: Next.js, TypeScript, Tailwind CSS.
- Backend: Python, FastAPI, Pydantic, Polars.
- XLSX: openpyxl solo si es necesario.
- Tests futuros: pytest, Vitest, Playwright.

Es un stack coherente para un motor Python de profiling y una UI moderna. Phase 0 no instala ni implementa nada.

## V0.1 previsto

CSV/XLSX; esquema, nulos, cardinalidad, estadísticas, duplicados, tipos y señales básicas; cuatro dimensiones de calidad; clasificación semántica y posibles datos personales; overview, findings, evidencia, recomendaciones y borrador de diccionario.

Fuera: cuentas, DB, conectores, lineage, data contracts, certificación GDPR, PDF/OCR, embeddings, agentes, chat, BI y ETL.

## Documentación

- [Producto](docs/PRODUCT.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Dominio](docs/DOMAIN.md)
- [Modelo de calidad](docs/QUALITY_MODEL.md)
- [Gobernanza](docs/GOVERNANCE.md)
- [Privacidad y seguridad](docs/PRIVACY.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisiones](docs/DECISIONS.md)
