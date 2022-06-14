import { calcIncomeTax } from "./calcIncomeTax"

const $income = document.getElementById("income") as HTMLInputElement
const $incomeTax = document.getElementById("incomeTax") as HTMLSpanElement

$income.addEventListener("input", (event) => {
  const income = Number(
    (event.target as HTMLInputElement).value.replaceAll(",", ""),
  )
  const incomeTax = calcIncomeTax(income)
  $incomeTax.textContent = incomeTax.toLocaleString()
})
