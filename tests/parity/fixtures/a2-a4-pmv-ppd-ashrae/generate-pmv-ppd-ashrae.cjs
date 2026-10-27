#!/usr/bin/env node
"use strict";

/**
 * Regenerate from committed legacy CBE bytes, never from the rewrite.
 * Usage (from the comfort-tool repository root):
 *   node tests/parity/fixtures/a2-a4-pmv-ppd-ashrae/generate-pmv-ppd-ashrae.cjs ../comfort_tool
 * The legacy clone must contain COMMIT; its checked-out branch is irrelevant.
 *
 * Inputs are SI values as entered: deg C, m/s, percent RH, met and clo.
 * comf.pmvElevatedAirspeed applies relative air speed and, above 1.2 met,
 * dynamic clothing INTERNALLY. Do not pre-correct them a second time.
 * Normal parity tests read the JSON offline and never invoke this script.
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const COMMIT = "e809c965dd6eb2e785bf4851de2149c7a1d3c299";
const MODEL_FILE = "static/js/comfort-models.js";

// Original 12 supplied input sets, plus two cases with met=1 (so the
// relative speed really remains <=0.1) and a second elevated-speed case.
// A2 follows the issue's entered-v criterion; above 1 met the relative
// speed may exceed 0.1 even when entered air speed does not.
const CASES = [
  {
    "id": "A2-01",
    "row": "A2",
    "inputs": {
      "tdb": 25,
      "tr": 25,
      "v": 0.1,
      "rh": 50,
      "met": 1.1,
      "clo": 0.5
    }
  },
  {
    "id": "A2-02",
    "row": "A2",
    "inputs": {
      "tdb": 20,
      "tr": 20,
      "v": 0.1,
      "rh": 50,
      "met": 1.1,
      "clo": 0.5
    }
  },
  {
    "id": "A2-03",
    "row": "A2",
    "inputs": {
      "tdb": 28,
      "tr": 28,
      "v": 0.1,
      "rh": 50,
      "met": 1.1,
      "clo": 0.5
    }
  },
  {
    "id": "A2-04",
    "row": "A2",
    "inputs": {
      "tdb": 25,
      "tr": 25,
      "v": 0.1,
      "rh": 20,
      "met": 1.1,
      "clo": 0.5
    }
  },
  {
    "id": "A2-05",
    "row": "A2",
    "inputs": {
      "tdb": 25,
      "tr": 25,
      "v": 0.1,
      "rh": 80,
      "met": 1.1,
      "clo": 0.5
    }
  },
  {
    "id": "A2-06",
    "row": "A2",
    "inputs": {
      "tdb": 25,
      "tr": 30,
      "v": 0.1,
      "rh": 50,
      "met": 1.1,
      "clo": 0.5
    }
  },
  {
    "id": "A2-07",
    "row": "A2",
    "inputs": {
      "tdb": 25,
      "tr": 20,
      "v": 0.1,
      "rh": 50,
      "met": 1.1,
      "clo": 0.5
    }
  },
  {
    "id": "A2-08",
    "row": "A2",
    "inputs": {
      "tdb": 21,
      "tr": 21,
      "v": 0.1,
      "rh": 40,
      "met": 1.1,
      "clo": 1.5
    }
  },
  {
    "id": "A4-01",
    "row": "A4",
    "inputs": {
      "tdb": 23,
      "tr": 23,
      "v": 0.15,
      "rh": 50,
      "met": 1.6,
      "clo": 0.7
    }
  },
  {
    "id": "A4-02",
    "row": "A4",
    "inputs": {
      "tdb": 22,
      "tr": 22,
      "v": 0.1,
      "rh": 50,
      "met": 2,
      "clo": 0.7
    }
  },
  {
    "id": "A3-01",
    "row": "A3",
    "inputs": {
      "tdb": 29,
      "tr": 29,
      "v": 0.8,
      "rh": 55,
      "met": 1.1,
      "clo": 0.8
    }
  },
  {
    "id": "A2-09",
    "row": "A2",
    "inputs": {
      "tdb": 26,
      "tr": 26,
      "v": 0,
      "rh": 50,
      "met": 1.1,
      "clo": 0.5
    }
  },
  {
    "id": "A2-10",
    "row": "A2",
    "inputs": {
      "tdb": 25,
      "tr": 25,
      "v": 0.1,
      "rh": 50,
      "met": 1,
      "clo": 0.5
    }
  },
  {
    "id": "A2-11",
    "row": "A2",
    "inputs": {
      "tdb": 26,
      "tr": 26,
      "v": 0,
      "rh": 50,
      "met": 1,
      "clo": 0.5
    }
  },
  {
    "id": "A3-02",
    "row": "A3",
    "inputs": {
      "tdb": 27,
      "tr": 27,
      "v": 0.4,
      "rh": 50,
      "met": 1.1,
      "clo": 0.8
    }
  }
];

function main() {
  const repo = process.argv[2];
  if (!repo) {
    throw new Error("usage: node generate-pmv-ppd-ashrae.cjs <legacy comfort_tool clone>");
  }
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "cbe-ashrae-reference-"));
  try {
    for (const file of ["comfort-models.js", "psychrometrics.js", "util.js"]) {
      fs.writeFileSync(path.join(temporary, file), execFileSync("git", ["-C", repo, "show", `${COMMIT}:static/js/${file}`]));
    }
    const { comf } = require(path.join(temporary, "comfort-models.js"));
    comf.useSelfGeneratedAirSpeed = true;
    const fixture = {
      source: `CenterForTheBuiltEnvironment/comfort_tool ${MODEL_FILE} comf.pmvElevatedAirspeed`,
      commit: COMMIT,
      generatedBy: "tests/parity/fixtures/a2-a4-pmv-ppd-ashrae/generate-pmv-ppd-ashrae.cjs",
      settings: { units: "SI", wme: 0, activityGeneratedAirSpeed: true, occupantAirSpeedControl: false },
      note: "Entered v and clo. The pinned reference applies activity-generated relative air speed and dynamic clothing above 1.2 met internally. A2 uses entered v <= 0.1; the two met=1 cases also keep relative speed <= 0.1.",
      cases: CASES.map(({ id, row, inputs }) => {
        const result = comf.pmvElevatedAirspeed(inputs.tdb, inputs.tr, inputs.v, inputs.rh, inputs.met, inputs.clo, 0);
        if (![result.pmv, result.ppd].every(Number.isFinite)) {
          throw new Error(`Non-finite legacy output at ${id}`);
        }
        return { id, row, inputs, pmv: result.pmv, ppd: result.ppd };
      }),
    };
    const out = path.join(__dirname, "pmv-ppd-ashrae.json");
    fs.writeFileSync(out, JSON.stringify(fixture, null, 2) + "\n");
    console.log(`wrote ${fixture.cases.length} cases to ${out}`);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
main();
