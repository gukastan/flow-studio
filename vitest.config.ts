import { defineConfig } from "vitest/config";

// Let jsdom provide browser storage instead of Node's optional file-backed storage.
const execArgv = process.allowedNodeEnvironmentFlags.has("--no-experimental-webstorage")
  ? ["--no-experimental-webstorage"]
  : [];

export default defineConfig({
  test: {
    environment: "jsdom",
    poolOptions: { forks: { execArgv }, threads: { execArgv } },
  },
});
