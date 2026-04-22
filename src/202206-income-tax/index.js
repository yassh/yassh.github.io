import { calcIncomeTax } from "./calcIncomeTax/index.js"

const $income = document.getElementById("income")
const $incomeTax = document.getElementById("incomeTax")

$income.addEventListener("input", (event) => {
  const income = Number(event.target.value.replaceAll(",", ""))
  const incomeTax = calcIncomeTax(income)
  $incomeTax.textContent = incomeTax.toLocaleString()
})
