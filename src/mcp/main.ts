import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { EchoFixtureAdapter } from "../adapters/echoFixtureAdapter.ts";
import { createMcpAdmissionChainServer } from "./admissionChainSurface.ts";

async function main(): Promise<void> {
  const server = createMcpAdmissionChainServer({
    adapter: new EchoFixtureAdapter(),
    headId: "head:main"
  });

  await server.connect(new StdioServerTransport());
}

try {
  await main();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
