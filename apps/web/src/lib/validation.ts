export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export function validateFile(file: File | null): string | null {
  if (!file) return "no_file";
  if (!file.size) return "empty_file";
  if (!/\.(csv|xlsx)$/i.test(file.name)) return "unsupported_format";
  if (file.size > MAX_FILE_BYTES) return "file_too_large_client";
  return null;
}
