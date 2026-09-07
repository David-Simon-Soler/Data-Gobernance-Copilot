export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export function validateFile(file: File | null): string | null {
  if (!file) return "Choose a file to continue.";
  if (!file.size) return "The selected file is empty.";
  if (!/\.(csv|xlsx)$/i.test(file.name)) return "Upload a CSV or XLSX file.";
  if (file.size > MAX_FILE_BYTES) return "Files must be 5 MiB or smaller.";
  return null;
}
