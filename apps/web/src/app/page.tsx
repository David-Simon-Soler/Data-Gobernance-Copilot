"use client";

import { useState } from "react";
import { ResultsView } from "../components/results/ResultsView";
import { UploadPanel } from "../components/upload/UploadPanel";
import { analyzeDataset } from "../lib/api";
import { loadDemoFile } from "../lib/demo";
import { validateFile } from "../lib/validation";
import type { AnalysisResponse } from "../types/api";

type State = "IDLE" | "FILE_SELECTED" | "SUBMITTING" | "SUCCESS" | "ERROR";

export default function Home() {
  const [state, setState] = useState<State>("IDLE");
  const [file, setFile] = useState<File | null>(null);
  const [response, setResponse] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSyntheticDemo, setIsSyntheticDemo] = useState(false);
  const [focusError, setFocusError] = useState(false);

  const select = (next: File | null) => {
    const message = validateFile(next);
    setFile(message ? null : next);
    setResponse(null);
    setError(message);
    setIsSyntheticDemo(false);
    setFocusError(false);
    setState(message ? "ERROR" : next ? "FILE_SELECTED" : "IDLE");
  };

  const runAnalysis = async (nextFile: File, syntheticDemo: boolean) => {
    setFile(nextFile);
    setIsSyntheticDemo(syntheticDemo);
    setState("SUBMITTING");
    setError(null);
    setFocusError(false);
    try {
      setResponse(await analyzeDataset(nextFile));
      setState("SUCCESS");
    } catch (requestError) {
      setError((requestError as { code?: string }).code || "internal_error");
      setFocusError(true);
      setState("ERROR");
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || state === "SUBMITTING") return;
    void runAnalysis(file, isSyntheticDemo);
  };

  const tryDemo = async () => {
    if (state === "SUBMITTING") return;
    setFile(null);
    setResponse(null);
    setError(null);
    setIsSyntheticDemo(false);
    setFocusError(false);
    setState("SUBMITTING");
    try {
      await runAnalysis(await loadDemoFile(), true);
    } catch {
      setError("demo_asset_unavailable");
      setFocusError(true);
      setState("ERROR");
    }
  };

  const reset = () => {
    setFile(null);
    setResponse(null);
    setError(null);
    setIsSyntheticDemo(false);
    setFocusError(false);
    setState("IDLE");
  };

  if (state === "SUCCESS" && response) {
    return (
      <ResultsView
        response={response}
        isSyntheticDemo={isSyntheticDemo}
        onReset={reset}
      />
    );
  }

  return (
    <>
      <header className="global-header">
        <div className="global-header-inner" role="group" aria-label="Product identity">
          <strong>Data Governance Copilot</strong>
          <span>v0.1</span>
        </div>
      </header>
      <main className="shell entry-shell">
        <section className="entry-content" aria-labelledby="entry-title">
          <header className="entry-copy">
            <p className="eyebrow">Evidence-first dataset assessment</p>
            <h1 id="entry-title">
              Understand the quality and governance signals in your dataset.
            </h1>
            <p className="lede">
              Deterministic profiling, quality assessment and governance
              classification signals backed by traceable evidence.
            </p>
          </header>
          <UploadPanel
            file={file}
            error={error}
            focusError={focusError}
            submitting={state === "SUBMITTING"}
            onSelect={select}
            onSubmit={submit}
            onTryDemo={() => void tryDemo()}
          />
        </section>
      </main>
    </>
  );
}
