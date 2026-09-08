import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import Home from "./page";
import { ColumnInventory } from "../components/results/ColumnInventory";
import { fixture } from "../test/fixture";
import type { AnalysisResponse } from "../types/api";

const makeFile = (name = "sample.csv", bytes = 10) => new File([new Uint8Array(bytes)], name);
const success = (value: AnalysisResponse = fixture) => new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });
const demoAsset = () => new Response(new Uint8Array([80, 75, 3, 4]), { status: 200 });
const demoResponse: AnalysisResponse = {
  ...fixture,
  metadata: {
    ...fixture.metadata,
    source_filename: "customer-operations-sample.xlsx",
    source_format: "xlsx",
    sheet_name: "Customer Operations",
    row_count: 50,
    column_count: 13,
  },
};
const failure = (code: string, status = 400) => new Response(JSON.stringify({ error: { code, message: "SECRET_BACKEND_DETAIL" } }), { status, headers: { "Content-Type": "application/json" } });
const choose = (name = "sample.csv", bytes = 10) => fireEvent.change(screen.getByLabelText(/choose a csv/i), { target: { files: [makeFile(name, bytes)] } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Analyze dataset" }));
const renderResult = async (value: AnalysisResponse = fixture) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(success(value)));
  render(<Home />);
  choose();
  submit();
  await screen.findByText("Analysis complete");
};
const sectionByHeading = (name: string) => {
  const section = screen.getByRole("heading", { name }).closest("section");
  if (!section) throw new Error(`Section not found: ${name}`);
  return section;
};
const articleByHeading = (name: string) => {
  const article = screen.getByRole("heading", { name }).closest("article");
  if (!article) throw new Error(`Article not found: ${name}`);
  return article;
};
const rowByName = (name: string) => {
  const row = screen.getByRole("rowheader", { name }).closest("tr");
  if (!row) throw new Error(`Column row not found: ${name}`);
  return row;
};

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("V0.1 analysis flow", () => {
  it("renders upload and disables Analyze initially", () => { render(<Home />); expect(screen.getByText(/understand the quality/i)).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Analyze dataset" })).toBeDisabled(); });
  it("renders the complete deterministic landing proposition", () => {
    render(<Home />);
    expect(screen.getByText("Data Governance Copilot")).toBeInTheDocument();
    expect(screen.getByText("Evidence-first dataset assessment")).toBeInTheDocument();
    expect(screen.getByText(/deterministic profiling, quality assessment/i)).toBeInTheDocument();
    expect(screen.getByText("Governance classification signals", { exact: false })).toBeInTheDocument();
    const characteristics = screen.getByLabelText("Analysis characteristics");
    expect(within(characteristics).getByText("Deterministic rules")).toBeInTheDocument();
    expect(within(characteristics).getByText("Evidence-backed")).toBeInTheDocument();
    expect(within(characteristics).getByText("Stateless analysis")).toBeInTheDocument();
  });
  it("renders supported formats, upload limit and factual processing boundaries", () => {
    render(<Home />);
    expect(screen.getByText("CSV / XLSX · maximum 5 MiB")).toBeInTheDocument();
    const summary = screen.getByText("Processing & privacy details");
    const disclosure = summary.closest("details");
    expect(disclosure).not.toHaveAttribute("open");
    expect(screen.getByText(/does not persist uploaded datasets/i)).toBeInTheDocument();
    expect(screen.getByText(/raw rows are not returned/i)).toBeInTheDocument();
    expect(screen.getByText(/require human review and are not a legal or compliance determination/i)).toBeInTheDocument();
    fireEvent.click(summary);
    expect(disclosure).toHaveAttribute("open");
  });
  it("does not render prohibited privacy or compliance claims", () => {
    render(<Home />);
    expect(screen.queryByText(/your file never leaves your device/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fully private/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/GDPR compliant/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/secure by default/i)).not.toBeInTheDocument();
  });
  it("accepts CSV selection", () => { render(<Home />); choose("customers.csv"); expect(screen.getByText("customers.csv")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Analyze dataset" })).toBeEnabled(); });
  it("accepts XLSX selection", () => { render(<Home />); choose("customers.xlsx"); expect(screen.getByText("customers.xlsx")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Analyze dataset" })).toBeEnabled(); });
  it("rejects unsupported extensions without calling API", () => { const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); render(<Home />); choose("customers.pdf"); expect(screen.getByText("Upload a CSV or XLSX file.")).toBeInTheDocument(); expect(fetch).not.toHaveBeenCalled(); });
  it("rejects files over 5 MiB without calling API", () => { const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); render(<Home />); choose("large.csv", 5 * 1024 * 1024 + 1); expect(screen.getByText("Files must be 5 MiB or smaller.")).toBeInTheDocument(); expect(fetch).not.toHaveBeenCalled(); });
  it("removes the selected file and returns to idle", () => { render(<Home />); choose("customers.csv"); fireEvent.click(screen.getByRole("button", { name: "Remove" })); expect(screen.getByRole("button", { name: "Analyze dataset" })).toBeDisabled(); expect(screen.queryByText("customers.csv")).not.toBeInTheDocument(); });
  it("keeps controls disabled while submitting", async () => { let resolve!: (r: Response) => void; vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { resolve = r; }))); render(<Home />); choose("customers.csv"); submit(); expect(await screen.findByRole("status")).toHaveTextContent("Analyzing dataset…"); expect(screen.getByLabelText(/choose a csv/i)).toBeDisabled(); expect(screen.getByRole("button", { name: "Analyzing dataset…" })).toBeDisabled(); resolve(success()); });
  it("renders overview and result navigation on success", async () => {
    await renderResult();
    expect(screen.getByRole("heading", { name: "sample.csv", level: 1 })).toBeInTheDocument();
    for (const text of ["Overview", "Quality", "Governance", "Recommendations", "Columns"]) {
      expect(screen.getByRole("link", { name: text })).toBeInTheDocument();
    }
  });
  it("renders applicable numeric quality score", async () => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(success())); render(<Home />); choose(); submit(); await screen.findByText("Analysis complete"); const quality = within(sectionByHeading("Quality")); expect(quality.getByText("82", { selector: ".quality-score strong" })).toBeInTheDocument(); expect(quality.getByText("/ 100")).toBeInTheDocument(); });
  it("renders non-applicable quality and completeness as N/A, never zero", async () => {
    const value = {
      ...fixture,
      analysis: {
        ...fixture.analysis,
        quality: {
          ...fixture.analysis.quality,
          overall_score: null,
          observed_completeness: null,
        },
      },
    };
    await renderResult(value);
    expect(
      within(screen.getByRole("group", { name: "Overall structural quality" }))
        .getByText("N/A"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "Observed completeness" }))
        .getByText("N/A"),
    ).toBeInTheDocument();
    expect(screen.queryByText("0 / 100")).not.toBeInTheDocument();
  });
  it("renders dataset identity and canonical metrics in the context header", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(success()));
    render(<Home />);
    choose();
    submit();
    const title = await screen.findByRole("heading", { name: "sample.csv", level: 1 });
    const overview = within(title.closest("section")!);
    expect(title).toHaveFocus();
    expect(overview.getByText("CSV", { selector: ".format-badge" })).toBeInTheDocument();
    expect(overview.getByText("3 rows")).toBeInTheDocument();
    expect(overview.getByText("2 columns")).toBeInTheDocument();
    const metrics = within(screen.getByRole("group", { name: "Review summary" }));
    expect(
      within(metrics.getByRole("group", { name: "Overall structural quality" }))
        .getByText("82"),
    ).toBeInTheDocument();
    expect(
      within(metrics.getByRole("group", { name: "Observed completeness" }))
        .getByText("83.4%"),
    ).toBeInTheDocument();
    for (const metric of ["Quality findings", "Governance classifications", "Recommendations"]) {
      expect(within(metrics.getByRole("group", { name: metric })).getByText("1"))
        .toBeInTheDocument();
    }
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
  it("keeps compact dataset context with the canonical navigation", async () => {
    await renderResult();
    const context = screen.getByLabelText("Current dataset context");
    expect(within(context).getByText("sample.csv")).toBeInTheDocument();
    expect(within(context).getByText("CSV")).toBeInTheDocument();
    expect(within(context).getByText("82 / 100 quality")).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "Result sections" })).toHaveLength(1);
  });
  it("renders the selected XLSX sheet in Overview", async () => {
    const value = {
      ...fixture,
      metadata: {
        ...fixture.metadata,
        source_filename: "workbook.xlsx",
        source_format: "xlsx",
        sheet_name: "Customers",
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(success(value)));
    render(<Home />);
    choose("workbook.xlsx");
    submit();
    await screen.findByText("Analysis complete");
    const overview = within(sectionByHeading("workbook.xlsx"));
    expect(overview.getByText("XLSX")).toBeInTheDocument();
    expect(overview.getByText("Sheet: Customers")).toBeInTheDocument();
  });
  it("uses the exact cautious zero-attention wording", async () => {
    const value = {
      ...fixture,
      analysis: {
        ...fixture.analysis,
        quality: { ...fixture.analysis.quality, findings: [] },
        governance: {
          ...fixture.analysis.governance,
          findings: [],
          classifications: [],
          summary: {
            ...fixture.analysis.governance.summary,
            classified_column_count: 0,
            columns_with_potential_personal_data: [],
            category_counts: [],
          },
        },
        recommendations: {
          ...fixture.analysis.recommendations,
          recommendations: [],
          summary: {
            total_count: 0,
            counts_by_priority: [],
            counts_by_category: [],
          },
        },
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(success(value)));
    render(<Home />);
    choose();
    submit();
    expect(await screen.findByText("No Warning, High or Critical quality findings were produced by the current V0.1 rules.")).toBeInTheDocument();
  });
  it("renders ingestion warnings once in Overview", async () => {
    const value = {
      ...fixture,
      metadata: { ...fixture.metadata, warnings: ["Formula cells were treated as unavailable."] },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(success(value)));
    render(<Home />);
    choose();
    submit();
    expect(await screen.findByText("Ingestion warnings")).toBeInTheDocument();
    expect(screen.getAllByText("Formula cells were treated as unavailable.")).toHaveLength(1);
  });
  it("provides low-priority analysis details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(success()));
    render(<Home />);
    choose();
    submit();
    await screen.findByText("Analysis complete");
    const disclosure = screen.getByText("Analysis details");
    expect(disclosure.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(disclosure);
    expect(screen.getByText("Response schema")).toBeInTheDocument();
    expect(screen.getByText("Profiling method")).toBeInTheDocument();
    expect(screen.getByText("deterministic_polars_v0_1")).toBeInTheDocument();
  });
  it("retains a very long filename as the semantic result heading", async () => {
    const filename = `${"customer-governance-export-".repeat(8)}.csv`;
    const value = { ...fixture, metadata: { ...fixture.metadata, source_filename: filename } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(success(value)));
    render(<Home />);
    choose(filename);
    submit();
    expect(await screen.findByRole("heading", { name: filename, level: 1 })).toBeInTheDocument();
  });
  it("renders exact empty finding wording", async () => { const value = { ...fixture, analysis: { ...fixture.analysis, profiling: { ...fixture.analysis.profiling, findings: [] }, quality: { ...fixture.analysis.quality, findings: [] }, governance: { ...fixture.analysis.governance, findings: [], classifications: [] } } }; vi.stubGlobal("fetch", vi.fn().mockResolvedValue(success(value))); render(<Home />); choose(); submit(); await screen.findByText("Analysis complete"); expect(screen.getAllByText("No findings were produced by the current V0.1 rules.").length).toBeGreaterThan(0); });
  it("renders quality and governance findings with semantics", async () => { await renderResult(); const qualityFindings = within(sectionByHeading("Quality findings")); const governanceFindings = within(sectionByHeading("Governance findings & evidence")); expect(qualityFindings.getByRole("heading", { name: "Missing values" })).toBeInTheDocument(); expect(qualityFindings.getByText("Severity: Warning")).toBeInTheDocument(); expect(qualityFindings.getByText(/Detected · High confidence/)).toBeInTheDocument(); expect(governanceFindings.getByRole("heading", { name: "Potential contact field" })).toBeInTheDocument(); expect(governanceFindings.getByText("Severity: Info")).toBeInTheDocument(); expect(governanceFindings.getByText(/Inferred · Medium confidence/)).toBeInTheDocument(); });
  it("opens contextual evidence disclosure", async () => { await renderResult(); const finding = within(articleByHeading("Missing values")); const review = finding.getByText("Review finding details"); expect(review.closest("details")).not.toHaveAttribute("open"); fireEvent.click(review); const disclosure = finding.getByText("Why this was flagged"); const details = disclosure.closest("details"); expect(details).not.toHaveAttribute("open"); fireEvent.click(disclosure); expect(details).toHaveTextContent("Null Ratio33.3%"); expect(details).toHaveTextContent("3 assessed"); expect(finding.getByText("Q-1")).toBeInTheDocument(); });
  it("renders recommendations and finding traceability", async () => { await renderResult(); const recommendation = within(articleByHeading("Review email handling")); expect(recommendation.getByText("Priority P1")).toBeInTheDocument(); expect(recommendation.getByText("A governance signal warrants review.")).toBeInTheDocument(); fireEvent.click(recommendation.getByText("Why this recommendation?")); expect(recommendation.getByText("Potential contact field")).toBeInTheDocument(); expect(recommendation.getByText("G-1")).toBeInTheDocument(); });
  it("filters columns by name", async () => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(success())); render(<Home />); choose(); submit(); await screen.findByText("Analysis complete"); const columns = within(sectionByHeading("Column inventory")); fireEvent.change(columns.getByPlaceholderText("Column name"), { target: { value: "email" } }); const table = within(columns.getByRole("table")); expect(table.getByRole("rowheader", { name: "email" })).toBeInTheDocument(); expect(table.queryByRole("rowheader", { name: "customer_id" })).not.toBeInTheDocument(); });
  it("joins canonical governance classifications without fake column data", async () => { await renderResult(); const columns = within(sectionByHeading("Column inventory")); expect(fixture.analysis.profiling.columns.every((column) => column.classifications.length === 0)).toBe(true); expect(columns.getByLabelText("Classification")).toHaveValue("all"); expect(within(rowByName("email")).getByText("Potential Personal Data")).toBeInTheDocument(); expect(within(rowByName("customer_id")).queryByLabelText(/Governance classifications/)).not.toBeInTheDocument(); });
  it("maps API and network failures safely", async () => { vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret stack trace"))); render(<Home />); choose(); submit(); expect(await screen.findByText("We couldn't reach the analysis service.")).toBeInTheDocument(); expect(screen.queryByText("secret stack trace")).not.toBeInTheDocument(); });
  it.each([
    ["request_too_large", "The upload request is too large. Choose a smaller file.", 413],
    ["invalid_request", "The upload request was invalid. Choose the file again.", 422],
    ["sheet_not_applicable", "Sheet selection is only available for XLSX files.", 400],
  ])("maps %s to safe actionable copy", async (code, message, status) => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failure(code, status))); render(<Home />); choose(); submit(); expect(await screen.findByText(message)).toBeInTheDocument(); expect(screen.queryByText("SECRET_BACKEND_DETAIL")).not.toBeInTheDocument(); });
  it("resets successful results for another dataset", async () => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(success())); render(<Home />); choose(); submit(); await screen.findByText("Analysis complete"); fireEvent.click(screen.getByRole("button", { name: "Analyze another dataset" })); expect(screen.getByText(/understand the quality/i)).toBeInTheDocument(); expect(screen.queryByText("Analysis complete")).not.toBeInTheDocument(); });
});

