import { marked } from "marked"
import { debounce } from "throttle-debounce"

const $input = document.getElementById("input") as HTMLTextAreaElement
const $output = document.getElementById("output") as HTMLTextAreaElement
const $copy = document.getElementById("copy") as HTMLButtonElement

marked.use({ breaks: true })

$input.addEventListener(
  "input",
  debounce(500, () => {
    const input = $input.value
    const output = marked.parse(input) as string

    $output.value = output
  }),
)

$copy.addEventListener("click", () => {
  $output.select()
  document.execCommand("copy")
})
