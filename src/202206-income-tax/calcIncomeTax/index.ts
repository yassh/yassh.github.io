// ☞ https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm

const table = [
  {
    rangeFrom: 1_000,
    rangeTo: 1_949_000,
    rate: 0.05,
    deduction: 0,
  },
  {
    rangeFrom: 1_950_000,
    rangeTo: 3_299_000,
    rate: 0.1,
    deduction: 97_500,
  },
  {
    rangeFrom: 3_300_000,
    rangeTo: 6_949_000,
    rate: 0.2,
    deduction: 427_500,
  },
  {
    rangeFrom: 6_950_000,
    rangeTo: 8_999_000,
    rate: 0.23,
    deduction: 636_000,
  },
  {
    rangeFrom: 9_000_000,
    rangeTo: 17_999_000,
    rate: 0.33,
    deduction: 1_536_000,
  },
  {
    rangeFrom: 18_000_000,
    rangeTo: 39_999_000,
    rate: 0.4,
    deduction: 2_796_000,
  },
  {
    rangeFrom: 40_000_000,
    rangeTo: Infinity,
    rate: 0.45,
    deduction: 4_796_000,
  },
]

/**
 * 所得税の計算をする関数
 */
export const calcIncomeTax = (income: number): number => {
  const roundedIncome = Math.floor(income / 1000) * 1000

  for (const row of table) {
    if (row.rangeFrom <= roundedIncome && roundedIncome <= row.rangeTo) {
      return roundedIncome * row.rate - row.deduction
    }
  }

  return 0
}
