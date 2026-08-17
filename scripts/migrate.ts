import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnvironment() {
  try {
    const source = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // CI and production migration jobs inject credentials directly.
  }
}

async function main() {
  loadLocalEnvironment();
  const { ensureSchema } = await import("../lib/db");
  await ensureSchema();
  console.log("Database schema is current.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
