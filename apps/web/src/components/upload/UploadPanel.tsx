"use client";

import { useEffect, useRef } from "react";
import { size } from "../../lib/format";
import { validateFile } from "../../lib/validation";

const API_ERROR_MESSAGES: Record<string, string> = {
  network_error: "We couldn't reach the analysis service.",
  request_too_large: "The upload request is too large. Choose a smaller file.",
  invalid_request: "The upload request was invalid. Choose the file again.",
  sheet_not_applicable: "Sheet selection is only available for XLSX files.",
  file_too_large: "This file exceeds the 5 MiB limit.",
  unsupported_format: "Upload a CSV or XLSX file.",
  empty_dataset: "The dataset contains no analyzable rows.",
  malformed_dataset: "The uploaded dataset could not be processed.",
  dataset_limit: "The dataset exceeds a supported structural limit.",
  dataset_limit_exceeded: "The dataset exceeds a supported structural limit.",
  sheet_not_found: "The default workbook sheet could not be read.",
  demo_asset_unavailable:
    "The synthetic sample could not be loaded. Try again or choose your own dataset.",
  internal_error: "The analysis service returned a safe error.",
};

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
  const input = useRef<HTMLInputElement>(null);
  const errorHeading = useRef<HTMLHeadingElement>(null);
  const message =
    error && (focusError || !validateFile(file))
      ? API_ERROR_MESSAGES[error] || "The analysis service returned a safe error."
      : error;

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
        <p className="eyebrow">Analyze a dataset</p>
        <h2 id="upload-title">Choose your source file</h2>
        <p>CSV or XLSX · maximum file size 5 MiB</p>
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
        <label htmlFor="file" className="button">Choose a CSV or XLSX file</label>
        <p>Drag and drop here, or use the file picker.</p>
        <span id="file-support" className="muted">
          CSV and XLSX · maximum 5 MiB · no account required
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
              Replace
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => onSelect(null)}
              disabled={submitting}
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="error" role="alert">
          <h3 ref={errorHeading} tabIndex={-1}>Check this file</h3>
          <p>{message}</p>
          <button type="button" className="text-button" onClick={() => input.current?.click()}>
            Replace file
          </button>
        </div>
      ) : null}

      <div className="processing-note">
        <strong>Processing boundaries</strong>
        <ul>
          <li>
            V0.1 processes the dataset for the current analysis request and does
            not persist uploaded datasets.
          </li>
          <li>Raw rows are not returned in the analysis response.</li>
          <li>
            Automated classifications require human review and are not a legal
            or compliance determination.
          </li>
        </ul>
      </div>

      <button className="button primary" disabled={!file || submitting}>
        {submitting ? "Analyzing dataset…" : "Analyze dataset"}
      </button>
      {submitting ? (
        <p className="submit-status" role="status" aria-live="polite">
          Analyzing dataset…
        </p>
      ) : null}

      <section className="demo-entry" aria-labelledby="demo-title">
        <div>
          <p className="eyebrow">Synthetic sample · XLSX · Customer operations</p>
          <h3 id="demo-title">Try the product with synthetic data</h3>
          <p>
            Run the bundled customer-operations sample through the same
            deterministic analysis used for uploaded CSV and XLSX files.
          </p>
        </div>
        <button
          type="button"
          className="button secondary demo-button"
          onClick={onTryDemo}
          disabled={submitting}
        >
          Try the sample dataset
        </button>
      </section>
    </form>
  );
}