describe("Phase 9.2 analytical result semantics", () => {
  it("keeps observed completeness distinct from structural completeness", async () => {
    await renderResult();
    const overview = within(sectionByHeading("Overview"));
    expect(overview.getByText("Observed completeness: 83.4%")).toBeInTheDocument();
    const quality = within(sectionByHeading("Quality"));
    expect(quality.queryByText("Observed dataset completeness")).not.toBeInTheDocument();
    expect(quality.getByRole("heading", { name: "Structural Completeness" })).toBeInTheDocument();
  });

  it("keeps Not Applicable and Insufficient Data distinct", async () => {
    await renderResult();
    const quality = within(sectionByHeading("Quality"));
    expect(quality.getByText("Not Applicable")).toBeInTheDocument();
    expect(quality.getByText("Insufficient Data")).toBeInTheDocument();
    expect(quality.getAllByText("N/A")).toHaveLength(2);
  });

  it("maps known quality reason codes to readable copy", async () => {
    await renderResult();
    const quality = within(sectionByHeading("Quality"));
    expect(quality.getByText("No structural candidate identifier met the current rule thresholds.")).toBeInTheDocument();
    expect(quality.getByText("Fewer than 10 valid non-null values were available for this check.")).toBeInTheDocument();
  });

  it("keeps raw reason codes in technical disclosures", async () => {
    await renderResult();
    const uniqueness = within(articleByHeading("Uniqueness"));
    fireEvent.click(uniqueness.getByText("Technical details"));
    expect(uniqueness.getByText("no_structural_candidate_identifier")).toBeInTheDocument();
  });

  it("uses a safe explanation for an unknown reason without hiding its raw code", async () => {
    const value: AnalysisResponse = {
      ...fixture,
      analysis: {
        ...fixture.analysis,
        quality: {
          ...fixture.analysis.quality,
          dimensions: fixture.analysis.quality.dimensions.map((dimension) =>
            dimension.name === "uniqueness"
              ? { ...dimension, reason: "future_reason_code" }
              : dimension,
          ),
        },
      },
    };
    await renderResult(value);
    const uniqueness = within(articleByHeading("Uniqueness"));
    expect(uniqueness.getByText(/could not produce an applicable score/)).toBeInTheDocument();
    fireEvent.click(uniqueness.getByText("Technical details"));
    expect(uniqueness.getByText("future_reason_code")).toBeInTheDocument();
  });

  it("groups multiple governance classifications under one column heading", async () => {
    const second = {
      ...fixture.analysis.governance.classifications[0],
      id: "gc2",
      category: "CONTACT_INFORMATION",
      evidence_ids: ["ge1"],
    };
    const value: AnalysisResponse = {
      ...fixture,
      analysis: {
        ...fixture.analysis,
        governance: {
          ...fixture.analysis.governance,
          classifications: [...fixture.analysis.governance.classifications, second],
        },
      },
    };
    await renderResult(value);
    const classified = within(sectionByHeading("Classified fields"));
    expect(classified.getAllByRole("heading", { name: "email" })).toHaveLength(1);
    expect(classified.getByText("Potential Personal Data")).toBeInTheDocument();
    expect(classified.getByText("Contact Information")).toBeInTheDocument();
  });

  it("renders the governance summary and cautious disclaimer without a score", async () => {
    await renderResult();
    const governance = within(sectionByHeading("Governance"));
    expect(governance.getByText("Potential personal data")).toBeInTheDocument();
    expect(governance.getByText(/not legal determinations and do not certify regulatory compliance/)).toBeInTheDocument();
    expect(governance.queryByText(/governance score|risk score|compliance score/i)).not.toBeInTheDocument();
  });

  it("keeps governance findings and INFO text reachable", async () => {
    await renderResult();
    const findings = within(sectionByHeading("Governance findings & evidence"));
    expect(findings.getByRole("heading", { name: "Potential contact field", hidden: true })).toBeInTheDocument();
    expect(findings.getByText("Severity: Info")).toBeInTheDocument();
  });

  it("puts finding meaning before secondary metadata and exposes a stable anchor", async () => {
    await renderResult();
    const article = articleByHeading("Missing values");
    expect(article).toHaveAttribute("id", "finding-qf1");
    expect(within(article).getByText("Some values are missing.")).toBeInTheDocument();
    expect(within(article).getByText(/Affected field:/)).toHaveTextContent("email");
    expect(within(article).getByText("Severity: Warning")).toBeInTheDocument();
  });

  it("links a recommendation to its exact canonical source finding", async () => {
    await renderResult();
    const link = within(articleByHeading("Review email handling")).getByRole("link", {
      name: "View source finding for email",
    });
    expect(link).toHaveAttribute("href", "#finding-gf1");
    expect(document.querySelector("#finding-gf1")).toBeInTheDocument();
  });

  it("uses column names for canonical column-id subjects without changing anchors", async () => {
    const value: AnalysisResponse = {
      ...fixture,
      analysis: {
        ...fixture.analysis,
        quality: {
          ...fixture.analysis.quality,
          findings: fixture.analysis.quality.findings.map((finding) => ({
            ...finding,
            subject: "c2",
          })),
        },
        governance: {
          ...fixture.analysis.governance,
          findings: fixture.analysis.governance.findings.map((finding) => ({
            ...finding,
            subject: "c2",
          })),
        },
      },
    };
    await renderResult(value);
    expect(within(articleByHeading("Missing values")).getByText(/Affected field:/))
      .toHaveTextContent("email");
    expect(
      within(articleByHeading("Review email handling")).getByRole("link", {
        name: "View source finding for email",
      }),
    ).toHaveAttribute("href", "#finding-gf1");
    expect(screen.queryByText(/Affected field: c2/)).not.toBeInTheDocument();
  });

  it("groups duplicate recommendation actions without losing either source", async () => {
    const secondFinding = {
      ...fixture.analysis.governance.findings[0],
      id: "gf2",
      subject: "phone",
      evidence_ids: ["ge2"],
    };
    const secondEvidence = {
      ...fixture.analysis.governance.evidence[0],
      id: "ge2",
      subject: "phone",
      observed_value: "phone",
    };
    const secondRecommendation = {
      ...fixture.analysis.recommendations.recommendations[0],
      id: "r2",
      finding_id: "gf2",
    };
    const value: AnalysisResponse = {
      ...fixture,
      analysis: {
        ...fixture.analysis,
        governance: {
          ...fixture.analysis.governance,
          findings: [...fixture.analysis.governance.findings, secondFinding],
          evidence: [...fixture.analysis.governance.evidence, secondEvidence],
        },
        recommendations: {
          ...fixture.analysis.recommendations,
          recommendations: [...fixture.analysis.recommendations.recommendations, secondRecommendation],
          summary: {
            total_count: 2,
            counts_by_priority: [["P1", 2]],
            counts_by_category: [["PRIVACY_REVIEW", 2]],
          },
        },
      },
    };
    await renderResult(value);
    const recommendations = within(sectionByHeading("Recommendations"));
    expect(recommendations.getAllByRole("heading", { name: "Review email handling" })).toHaveLength(1);
    expect(recommendations.getByText("2 canonical source relationships")).toBeInTheDocument();
    expect(recommendations.getByRole("link", { name: "View source finding for email" })).toHaveAttribute("href", "#finding-gf1");
    expect(recommendations.getByRole("link", { name: "View source finding for phone" })).toHaveAttribute("href", "#finding-gf2");
  });

  it("keeps the canonical recommendation total visible after grouping", async () => {
    await renderResult();
    const recommendations = within(sectionByHeading("Recommendations"));
    expect(recommendations.getByText(/1 canonical recommendation,/)).toBeInTheDocument();
    expect(recommendations.getByText("1 canonical source relationship")).toBeInTheDocument();
  });

  it("formats known ratio evidence as a percentage", async () => {
    await renderResult();
    const finding = within(articleByHeading("Missing values"));
    fireEvent.click(finding.getByText("Review finding details"));
    fireEvent.click(finding.getByText("Why this was flagged"));
    expect(finding.getByText("33.3%")).toBeInTheDocument();
    expect(finding.queryByText("0.333")).not.toBeInTheDocument();
  });

  it("does not format non-ratio numeric evidence as a percentage", async () => {
    const value: AnalysisResponse = {
      ...fixture,
      analysis: {
        ...fixture.analysis,
        quality: {
          ...fixture.analysis.quality,
          evidence: [{
            ...fixture.analysis.quality.evidence[0],
            metric: "duplicate_excess_rows",
            observed_value: 2,
          }],
        },
      },
    };
    await renderResult(value);
    const finding = within(articleByHeading("Missing values"));
    fireEvent.click(finding.getByText("Review finding details"));
    fireEvent.click(finding.getByText("Why this was flagged"));
    expect(finding.getByText("2")).toBeInTheDocument();
    expect(finding.queryByText("200%")).not.toBeInTheDocument();
  });

  it("renders profiling signals separately from Quality Engine findings", async () => {
    await renderResult();
    expect(screen.getByRole("heading", { name: "Profiling signals" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quality findings" })).toBeInTheDocument();
  });

  it("renders exactly one Recommendations section heading", async () => {
    await renderResult();
    expect(screen.getAllByRole("heading", { name: "Recommendations", level: 2 })).toHaveLength(1);
  });
});

describe("Phase 10.5.3 Overview and Quality", () => {
  it("derives the Overview assessment summary from canonical response values", async () => {
    await renderResult();
    const summary = within(
      screen.getByRole("group", { name: "Assessment summary" }),
    );
    expect(summary.getByText("1 finding")).toBeInTheDocument();
    expect(summary.getByText("Observed completeness: 83.4%")).toBeInTheDocument();
    expect(summary.getByText("1 classification")).toBeInTheDocument();
    expect(
      summary.getByText("1 field classified as potential personal data"),
    ).toBeInTheDocument();
    expect(summary.getByText("1 suggested action")).toBeInTheDocument();
  });

  it("uses only canonical findings in Needs attention and preserves their anchors", async () => {
    await renderResult();
    const attention = within(sectionByHeading("Needs attention"));
    expect(attention.getAllByRole("listitem")).toHaveLength(2);
    expect(attention.getByRole("link", { name: "Missing values" }))
      .toHaveAttribute("href", "#finding-qf1");
    expect(attention.getByText("Warning")).toBeInTheDocument();
    expect(attention.getByRole("link", { name: "Potential contact field" }))
      .toHaveAttribute("href", "#governance");
    expect(attention.getByText("Review · Medium confidence")).toBeInTheDocument();
  });

  it("does not fabricate attention rows and keeps factual empty states", async () => {
    const value: AnalysisResponse = {
      ...fixture,
      analysis: {
        ...fixture.analysis,
        profiling: { ...fixture.analysis.profiling, findings: [] },
        quality: { ...fixture.analysis.quality, findings: [] },
        governance: {
          ...fixture.analysis.governance,
          findings: [],
          classifications: [],
          summary: {
            ...fixture.analysis.governance.summary,
            classified_column_count: 0,
            columns_with_potential_personal_data: [],
            category_counts: [],
          },
        },
        recommendations: {
          ...fixture.analysis.recommendations,
          recommendations: [],
          summary: {
            total_count: 0,
            counts_by_priority: [],
            counts_by_category: [],
          },
        },
      },
    };
    await renderResult(value);
    const attention = within(sectionByHeading("Needs attention"));
    expect(attention.queryByRole("list")).not.toBeInTheDocument();
    expect(
      attention.getByText(
        "No Warning, High or Critical quality findings were produced by the current V0.1 rules.",
      ),
    ).toBeInTheDocument();
    const qualityFindings = within(sectionByHeading("Quality findings"));
    expect(
      qualityFindings.getByText(
        "No findings were produced by the current V0.1 quality rules.",
      ),
    ).toBeInTheDocument();
  });

  it("renders four dimensions with progress only for applicable scores", async () => {
    await renderResult();
    const quality = within(sectionByHeading("Quality"));
    for (const name of [
      "Structural Completeness",
      "Uniqueness",
      "Validity",
      "Consistency",
    ]) {
      expect(quality.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(quality.getAllByRole("progressbar")).toHaveLength(2);
    expect(
      quality.getByRole("progressbar", { name: "Structural Completeness score" }),
    ).toHaveAttribute("aria-valuenow", "82");
    expect(
      quality.getByRole("progressbar", { name: "Validity score" }),
    ).toHaveAttribute("aria-valuenow", "100");
    expect(
      within(articleByHeading("Uniqueness")).queryByRole("progressbar"),
    ).not.toBeInTheDocument();
  });

  it("keeps Quality finding evidence secondary but fully accessible", async () => {
    await renderResult();
    const finding = within(articleByHeading("Missing values"));
    expect(finding.getByText(/Affected field:/)).toHaveTextContent("email");
    expect(finding.getByText(/Detected · High confidence/)).toBeInTheDocument();
    const review = finding.getByText("Review finding details").closest("details")!;
    expect(review).not.toHaveAttribute("open");
    fireEvent.click(within(review).getByText("Review finding details"));
    expect(finding.getByText("Some values are missing.")).toBeInTheDocument();
    fireEvent.click(finding.getByText("Why this was flagged"));
    expect(finding.getByText("Q-1")).toBeInTheDocument();
  });

  it("preserves inferred candidate-identifier caution and technical evidence", async () => {
    const profilingFinding = {
      id: "pf1",
      assertion_level: "INFERRED" as const,
      severity: "INFO" as const,
      confidence: "HIGH" as const,
      category: "candidate_identifier",
      subject: "c1",
      title: "Structural candidate identifier inferred",
      description: "This is not a confirmed primary key or semantic identifier.",
      method: "candidate_identifier_v0_1",
      evidence_ids: ["pe1"],
    };
    const value: AnalysisResponse = {
      ...fixture,
      analysis: {
        ...fixture.analysis,
        profiling: {
          ...fixture.analysis.profiling,
          findings: [profilingFinding],
          evidence: [{
            id: "pe1",
            type: "metric",
            subject: "c1",
            rule_id: "candidate_identifier_v0_1",
            rule_version: "0.1",
            metric: "candidate_identifier_rule_match",
            observed_value: "name_signal_thresholds_v0_1",
          }],
        },
      },
    };
    await renderResult(value);
    const finding = within(articleByHeading("Structural candidate identifier inferred"));
    expect(finding.getByText(/Inferred · High confidence/)).toBeInTheDocument();
    fireEvent.click(finding.getByText("Review finding details"));
    expect(
      finding.getByText("This is not a confirmed primary key or semantic identifier."),
    ).toBeInTheDocument();
    const evidence = finding.getByText("Why this was flagged").closest("details")!;
    fireEvent.click(within(evidence).getByText("Why this was flagged"));
    expect(
      within(evidence).getByText("candidate_identifier_v0_1"),
    ).toBeInTheDocument();
  });
});

describe("Phase 9.2b visual density", () => {
  it("shows the canonical governance finding count above one collapsed disclosure", async () => {
    await renderResult();
    const section = within(sectionByHeading("Governance findings & evidence"));
    expect(section.getByText("1 traceability finding")).toBeInTheDocument();
    const disclosure = section.getByText("Review all findings").closest("details");
    expect(disclosure).not.toHaveAttribute("open");
  });

  it("keeps every canonical governance finding rendered without changing the count", async () => {
    const secondFinding = {
      ...fixture.analysis.governance.findings[0],
      id: "gf2",
      subject: "phone",
      title: "Potential phone field",
    };
    const value: AnalysisResponse = {
      ...fixture,
      analysis: {
        ...fixture.analysis,
        governance: {
          ...fixture.analysis.governance,
          findings: [...fixture.analysis.governance.findings, secondFinding],
        },
      },
    };
    await renderResult(value);
    const section = within(sectionByHeading("Governance findings & evidence"));
    expect(section.getByText("2 traceability findings")).toBeInTheDocument();
    const disclosure = section.getByText("Review all findings").closest("details")!;
    expect(within(disclosure).getAllByRole("article", { hidden: true })).toHaveLength(2);
    expect(within(disclosure).getByRole("heading", { name: "Potential contact field", hidden: true })).toBeInTheDocument();
    expect(within(disclosure).getByRole("heading", { name: "Potential phone field", hidden: true })).toBeInTheDocument();
  });

  it("opens collapsed governance findings when a recommendation source link is activated", async () => {
    await renderResult();
    const findings = within(sectionByHeading("Governance findings & evidence"));
    const disclosure = findings.getByText("Review all findings").closest("details")!;
    expect(disclosure).not.toHaveAttribute("open");
    fireEvent.click(
      within(articleByHeading("Review email handling")).getByRole("link", {
        name: "View source finding for email",
      }),
    );
    expect(disclosure).toHaveAttribute("open");
    expect(document.querySelector("#finding-gf1")).toBeInTheDocument();
  });

  it("keeps potential-personal-data as one primary fact with complete categories secondary", async () => {
    await renderResult();
    const summary = within(screen.getByLabelText("Governance summary"));
    const primaryLabel = summary.getByText("Potential personal data", { exact: true });
    expect(primaryLabel.closest("dl")).toHaveClass("governance-primary-summary");
    const breakdown = summary.getByText("Complete category counts").closest("details")!;
    expect(breakdown).not.toHaveAttribute("open");
    expect(within(breakdown).getByText("Potential Personal Data")).toBeInTheDocument();
    expect(within(breakdown).getByText("1")).toBeInTheDocument();
  });

  it("removes repeated applicable-score copy from primary dimension presentation", async () => {
    await renderResult();
    const quality = within(sectionByHeading("Quality"));
    expect(quality.queryByText("Score produced by the V0.1 rule.")).not.toBeInTheDocument();
    expect(quality.getByRole("heading", { name: "Structural Completeness" })).toBeInTheDocument();
    expect(quality.getByText("82 / 100")).toBeInTheDocument();
    expect(quality.getByRole("heading", { name: "Validity" })).toBeInTheDocument();
    expect(quality.getByText("100 / 100")).toBeInTheDocument();
  });
});

describe("Phase 9.3 column inventory", () => {
  it("renders every canonical classification beside its joined column", () => {
    const secondClassification = {
      ...fixture.analysis.governance.classifications[0],
      id: "gc2",
      category: "CONTACT_INFORMATION",
    };
    render(
      <ColumnInventory
        columns={fixture.analysis.profiling.columns}
        governanceClassifications={[
          ...fixture.analysis.governance.classifications,
          secondClassification,
        ]}
      />,
    );
    const classifications = within(rowByName("email")).getByLabelText(
      "Governance classifications for email",
    );
    expect(within(classifications).getByText("Potential Personal Data")).toBeInTheDocument();
    expect(within(classifications).getByText("Contact Information")).toBeInTheDocument();
    expect(within(rowByName("customer_id")).queryByLabelText(/Governance classifications/)).not.toBeInTheDocument();
  });

  it("filters by canonical classification and combines it with case-insensitive search", () => {
    render(
      <ColumnInventory
        columns={fixture.analysis.profiling.columns}
        governanceClassifications={fixture.analysis.governance.classifications}
      />,
    );
    expect(screen.getByText("2 of 2 columns")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Classification"), {
      target: { value: "POTENTIAL_PERSONAL_DATA" },
    });
    expect(screen.getByText("1 of 2 columns")).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "email" })).toBeInTheDocument();
    expect(screen.queryByRole("rowheader", { name: "customer_id" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Column name"), {
      target: { value: "CUSTOMER" },
    });
    expect(screen.getByText("0 of 2 columns")).toBeInTheDocument();
    expect(screen.getByText(/No columns match the current filters/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("2 of 2 columns")).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "customer_id" })).toBeInTheDocument();
  });

  it("preserves source column order and exposes accessible table semantics", () => {
    render(
      <ColumnInventory
        columns={fixture.analysis.profiling.columns}
        governanceClassifications={fixture.analysis.governance.classifications}
      />,
    );
    expect(screen.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
      "customer_id",
      "email",
    ]);
    expect(screen.getByText(/Structural column metrics joined with canonical Governance classifications/).tagName).toBe("CAPTION");
    for (const header of screen.getAllByRole("columnheader")) {
      expect(header).toHaveAttribute("scope", "col");
    }
    expect(screen.getByRole("rowheader", { name: "customer_id" })).toHaveAttribute("scope", "row");
    expect(screen.getByRole("region", { name: "Scrollable column inventory" })).toHaveAttribute("tabindex", "0");
  });

  it("discloses only allowlisted aggregate column details", () => {
    const column = {
      ...fixture.analysis.profiling.columns[0],
      candidate_identifier: {
        kind: "structural",
        reason: "identifier-like name",
        name_signal: true,
        completeness: 1,
        uniqueness: 1,
        thresholds: [["minimum_completeness", 0.98] as [string, number]],
        confirmed_key: false,
      },
      quality_signals: {
        primitive_type: "INTEGER",
        non_null_count: 3,
        invalid_count: 0,
        valid_non_null_count: 3,
        format_family_counts: [["integer", 3] as [string, number]],
        has_recognized_format_family: true,
      },
      duplicate_excess_positions: [99],
      raw_values: ["SECRET_RAW_VALUE"],
      samples: ["SECRET_SAMPLE"],
    };
    render(
      <ColumnInventory columns={[column]} governanceClassifications={[]} />,
    );
    const row = within(rowByName("customer_id"));
    const disclosure = row.getByLabelText("View details for customer_id");
    expect(disclosure.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(disclosure);
    expect(row.getByText("Zero-based position")).toBeInTheDocument();
    expect(row.getByText("Safe aggregate statistics")).toBeInTheDocument();
    expect(row.getByText("Candidate identifier evidence")).toBeInTheDocument();
    expect(row.getByText("Safe quality signals")).toBeInTheDocument();
    expect(row.queryByText("SECRET_RAW_VALUE")).not.toBeInTheDocument();
    expect(row.queryByText("SECRET_SAMPLE")).not.toBeInTheDocument();
    expect(row.queryByText("99")).not.toBeInTheDocument();
  });
});

