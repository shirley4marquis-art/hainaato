import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const wasmDirectory = fileURLToPath(
  new URL("../node_modules/@next/swc-wasm-nodejs", import.meta.url),
);
const nextCli = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const command = process.argv[2] ?? "dev";
const args = process.argv.slice(3);

const child = spawn(process.execPath, [nextCli, command, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_TEST_WASM_DIR: wasmDirectory,
  },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
