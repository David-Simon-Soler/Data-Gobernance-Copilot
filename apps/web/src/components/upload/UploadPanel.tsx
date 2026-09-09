"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "../../i18n/LanguageProvider";
import { apiErrorText } from "../../i18n/translations";
import { size } from "../../lib/format";

interface UploadPanelProps {
  file: File | null;
  error: string | null;
  focusError: boolean;
  submitting: boolean;
  onSelect: (file: File | null) => void;
  onSubmit: (event: React.FormEvent) => void;
  onTryDemo: () => void;
}

export function UploadPanel({
  file,
  error,
  focusError,
  submitting,
  onSelect,
  onSubmit,
  onTryDemo,
}: UploadPanelProps) {
  const { locale, messages } = useLanguage();
  const input = useRef<HTMLInputElement>(null);
  const errorHeading = useRef<HTMLHeadingElement>(null);
  const message = error ? apiErrorText(error, locale) : null;

  useEffect(() => {
    if (focusError && message) errorHeading.current?.focus();
  }, [focusError, message]);

  return (
    <form
      onSubmit={onSubmit}
      className="upload-form"
      aria-busy={submitting}
      aria-labelledby="upload-title"
    >
      <div className="upload-heading">
        <h2 id="upload-title">{messages.chooseSource}</h2>
        <p>{messages.uploadIntro}</p>
      </div>

      <div
        className="dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onSelect(event.dataTransfer.files[0] || null);
        }}
      >
        <input
          ref={input}
          id="file"
          type="file"
          accept=".csv,.xlsx"
          aria-describedby="file-support"
          onChange={(event) => onSelect(event.target.files?.[0] || null)}
          disabled={submitting}
        />
        <p className="dropzone-title">{messages.dropFile}</p>
        <p>{messages.or}</p>
        <label htmlFor="file" className="button file-picker">{messages.chooseFile}</label>
        <span id="file-support" className="muted">
          {messages.fileSupport}
        </span>
      </div>

      {file ? (
        <div className="file-card">
          <div className="file-details">
            <strong title={file.name}>{file.name}</strong>
            <span>{file.name.split(".").pop()?.toUpperCase()} · {size(file.size)}</span>
          </div>
          <div className="file-actions">
            <button
              type="button"
              className="text-button"
              onClick={() => input.current?.click()}
              disabled={submitting}
            >
              {messages.replace}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => onSelect(null)}
              disabled={submitting}
            >
              {messages.remove}
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="error" role="alert">
          <h3 ref={errorHeading} tabIndex={-1}>{messages.checkFile}</h3>
          <p>{message}</p>
          <button type="button" className="text-button" onClick={() => input.current?.click()}>
            {messages.replaceFile}
          </button>
        </div>
      ) : null}

      <div className="upload-actions">
        <button className="button primary" disabled={!file || submitting}>
          {submitting ? messages.analyzingDataset : messages.analyzeDataset}
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={onTryDemo}
          disabled={submitting}
        >
          {messages.trySample}
        </button>
      </div>

      {submitting ? (
        <p className="submit-status" role="status" aria-live="polite">
          {messages.analyzingDataset}
        </p>
      ) : null}

      <p className="trust-line" aria-label={messages.analysisCharacteristics}>
        <span>{messages.deterministicRules}</span>
        <span>{messages.evidenceBacked}</span>
        <span>{messages.statelessAnalysis}</span>
      </p>

      <details className="processing-note">
        <summary>{messages.processingPrivacy}</summary>
        <div>
          <ul>
            <li>
              {messages.privacyRequest}
            </li>
            <li>{messages.privacyRows}</li>
            <li>
              {messages.privacyReview}
            </li>
          </ul>
        </div>
      </details>
    </form>
  );
}
