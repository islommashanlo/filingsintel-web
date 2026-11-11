import { describe, expect, it } from "vitest";
import { date, initials, money, moneyFull, percentDelta, price, quarter, relative, roleLabel, shares, tone } from "./format";

describe("money", () => {
  it("abbreviates with one decimal", () => {
    expect(money("1234567.89")).toBe("$1.2M");
    expect(money(845000)).toBe("$845K");
    expect(money("3900000000")).toBe("$3.9B");
    expect(money(2000000)).toBe("$2M");
    expect(money(950)).toBe("$950");
  });
  it("uses a true minus sign and optional plus", () => {
    expect(money(-3500000)).toBe("−$3.5M");
    expect(money(648000000, { signed: true })).toBe("+$648M");
  });
  it("never turns a missing value into zero", () => {
    expect(money(null)).toBe("—");
    expect(money("")).toBe("—");
    expect(money("0")).toBe("$0");
  });
  it("keeps the exact value for tooltips", () => {
    expect(moneyFull("1234567.89")).toBe("$1,234,567.89");
  });
});

describe("shares and price", () => {
  it("adds thousands separators and keeps fractions", () => {
    expect(shares("1500000")).toBe("1,500,000");
    expect(shares("12.5")).toBe("12.5");
    expect(shares(-200, { signed: true })).toBe("−200");
    expect(shares(200, { signed: true })).toBe("+200");
  });
  it("formats prices to at least two decimals", () => {
    expect(price("12.5")).toBe("$12.50");
    expect(price(null)).toBe("—");
  });
});

describe("percentDelta and tone", () => {
  it("is always signed, to one decimal", () => {
    expect(percentDelta(12.44)).toBe("+12.4%");
    expect(percentDelta(-3.14)).toBe("−3.1%");
    expect(percentDelta(0)).toBe("0.0%");
  });
  it("maps sign to semantic tone", () => {
    expect(tone("5")).toBe("up");
    expect(tone(-1)).toBe("dn");
    expect(tone(null)).toBe("");
  });
});

describe("dates", () => {
  it("shows timestamps in US Eastern time", () => {
    // 02:30 UTC on Oct 3 is still Oct 2 in New York.
    expect(date("2026-10-03T02:30:00Z")).toBe("Oct 2, 2026");
  });
  it("keeps date-only values on their calendar day", () => {
    expect(date("2026-09-30")).toBe("Sep 30, 2026");
  });
  it("formats relative times", () => {
    const now = new Date("2026-10-02T12:00:00Z");
    expect(relative("2026-10-02T10:00:00Z", now)).toBe("2h ago");
    expect(relative("2026-10-02T11:58:00Z", now)).toBe("2m ago");
    expect(relative("2026-09-30T12:00:00Z", now)).toBe("2d ago");
    expect(relative("2026-09-01T12:00:00Z", now)).toBe("Sep 1, 2026");
  });
  it("labels quarters", () => {
    expect(quarter("2026-09-30")).toBe("Q3 2026");
    expect(quarter("2026-12-31")).toBe("Q4 2026");
  });
});

describe("labels", () => {
  it("builds initials", () => {
    expect(initials("Northgate Capital Partners")).toBe("NC");
    expect(initials(null)).toBe("?");
  });
  it("describes reported roles", () => {
    expect(
      roleLabel({ is_director: true, is_officer: true, is_ten_percent_owner: false, is_other: false, officer_title: "CFO" }),
    ).toBe("CFO, Director");
    expect(
      roleLabel({ is_director: false, is_officer: false, is_ten_percent_owner: true, is_other: false, officer_title: null }),
    ).toBe("10% owner");
  });
});
