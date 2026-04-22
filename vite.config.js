import { globSync } from "node:fs"
import { resolve } from "node:path"
import { defineConfig } from "vite"

const entries = Object.fromEntries(
  globSync("src/**/index.html").map((file) => {
    const dir = file.slice("src/".length, -"/index.html".length)
    return [dir || "index", resolve(file)]
  }),
)

export default defineConfig({
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: entries,
    },
  },
})