describe("Phase 9.3 navigation and focus", () => {
  it("updates exactly one aria-current link from a controlled intersection", async () => {
    let callback: IntersectionObserverCallback | undefined;
    class MockIntersectionObserver {
      root = null;
      rootMargin = "";
      thresholds = [];
      constructor(next: IntersectionObserverCallback) {
        callback = next;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    await renderResult();
    const expected = [
      ["Overview", "#overview"],
      ["Quality", "#quality"],
      ["Governance", "#governance"],
      ["Recommendations", "#recommendations"],
      ["Columns", "#columns"],
    ];
    for (const [name, href] of expected) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    act(() => {
      const quality = document.getElementById("quality")!;
      const rect = quality.getBoundingClientRect();
      callback?.(
        [{
          boundingClientRect: rect,
          isIntersecting: true,
          intersectionRatio: 0.8,
          intersectionRect: rect,
          rootBounds: null,
          target: quality,
          time: 0,
        }],
        {} as IntersectionObserver,
      );
    });
    expect(screen.getByRole("link", { name: "Quality" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    expect(
      screen.getAllByRole("link").filter((link) => link.hasAttribute("aria-current")),
    ).toHaveLength(1);
  });

  it("renders the skip link only with results and retains unique landmarks and IDs", async () => {
    render(<Home />);
    expect(screen.queryByRole("link", { name: "Skip to analysis results" })).not.toBeInTheDocument();
    cleanup();
    await renderResult();
    expect(screen.getByRole("link", { name: "Skip to analysis results" })).toHaveAttribute(
      "href",
      "#analysis-results",
    );
    expect(document.querySelector("main#analysis-results")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const ids = [...document.querySelectorAll<HTMLElement>("[id]")].map(
      (element) => element.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("focuses request errors but leaves ordinary file validation focus in place", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    render(<Home />);
    choose();
    submit();
    await screen.findByText("We couldn't reach the analysis service.");
    expect(screen.getByRole("heading", { name: "Check this file" })).toHaveFocus();
    cleanup();
    vi.unstubAllGlobals();
    render(<Home />);
    const input = screen.getByLabelText(/choose a csv/i);
    input.focus();
    choose("invalid.pdf");
    expect(screen.getByText("Upload a CSV or XLSX file.")).toBeInTheDocument();
    expect(input).toHaveFocus();
  });
});

describe("Phase 9.4 synthetic demo", () => {
  it("renders a restrained secondary demo action on the upload state", () => {
    render(<Home />);
    const uploadAction = screen.getByText("Choose a CSV or XLSX file");
    const demoAction = screen.getByRole("button", { name: "Try the sample dataset" });
    const analyzeAction = screen.getByRole("button", { name: "Analyze dataset" });
    expect(uploadAction).toHaveClass("button");
    expect(demoAction).toHaveClass("button", "secondary");
    expect(analyzeAction).toHaveClass("button", "primary");
    expect(screen.getByLabelText("Analysis characteristics")).toBeInTheDocument();
  });

  it("loads the bundled asset and submits its File through the normal API request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(demoAsset())
      .mockResolvedValueOnce(success(demoResponse));
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Try the sample dataset" }));
    expect(await screen.findByText("Analysis complete")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/demo/customer-operations-sample.xlsx",
      { cache: "force-cache" },
    );
    const calls = fetchMock.mock.calls as unknown as Array<
      [RequestInfo | URL, RequestInit | undefined]
    >;
    expect(calls[1][0]).toBe("http://localhost:8000/api/v1/analyze");
    const request = calls[1][1];
    expect(request?.method).toBe("POST");
    const uploaded = (request?.body as FormData).get("file") as File;
    expect(uploaded).toBeInstanceOf(File);
    expect(uploaded.name).toBe("customer-operations-sample.xlsx");
    const uploadedContent = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(uploaded);
    });
    expect(uploadedContent).toEqual(
      new Uint8Array([80, 75, 3, 4]).buffer,
    );
  });

  it("renders normal result sections plus a truthful synthetic label", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(demoAsset()).mockResolvedValueOnce(success(demoResponse)),
    );
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Try the sample dataset" }));
    expect(await screen.findByRole("heading", {
      name: "customer-operations-sample.xlsx",
    })).toBeInTheDocument();
    expect(screen.getByText("Synthetic sample dataset")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze another dataset" })).toBeInTheDocument();
    for (const name of ["Quality", "Governance", "Recommendations", "Column inventory"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
  });

  it("never labels a normal upload as the synthetic sample", async () => {
    await renderResult();
    expect(screen.queryByText("Synthetic sample dataset")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready to analyze your own file?")).not.toBeInTheDocument();
  });

  it("resets a demo result to the upload and demo entry points", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(demoAsset()).mockResolvedValueOnce(success(demoResponse)),
    );
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Try the sample dataset" }));
    await screen.findByText("Synthetic sample dataset");
    fireEvent.click(screen.getByRole("button", { name: "Analyze another dataset" }));
    expect(screen.getByRole("button", { name: "Try the sample dataset" })).toBeInTheDocument();
    expect(screen.getByText("Choose a CSV or XLSX file")).toBeInTheDocument();
    expect(screen.queryByText("Synthetic sample dataset")).not.toBeInTheDocument();
  });

  it("uses the safe focused error path when the demo asset cannot load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("SECRET_ASSET_URL")));
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Try the sample dataset" }));
    expect(
      await screen.findByText(
        "The synthetic sample could not be loaded. Try again or choose your own dataset.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("SECRET_ASSET_URL")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Check this file" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Try the sample dataset" })).toBeEnabled();
  });

  it("uses the existing safe API error after the demo asset loads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(demoAsset()).mockRejectedValueOnce(new Error("SECRET_API_URL")),
    );
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Try the sample dataset" }));
    expect(await screen.findByText("We couldn't reach the analysis service.")).toBeInTheDocument();
    expect(screen.queryByText("SECRET_API_URL")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Check this file" })).toHaveFocus();
  });

  it("keeps the generated fixture explicitly synthetic and reviewable", () => {
    const generator = readFileSync(
      "scripts/generate_synthetic_demo.py",
      "utf8",
    );
    const asset = readFileSync(
      "public/demo/customer-operations-sample.xlsx",
    );
    expect(asset.subarray(0, 4)).toEqual(Buffer.from([80, 75, 3, 4]));
    expect(generator).toContain("SYN-CUST-");
    expect(generator).toContain("Synthetic Customer");
    expect(generator).toContain("@example.test");
    expect(generator).toContain("synthetic-phone-");
    expect(generator).not.toMatch(/@(gmail|outlook|yahoo)\./i);
    expect(generator).not.toContain("classifications");
    expect(generator).not.toContain("overall_score");
  });
});


describe("untrusted response rendering", () => {
  it("renders an HTML-like API filename as inert text", async () => {
    const hostileName = '<img src="x" onerror="globalThis.__DGC_XSS__=true">.csv';
    const value = {
      ...fixture,
      metadata: {
        ...fixture.metadata,
        source_filename: hostileName,
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(success(value)));
    render(<Home />);
    choose(hostileName);
    submit();

    expect(
      await screen.findByRole("heading", { name: hostileName, level: 1 }),
    ).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect((globalThis as typeof globalThis & { __DGC_XSS__?: boolean }).__DGC_XSS__).toBeUndefined();
  });
});
