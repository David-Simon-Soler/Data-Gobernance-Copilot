export const DEMO_ASSET_URL = "/demo/customer-operations-sample.xlsx";
export const DEMO_FILENAME = "customer-operations-sample.xlsx";

const XLSX_MEDIA_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function loadDemoFile(): Promise<File> {
  const response = await fetch(DEMO_ASSET_URL, { cache: "force-cache" });
  if (!response.ok) throw new Error("demo_asset_unavailable");

  const content = await response.arrayBuffer();
  if (!content.byteLength) throw new Error("demo_asset_unavailable");

  return new File([content], DEMO_FILENAME, { type: XLSX_MEDIA_TYPE });
}
