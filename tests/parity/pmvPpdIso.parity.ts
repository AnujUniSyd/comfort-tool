import { expect, test } from "@playwright/test";
import { trackerFor } from "./divergences";
import fixture from "./fixtures/a1-pmv-ppd-iso/pmv-ppd-iso.json" with { type: "json" };
import { enterValues, field, resultValue } from "./resultTable";

const PAGE = "/standard/iso-7730/pmv-ppd-iso";
const PMV = "Predicted Mean Vote";
const PPD = "Predicted Percentage of Dissatisfied";

// Entered values in SI, before the app applies relative air speed or clothing
// corrections. Labels are the public UI contract; no application imports.
function enteredValues(inputs: (typeof fixture.cases)[number]["inputs"]) {
  return [
    ["Dry-bulb air temperature", inputs.tdb],
    ["Mean radiant temperature", inputs.tr],
    ["Air speed", inputs.v],
    ["Relative humidity", inputs.rh],
    ["Metabolic rate", inputs.met],
    ["Clothing insulation", inputs.clo],
  ] as const;
}

test("ISO reference preserves the original 14 finite PMV/PPD cases", () => {
  expect(fixture.commit).toBe("e809c965dd6eb2e785bf4851de2149c7a1d3c299");
  expect(fixture.source).toBe("CenterForTheBuiltEnvironment/comfort_tool static/js/comfort-models.js comf.pmvEN");
  expect(fixture.cases).toHaveLength(14);
  for (const { inputs, pmv, ppd } of fixture.cases) {
    for (const value of [...Object.values(inputs), pmv, ppd]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  }
});

test("ISO defaults and all reference cases agree or have a listed divergence", async ({ page }, testInfo) => {
  await page.goto(PAGE);
  await expect(page.getByRole("columnheader", { name: PMV, exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: PPD, exact: true })).toBeVisible();

  // Keep the original default-case check, now through the visible fields.
  for (const [label, value] of enteredValues(fixture.cases[0].inputs)) {
    await expect(field(page, label), `SI default for ${label}`).toHaveValue(String(value));
  }

  // A single test owns the complete grid. No state is shared between tests
  // or workers, and the stale-entry assertion only follows a complete run.
  const tracker = trackerFor(PAGE);
  const observations: { case: number; inputs: (typeof fixture.cases)[number]["inputs"]; subject: string; app: number; deployed: number }[] = [];
  try {
    for (const [index, { inputs, pmv, ppd }] of fixture.cases.entries()) {
      await test.step(`ISO-${String(index + 1).padStart(2, "0")} ${JSON.stringify(inputs)}`, async () => {
        await enterValues(page, enteredValues(inputs));
        for (const [label, value] of enteredValues(inputs)) {
          await expect(field(page, label)).toHaveValue(String(value));
          await expect(field(page, label)).not.toHaveAttribute("aria-invalid", "true");
        }
        // An invalid entry may leave the previous result visible: refuse it.
        await expect(page.getByRole("alert").filter({ hasText: /not calculated/i })).toHaveCount(0);
        for (const [subject, deployed] of [[PMV, pmv], [PPD, ppd]] as const) {
          const app = await resultValue(page, subject);
          expect(Number.isFinite(app), `${subject} must be finite`).toBe(true);
          observations.push({ case: index + 1, inputs, subject, app, deployed });
          tracker.check({ subject, aspect: "value", inputs, app, deployed });
        }
      });
    }
    // Two displayed decimals, no widened numerical epsilon. Decision 54 is
    // maintained in known-divergences.json, never written by this test.
    tracker.assertListedStillHold();
  } finally {
    await testInfo.attach("iso-parity-observations", {
      body: JSON.stringify(observations, null, 2),
      contentType: "application/json",
    });
  }
});
