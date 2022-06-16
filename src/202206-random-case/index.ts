const $input = document.getElementById("input") as HTMLInputElement
const $output = document.getElementById("output") as HTMLInputElement
const $convert = document.getElementById("convert") as HTMLButtonElement
const $copy = document.getElementById("copy") as HTMLButtonElement

const changeCaseRandomly = (char: string) =>
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

export {} // tscにmoduleとして処理してもらうため
