import { marked } from "marked"
import { debounce } from "throttle-debounce"

const $input = document.getElementById("input") as HTMLTextAreaElement
const $output = document.getElementById("output") as HTMLTextAreaElement
const $copy = document.getElementById("copy") as HTMLButtonElement

const markedOptions = {
  breaks: true,
  headerIds: false,
  xhtml: true,
}

$input.addEventListener(
  "input",
  debounce(500, () => {
    const input = $input.value
    const output = marked.parse(input, markedOptions)

    $output.value = output
  }),
)

$copy.addEventListener("click", () => {
  $output.select()
  document.execCommand("copy")
})
