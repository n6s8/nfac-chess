#!/usr/bin/env node
/**
 * Copies the Stockfish runtime from node_modules into public/ so Vite
 * can serve it as a Web Worker.
 */
import { access, copyFile, mkdir } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const CANDIDATES = [
  {
    js: 'node_modules/stockfish/src/stockfish-nnue-16-single.js',
    wasm: 'node_modules/stockfish/src/stockfish-nnue-16-single.wasm',
  },
  {
    js: 'node_modules/stockfish/src/stockfish-nnue-16-no-simd.js',
    wasm: 'node_modules/stockfish/src/stockfish-nnue-16-no-simd.wasm',
  },
  {
    js: 'node_modules/stockfish/src/stockfish-nnue-16.js',
    wasm: 'node_modules/stockfish/src/stockfish-nnue-16.wasm',
  },
]

async function run() {
  await mkdir(resolve(root, 'public'), { recursive: true })

  for (const { js, wasm } of CANDIDATES) {
    const srcJs = resolve(root, js)
    const srcWasm = resolve(root, wasm)

    try {
      await access(srcJs)
      await copyFile(srcJs, resolve(root, 'public/stockfish.js'))
      console.log(`JS copied: ${js} -> public/stockfish.js`)

      try {
        await access(srcWasm)
        await copyFile(srcWasm, resolve(root, 'public/stockfish.wasm'))
        await copyFile(srcWasm, resolve(root, `public/${basename(srcWasm)}`))
        console.log(`WASM copied: ${wasm} -> public/stockfish.wasm`)
        console.log(`WASM copied: ${wasm} -> public/${basename(srcWasm)}`)
      } catch {
        console.warn('(No matching .wasm found - pure JS engine will be used)')
      }

      return
    } catch {
      // Try the next runtime candidate.
    }
  }

  console.warn(
    'Could not find stockfish files in node_modules.\n' +
      'Run: npm install then npm run setup:stockfish\n\n' +
      'The engine will not work until public/stockfish.js exists.'
  )
  process.exit(1)
}

run()
