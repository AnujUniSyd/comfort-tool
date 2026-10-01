import { describe, expect, it } from "vitest";
import { humidityMode, temperatureMode } from "./entryModes";
import { DEFAULT_ATMOSPHERIC_PRESSURE, quantities } from "./quantities";

describe("temperatureMode", () => {
  it("declares exactly the separate and operative entry modes", () => {
    expect(Object.keys(temperatureMode).sort()).toEqual(["operative", "separate"]);
  });

  it("gives every mode a unique persisted id", () => {
    const ids = Object.values(temperatureMode).map((mode) => mode.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("maps separate entry to dry-bulb and mean-radiant temperature", () => {
    expect(temperatureMode.separate.panel).toEqual([quantities.tdb, quantities.tr]);
    expect(temperatureMode.separate.axis).toBe(quantities.tdb);
  });

  it("maps operative entry to operative temperature", () => {
    expect(temperatureMode.operative.panel).toEqual([quantities.operative_tmp]);
    expect(temperatureMode.operative.axis).toBe(quantities.operative_tmp);
  });
});

describe("humidityMode", () => {
  it("declares exactly the supported humidity entry modes", () => {
    expect(Object.keys(humidityMode).sort()).toEqual(["dewPoint", "humidityRatio", "rh", "vapourPressure", "wetBulb"]);
  });

  it("gives every mode a unique persisted id", () => {
    const ids = Object.values(humidityMode).map((mode) => mode.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("assigns a different entered quantity to every mode", () => {
    const enteredQuantities = Object.values(humidityMode).map((mode) => mode.quantity);
    expect(new Set(enteredQuantities).size).toBe(enteredQuantities.length);
  });

  it("names the library quantity each mode enters", () => {
    expect(humidityMode.rh.quantity).toBe(quantities.rh);
    expect(humidityMode.humidityRatio.quantity).toBe(quantities.hr);
    expect(humidityMode.dewPoint.quantity).toBe(quantities.dew_point_tmp);
    expect(humidityMode.wetBulb.quantity).toBe(quantities.wet_bulb_tmp);
    expect(humidityMode.vapourPressure.quantity).toBe(quantities.pa);
  });

  it("enters humidity ratio in the library's kg/kg at full precision", () => {
    expect(humidityMode.humidityRatio.fromRelativeHumidity(50, 25, DEFAULT_ATMOSPHERIC_PRESSURE)).toBeCloseTo(0.0098815475775, 13);
  });

  it("is the identity in rh mode", () => {
    expect(humidityMode.rh.toRelativeHumidity(50, 25, DEFAULT_ATMOSPHERIC_PRESSURE)).toBe(50);
    expect(humidityMode.rh.fromRelativeHumidity(50, 25, DEFAULT_ATMOSPHERIC_PRESSURE)).toBe(50);
  });
});
