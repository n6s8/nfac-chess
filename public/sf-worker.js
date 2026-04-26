/*
 * sf-worker.js — Stockfish Web Worker bridge.
 *
 * We load stockfish-single.js via importScripts WITHOUT the #...,worker hash.
 * This allows the auto-bootstrap code inside stockfish.js to detect
 * the Worker context (onmessage exists, no window) and initialize
 * the engine correctly, setting up:
 *   - onmessage handler to receive UCI commands from main thread
 *   - postMessage to send UCI output back to main thread
 *
 * The #...,worker hash is reserved for NESTED workers (multi-threading).
 * Using it from the main thread tricks the guard into skipping bootstrap.
 */
importScripts('/stockfish-single.js');
