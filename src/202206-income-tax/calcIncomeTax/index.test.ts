import { calcIncomeTax } from "."

describe("calcIncomeTax", () => {
  test.each([
    // 境界値
    { income: 0, incomeTax: 0 },
    { income: 999, incomeTax: 0 },
    { income: 1_000, incomeTax: 50 },
    { income: 1_949_999, incomeTax: 97_450 },
    { income: 1_950_000, incomeTax: 97_500 },
    { income: 3_299_999, incomeTax: 232_400 },
    { income: 3_300_000, incomeTax: 232_500 },
    { income: 6_949_999, incomeTax: 962_300 },
    { income: 6_950_000, incomeTax: 962_500 },
    { income: 8_999_999, incomeTax: 1_433_770 },
    { income: 9_000_000, incomeTax: 1_434_000 },
    { income: 17_999_999, incomeTax: 4_403_670 },
    { income: 18_000_000, incomeTax: 4_404_000 },
    { income: 39_999_999, incomeTax: 13_203_600 },
    { income: 40_000_000, incomeTax: 13_204_000 },

    // 適当な値
    { income: 100, incomeTax: 0 },
    { income: 777_777, incomeTax: 38_850 },
    { income: 1_234_567, incomeTax: 61_700 },
    { income: 9_876_543, incomeTax: 1_723_080 },
    { income: 50_000_000, incomeTax: 17_704_000 },
    { income: 100_000_000, incomeTax: 40_204_000 },
  ])("calcIncomeTax($income) => $incomeTax", ({ income, incomeTax }) => {
    expect(calcIncomeTax(income)).toBe(incomeTax)
  })
})
