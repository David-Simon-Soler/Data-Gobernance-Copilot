import type { AnalysisResponse, ApiError } from "../types/api";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

function getApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

  return configured.replace(/\/+$/, "");
}

function createApiError(
  message: string,
  code: string,
  status?: number): ApiError {
  const error = new Error(message) as ApiError;
  error.code = code;
  error.status = status;
  return error;
}

export async function analyzeDataset(
  file: File,
): Promise<AnalysisResponse> {
  const form = new FormData();
  form.append("file", file);

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}/api/v1/analyze`, {
      method: "POST",
      body: form,
      cache: "no-store",
    });
  } catch {
    throw createApiError(
      "We couldn't reach the analysis service.",
      "network_error",
    );
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    let code = "internal_error";

    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      body.error &&
      typeof body.error === "object" &&
      "code" in body.error &&
      typeof body.error.code === "string"
    ) {
      code = body.error.code;
    }

    throw createApiError(
      "The dataset could not be analyzed.",
      code,
      response.status,
    );
  }

  return body as AnalysisResponse;
}
