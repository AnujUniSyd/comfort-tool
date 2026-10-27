import { expect, test } from "@playwright/test";
import { trackerFor } from "./divergences";
import fixture from "./fixtures/a2-a4-pmv-ppd-ashrae/pmv-ppd-ashrae.json" with { type: "json" };
import { enterValues, field, resultValue } from "./resultTable";

const PAGE = "/standard/ashrae-55/pmv-ppd-ashrae";
const PMV = "Predicted Mean Vote";
const PPD = "Predicted Percentage of Dissatisfied";
type Inputs = (typeof fixture.cases)[number]["inputs"];

function enteredValues(inputs: Inputs) {
  return [
    ["Dry-bulb air temperature", inputs.tdb],
    ["Mean radiant temperature", inputs.tr],
    ["Air speed", inputs.v],
    ["Relative humidity", inputs.rh],
    ["Metabolic rate", inputs.met],
    ["Clothing insulation", inputs.clo],
  ] as const;
}

test("ASHRAE fixture records its source, settings and finite A2–A4 cases", () => {
  expect(fixture.commit).toBe("e809c965dd6eb2e785bf4851de2149c7a1d3c299");
  expect(fixture.source).toBe("CenterForTheBuiltEnvironment/comfort_tool static/js/comfort-models.js comf.pmvElevatedAirspeed");
  expect(fixture.settings).toEqual({ units: "SI", wme: 0, activityGeneratedAirSpeed: true, occupantAirSpeedControl: false });
  expect(fixture.cases).toHaveLength(15);
  expect(new Set(fixture.cases.map(({ id }) => id)).size).toBe(fixture.cases.length);
  expect([...new Set(fixture.cases.map(({ row }) => row))].sort()).toEqual(["A2", "A3", "A4"]);
  for (const { inputs, pmv, ppd } of fixture.cases) {
    expect(Object.keys(inputs).sort()).toEqual(["tdb", "tr", "v", "rh", "met", "clo"].sort());
    for (const value of [...Object.values(inputs), pmv, ppd]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  }
});

test("ASHRAE defaults and A2–A4 PMV/PPD agree or have a listed divergence", async ({ page }, testInfo) => {
  await page.goto(PAGE);
  await expect(page.getByRole("columnheader", { name: PMV, exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: PPD, exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Occupants control the air speed", exact: true })).not.toBeChecked();
  for (const [label, value] of enteredValues(fixture.cases[0].inputs)) {
    await expect(field(page, label), `SI default for ${label}`).toHaveValue(String(value));
  }

  const tracker = trackerFor(PAGE);
  const observations: { id: string; row: string; inputs: Inputs; subject: string; app: number; deployed: number }[] = [];
  try {
    // One tracker sees the complete grid. Soft assertions retain every
    // unlisted numerical difference while still failing the test overall.
    for (const { id, row, inputs, pmv, ppd } of fixture.cases) {
      await test.step(`${id} ${JSON.stringify(inputs)}`, async () => {
        await enterValues(page, enteredValues(inputs));
        for (const [label, value] of enteredValues(inputs)) {
          await expect(field(page, label)).toHaveValue(String(value));
          await expect(field(page, label)).not.toHaveAttribute("aria-invalid", "true");
        }
        await expect(page.getByRole("alert").filter({ hasText: /not calculated/i })).toHaveCount(0);
        for (const [subject, deployed] of [[PMV, pmv], [PPD, ppd]] as const) {
          const app = await resultValue(page, subject);
          expect(Number.isFinite(app), `${id} ${subject} must be finite`).toBe(true);
          observations.push({ id, row, inputs, subject, app, deployed });
          expect.soft(() => tracker.check({ subject, aspect: "value", inputs, app, deployed }), `${id} ${subject}`).not.toThrow();
        }
      });
    }
    tracker.assertListedStillHold();
  } finally {
    await testInfo.attach("ashrae-parity-observations", {
      body: JSON.stringify(observations, null, 2),
      contentType: "application/json",
    });
  }
});
