import { join } from "node:path";
import { expect, test } from "@playwright/test";

const fixtures = join(__dirname, "fixtures");
const validCsv = join(fixtures, "customer-summary.csv");
const unsupportedFile = join(fixtures, "unsupported.txt");

test("landing loads the V0.1 upload and demo entry points", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Understand the quality and governance signals in your dataset.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Choose a CSV or XLSX file")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try the sample dataset" }),
  ).toBeEnabled();
});

test("synthetic demo crosses the real pipeline and preserves traceability", async ({
  page,
}) => {
  await page.goto("/");

  const analysisResponse = page.waitForResponse(
    (response) =>
      response.url() === "http://127.0.0.1:8000/api/v1/analyze" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Try the sample dataset" }).click();
  expect((await analysisResponse).status()).toBe(200);

  await expect(
    page.getByRole("heading", { name: "customer-operations-sample.xlsx" }),
  ).toBeVisible();
  await expect(page.getByText("Synthetic sample dataset")).toBeVisible();
  await expect(page.getByText("50 rows", { exact: true })).toBeVisible();
  await expect(page.getByText("13 columns", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Sheet: Customer Operations", { exact: true }),
  ).toBeVisible();

  const quality = page.getByRole("group", {
    name: "Overall structural quality",
  });
  await expect(quality).toContainText("99");
  await expect(quality).toContainText("/ 100");

  const review = page.getByRole("group", { name: "Review summary" });
  await expect(review.getByText("2", { exact: true })).toBeVisible();
  await expect(review.getByText("19", { exact: true })).toBeVisible();
  await expect(review.getByText("8", { exact: true })).toBeVisible();

  const navigation = page.getByRole("navigation", { name: "Result sections" });
  for (const name of [
    "Overview",
    "Quality",
    "Governance",
    "Recommendations",
    "Columns",
  ]) {
    await expect(
      navigation.getByRole("link", { name, exact: true }),
    ).toBeVisible();
  }
  for (const name of [
    "Quality",
    "Governance",
    "Recommendations",
    "Column inventory",
  ]) {
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByText("19 traceability findings", { exact: true }),
  ).toBeVisible();

  const disclosure = page.locator("details").filter({
    has: page.getByText("Review all findings", { exact: true }),
  });
  await expect(disclosure).not.toHaveAttribute("open", "");

  const recommendationTraceability = page
    .locator("details.recommendation-traceability")
    .filter({
      has: page.locator(
        'a[href="#finding-F-GOV-col:2-POTENTIAL_PERSONAL_DATA"]',
      ),
    });
  await recommendationTraceability
    .getByText("Evidence & sources", { exact: true })
    .click();
  const sourceLink = recommendationTraceability.getByRole("link", {
    name: "View source finding for email",
    exact: true,
  });
  await expect(sourceLink).toHaveAttribute(
    "href",
    "#finding-F-GOV-col:2-POTENTIAL_PERSONAL_DATA",
  );
  await sourceLink.click();

  await expect(disclosure).toHaveAttribute("open", "");
  await expect(page).toHaveURL(
    /#finding-F-GOV-col:2-POTENTIAL_PERSONAL_DATA$/,
  );
  const sourceFinding = page.locator(
    '[id="finding-F-GOV-col:2-POTENTIAL_PERSONAL_DATA"]',
  );
  await expect(sourceFinding).toBeVisible();
  await expect(
    sourceFinding.getByRole("heading", {
      name: "Inferred potential personal data",
    }),
  ).toBeVisible();
  await expect(sourceFinding.getByText(/Affected field:/)).toContainText(
    "email",
  );
  await expect(sourceFinding).toBeInViewport();

  await expect
    .poll(async () => {
      const targetBox = await sourceFinding.boundingBox();
      const navigationBox = await navigation.boundingBox();
      if (!targetBox || !navigationBox) return false;
      return targetBox.y >= navigationBox.y + navigationBox.height - 1;
    })
    .toBe(true);

  await navigation.getByRole("link", { name: "Columns", exact: true }).click();
  await page.getByRole("combobox", { name: "Classification", exact: true }).selectOption({
    label: "Potential Personal Data",
  });
  await expect(page.getByText("4 of 13 columns", { exact: true })).toBeVisible();

  const table = page.getByRole("table");
  for (const name of ["customer_id", "email", "phone", "customer_age"]) {
    await expect(
      table.getByRole("rowheader", { name, exact: true }),
    ).toBeVisible();
  }
  await expect(
    table.getByRole("rowheader", { name: "region", exact: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("13 of 13 columns", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Analyze another dataset" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose your source file" }),
  ).toBeVisible();
  await expect(page.getByText("Synthetic sample dataset")).toHaveCount(0);
  await expect(page.getByText("Analysis complete")).toHaveCount(0);
});

test("unsupported file is rejected safely before an API request", async ({
  page,
}) => {
  const analysisRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/v1/analyze")) {
      analysisRequests.push(request.url());
    }
  });

  await page.goto("/");
  await page
    .getByLabel("Choose a CSV or XLSX file")
    .setInputFiles(unsupportedFile);

  const alert = page.getByRole("alert").filter({
    has: page.getByRole("heading", { name: "Check this file" }),
  });
  await expect(alert).toContainText("Upload a CSV or XLSX file.");
  await expect(page.getByText("Analysis complete")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Analyze dataset" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Try the sample dataset" }),
  ).toBeEnabled();
  await expect(alert).not.toContainText("/api/v1/analyze");
  await expect(alert).not.toContainText(unsupportedFile);
  expect(analysisRequests).toHaveLength(0);
});

test("real network outage produces a safe recoverable service error", async ({
  context,
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Choose a CSV or XLSX file").setInputFiles(validCsv);
  await context.setOffline(true);
  try {
    await page.getByRole("button", { name: "Analyze dataset" }).click();
    const alert = page.getByRole("alert").filter({
    has: page.getByRole("heading", { name: "Check this file" }),
  });
    await expect(alert).toContainText(
      "We couldn't reach the analysis service.",
    );
    await expect(alert).not.toContainText("127.0.0.1:8000");
    await expect(alert).not.toContainText("TypeError");
    await expect(page.getByText("Analysis complete")).toHaveCount(0);
  } finally {
    await context.setOffline(false);
  }

  await expect(
    page.getByRole("button", { name: "Analyze dataset" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Try the sample dataset" }),
  ).toBeEnabled();
});

test("normal CSV upload succeeds through the native input and real API", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Choose a CSV or XLSX file").setInputFiles(validCsv);

  const analysisResponse = page.waitForResponse(
    (response) =>
      response.url() === "http://127.0.0.1:8000/api/v1/analyze" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Analyze dataset" }).click();
  expect((await analysisResponse).status()).toBe(200);

  await expect(
    page.getByRole("heading", { name: "customer-summary.csv" }),
  ).toBeVisible();
  await expect(page.getByText("3 rows", { exact: true })).toBeVisible();
  await expect(page.getByText("3 columns", { exact: true })).toBeVisible();
  await expect(page.getByText("Synthetic sample dataset")).toHaveCount(0);
});
