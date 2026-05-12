/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");

const { execFileSync } = require("child_process");

const PRISMA_CLI_ENTRY = require.resolve("prisma/build/index.js");

function ensureEnvVar(name) {
  if (!process.env[name]) {
    process.env[name] = "mysql://dummy:dummy@localhost:3306/dummy";
    console.log(`No ${name} found, using dummy URL for client generation`);
  }
}

console.log("Generating Prisma client...");

try {
  ensureEnvVar("DATABASE_URL");

  execFileSync(process.execPath, [PRISMA_CLI_ENTRY, "generate"], {
    stdio: "inherit",
    env: process.env,
  });

  console.log("Prisma client generated successfully");
} catch (error) {
  console.error("Failed to generate Prisma client:", error.message);
  console.error("Run `npm run prisma:generate` after restoring outbound access to Prisma binaries.");
  process.exit(1);
}
