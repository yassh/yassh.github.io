const $input = document.getElementById("input")
const $output = document.getElementById("output")
const $convert = document.getElementById("convert")
const $copy = document.getElementById("copy")

const changeCaseRandomly = (char) =>
  Math.random() < 0.5 ? char.toLowerCase() : char.toUpperCase()

const convert = () => {
  const output = [...$input.value]
    .map((char) => changeCaseRandomly(char))
    .join("")
  $output.value = output
}

$input.addEventListener("input", () => {
  convert()
})

$convert.addEventListener("click", () => {
  convert()
})

$copy.addEventListener("click", () => {
  $output.select()
  document.execCommand("copy")
})
