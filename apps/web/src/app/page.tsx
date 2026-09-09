"use client";

import { useState } from "react";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ResultsView } from "../components/results/ResultsView";
import { UploadPanel } from "../components/upload/UploadPanel";
import { LanguageProvider, useLanguage } from "../i18n/LanguageProvider";
import { analyzeDataset } from "../lib/api";
import { loadDemoFile } from "../lib/demo";
import { validateFile } from "../lib/validation";
import type { AnalysisResponse } from "../types/api";

type State = "IDLE" | "FILE_SELECTED" | "SUBMITTING" | "SUCCESS" | "ERROR";

function HomeContent() {
  const { messages } = useLanguage();
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
        <div className="global-header-inner" role="group" aria-label={messages.productIdentity}>
          <strong>Data Governance Copilot</strong>
          <div className="global-header-actions">
            <span>v0.1</span>
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main className="shell entry-shell">
        <section className="entry-content" aria-labelledby="entry-title">
          <header className="entry-copy">
            <p className="eyebrow">{messages.landingEyebrow}</p>
            <h1 id="entry-title">{messages.landingTitle}</h1>
            <p className="lede">{messages.landingLede}</p>
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

export default function Home() {
  return (
    <LanguageProvider>
      <HomeContent />
    </LanguageProvider>
  );
}
