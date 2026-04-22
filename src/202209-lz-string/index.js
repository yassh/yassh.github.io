import LZString from "https://esm.sh/lz-string@1.5.0"
import { debounce } from "https://esm.sh/throttle-debounce@5.0.2"

{
  const $input = document.getElementById("compress-input")
  const $output = document.getElementById("compress-output")

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
  const $input = document.getElementById("decompress-input")
  const $output = document.getElementById("decompress-output")

  $input.addEventListener(
    "input",
    debounce(500, () => {
      const input = $input.value
      const output = LZString.decompressFromEncodedURIComponent(input)

      $output.value = output ?? ""
    }),
  )
}
