import LZString from "lz-string"
import { debounce } from "throttle-debounce"

{
  const $input = document.getElementById(
    "compress-input",
  ) as HTMLTextAreaElement
  const $output = document.getElementById(
    "compress-output",
  ) as HTMLTextAreaElement

  $input.addEventListener(
    "input",
    debounce(500, () => {
      const input = $input.value
      const output = LZString.compressToEncodedURIComponent(input)

      $output.value = output
    }),
  )
}

{
  const $input = document.getElementById(
    "decompress-input",
  ) as HTMLTextAreaElement
  const $output = document.getElementById(
    "decompress-output",
  ) as HTMLTextAreaElement

  $input.addEventListener(
    "input",
    debounce(500, () => {
      const input = $input.value
      const output = LZString.decompressFromEncodedURIComponent(input)

      $output.value = output ?? ""
    }),
  )
}
