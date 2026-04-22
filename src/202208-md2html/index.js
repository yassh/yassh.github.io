import { marked } from "https://esm.sh/marked@18.0.2"
import { debounce } from "https://esm.sh/throttle-debounce@5.0.2"

const $input = document.getElementById("input")
const $output = document.getElementById("output")
const $copy = document.getElementById("copy")

marked.use({ breaks: true })

$input.addEventListener(
  "input",
  debounce(500, () => {
    const input = $input.value
    const output = marked.parse(input)

    $output.value = output
  }),
)

$copy.addEventListener("click", () => {
  $output.select()
  document.execCommand("copy")
})
