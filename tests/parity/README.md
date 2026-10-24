# Parity tests

This directory checks one thing: where what the app shows differs from the deployed CBE Thermal Comfort Tool. That covers its results and, as the page states them, its inputs' defaults, ranges and handling of an out-of-range entry. It lives only on the `test-suite` branch.

Whether the code meets the project's own requirements is checked by the tests on `rewrite/v1`, which the maintainer writes. Those are not in scope here.

## Branches

- Branch from `test-suite`, and open your PR against `test-suite`.
- The maintainer merges `rewrite/v1` into `test-suite` in batches: about once a week, and after a change that moves results or page structure. Each sync is announced in [the acceptance issue](https://github.com/FedericoTartarini/comfort-tool/issues/30), with the `rewrite/v1` commit, the tests it turned red and the entries of `known-divergences.json` it added or removed. To pick it up, merge `test-suite` into your branch. Do not rebase a branch someone else has pulled.
- `test-suite` is never merged into `rewrite/v1`.
- Add files under `tests/parity/` only. Do not edit any other file, `package.json` and the root `playwright.config.ts` included. Then a sync from `rewrite/v1` never conflicts with your work.

## Black-box only

`rewrite/v1` changes daily, and its internal functions change shape with it. A test that imports them breaks on every refactor. So a parity test drives the app in a browser, as a person would, and nothing else.

- Use Playwright only. Do not import anything from `src/` or from `jsthermalcomfort`.
- Open a page by its address, for example `/standard/ashrae-55/pmv-ppd-ashrae`. Copy the address from the app's navigation; do not derive it from the source.
- Enter values through the labelled fields, and read results from the result table, by role and accessible name (`getByRole`, `getByLabel`). Do not select by CSS class or `data-*` attribute: those change with the design.
- Do not write share links by hand. Their format may change until the app is deployed, and a link an earlier build wrote may be refused.
- Compare at the precision the app shows: two decimals in SI.

## Reference values

- The deployed tool's values come from a fixture file checked in here. The fixture records the source file and the commit of the deployed tool's repository it was produced from.
- The script that produced the fixture is checked in next to it, so anyone can regenerate the fixture and get the same file.
- A test never fetches the deployed tool at run time.

## Known divergences

Some differences are deliberate. For example, ADR-0002 decision 54 has the PMV (ISO 7730) page correct the clothing insulation at every metabolic rate, which the deployed tool does not.

- `tests/parity/known-divergences.json` lists each deliberate difference. An entry names:
  - `page`: the page's address.
  - `subjects`: what differs, by the names the page shows: result rows by the result table's names, inputs by their field labels.
  - `aspect`: which side of them differs: `"value"` for a result, or `"default"`, `"range"` or `"out-of-range"` for an input.
  - `cases`: `"all"`, or a list of inputs in the fixture's form.
  - `decision`: the ADR decision that explains the difference.
  - `reason`: the explanation in a sentence or two.
- A test fails on a difference that file does not list.
- The list is strict: a test also fails on an entry that no longer holds, that is, when none of the cases it covers differs any more. The app has changed to agree with the deployed tool, and the entry has to go.
- Only the maintainer adds or removes an entry, because an entry records a decision. If you find a difference that is not listed, report it in your PR and in [the acceptance issue](https://github.com/FedericoTartarini/comfort-tool/issues/30), with the inputs and both values.

## Running

```bash
npx playwright test -c tests/parity/playwright.config.ts
npm run check
npm run lint
```

`tests/parity/playwright.config.ts` is this directory's own config; it starts the dev server as the root config does. `npm run check` and `npm run lint` cover `tests/**/*.ts`, so these files are type-checked and linted too. All three pass before a PR is opened.

## When a test fails after a sync

- **A new difference:** the app changed what it computes. Report it; the maintainer decides whether the app changes or the difference is listed.
- **An entry that no longer holds:** the app now agrees with the deployed tool. The maintainer removes the entry and marks the row fixed in [the acceptance issue](https://github.com/FedericoTartarini/comfort-tool/issues/30).
- **A test that no longer finds its field or row:** the page changed. Fix the locator in a PR.

## A PR

- One model per PR.
- It includes the fixture and the script that produced it.
- It passes the three commands above on the current `test-suite`.
