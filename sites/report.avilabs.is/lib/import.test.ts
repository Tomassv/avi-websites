import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNumber } from "./parse-number.ts";
import { monthDate, toAirlineRow, toKpiRows, toMonthlyRows, totals } from "./import.ts";

test("parseNumber reads the formats found in the old JSON", () => {
  const cases: [string, number, boolean][] = [
    ["2516", 2516, false],
    ["4.95", 4.95, false],
    ["5615.58  ", 5615.58, false],
    ["2,047.50", 2047.5, false],
    ["27.602,76", 27602.76, false],
    ["73.741,62", 73741.62, false],
    ["171 495,2", 171495.2, false],
    ["50 000", 50000, false],
    ["10 000", 10000, false],
    ["21,44", 21.44, false],
    ["1,030", 1030, true],
    ["1,234,567", 1234567, false],
    ["", 0, false],
    ["-12.5", -12.5, false],
  ];
  for (const [input, value, ambiguous] of cases) {
    const parsed = parseNumber(input);
    assert.equal(parsed.value, value, input);
    assert.equal(parsed.ambiguous, ambiguous, input);
  }
  assert.equal(parseNumber(null).value, 0);
  assert.equal(parseNumber(3).value, 3);
});

test("parseNumber rejects text", () => {
  for (const input of ["N/A", "1e5", "$100", "-", "12abc"]) {
    assert.throws(() => parseNumber(input), Error, input);
  }
});

test("monthDate", () => {
  assert.equal(monthDate("2023", "August"), "2023-08-01");
  assert.equal(monthDate("2026", "December"), "2026-12-01");
  assert.throws(() => monthDate("2023", "Aug"));
  assert.throws(() => monthDate("23", "August"));
});

test("toAirlineRow keeps sections as strings and normalizes CRLF", () => {
  const row = toAirlineRow("play", {
    main_info: { name: "Play", sso: "Y" },
    commercial_info: { price_per_credit: "4.95" },
    integration_info: {},
    feature_info: { hotels: "Testing", issue_types: null },
    snapshot: "a\r\nb",
  }, 3);
  assert.equal(row.name, "Play");
  assert.equal(row.sort, 3);
  assert.equal(row.snapshot, "a\nb");
  assert.deepEqual(row.feature_info, { hotels: "Testing", issue_types: "" });
  assert.throws(() => toAirlineRow("x", { main_info: {}, commercial_info: {}, integration_info: {}, feature_info: {} }, 0));
  assert.throws(() => toAirlineRow("x", { main_info: { name: "X" } }, 0));
});

test("toMonthlyRows converts values and reports what the old pages got wrong", () => {
  const { rows, corrections } = toMonthlyRows("marabu", {
    "2025": {
      June: { credits_used: "10", credits_added: "50 000", revenue: "10 000", twilio: "5615.58  ", hotels: "0" },
      May: { credits_used: "1", credits_added: "0", revenue: "2,047.50", twilio: "21,44", hotels: "" },
    },
  });
  assert.deepEqual(rows.map((r) => r.month), ["2025-05-01", "2025-06-01"]);
  assert.deepEqual(rows[1], {
    airline_id: "marabu", month: "2025-06-01",
    credits_used: 10, credits_added: 50000, revenue: 10000, twilio: 5615.58, hotels: 0,
  });
  const byField = Object.fromEntries(corrections.map((c) => [`${c.month} ${c.field}`, c]));
  assert.equal(byField["2025-06-01 revenue"].oldPageValue, 10);
  assert.equal(byField["2025-06-01 credits_added"].oldPageValue, 50);
  assert.equal(byField["2025-05-01 revenue"].oldPageValue, 2);
  assert.equal(byField["2025-05-01 twilio"].oldPageValue, 21);
  assert.equal(byField["2025-06-01 twilio"], undefined, "trailing spaces only are not a correction");
  assert.deepEqual(totals(rows), { credits_used: 11, credits_added: 50000, revenue: 12047.5 });
});

test("toMonthlyRows rejects fractional credits", () => {
  assert.throws(() => toMonthlyRows("x", {
    "2025": { May: { credits_used: "1.5", credits_added: "0", revenue: "0", twilio: "0", hotels: "0" } },
  }));
});

test("toKpiRows flattens year/month/airline", () => {
  const rows = toKpiRows({
    monthlyData: { "2024": { February: { play: { coreMetrics: { a: 1 }, financialMetrics: { NRR: 2 } } } } },
  });
  assert.deepEqual(rows, [{
    airline_id: "play", month: "2024-02-01",
    core: { a: 1 }, financial: { NRR: 2 }, product: {}, customer_success: {},
  }]);
});
