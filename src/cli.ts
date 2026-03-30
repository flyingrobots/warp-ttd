import { EchoFixtureAdapter } from "./adapters/echoFixtureAdapter.ts";

type Command = "demo" | "hello" | "catalog" | "frame" | "step";

const VALID_COMMANDS = new Set<Command>(["demo", "hello", "catalog", "frame", "step"]);

function printSection(label: string, value: unknown): void {
  console.log(`\n## ${label}`);
  console.log(JSON.stringify(value, null, 2));
}

function parseCommand(argv: string[]): Command {
  const command = argv[2];

  if (!command) {
    return "demo";
  }

  if (VALID_COMMANDS.has(command as Command)) {
    return command as Command;
  }

  throw new Error(`Unsupported command: ${command}`);
}

async function main(): Promise<void> {
  const adapter = new EchoFixtureAdapter();
  const command = parseCommand(process.argv);
  const headId = "head:main";

  if (command === "hello") {
    printSection("HostHello", await adapter.hello());
    return;
  }

  if (command === "catalog") {
    printSection("LaneCatalog", await adapter.laneCatalog());
    return;
  }

  if (command === "frame") {
    printSection("PlaybackHeadSnapshot", await adapter.playbackHead(headId));
    printSection("PlaybackFrame", await adapter.frame(headId));
    printSection("ReceiptSummary[]", await adapter.receipts(headId));
    return;
  }

  if (command === "step") {
    printSection("Before", await adapter.playbackHead(headId));
    printSection("NextFrame", await adapter.stepForward(headId));
    printSection("After", await adapter.playbackHead(headId));
    printSection("ReceiptSummary[]", await adapter.receipts(headId));
    return;
  }

  printSection("HostHello", await adapter.hello());
  printSection("LaneCatalog", await adapter.laneCatalog());
  printSection("PlaybackHeadSnapshot", await adapter.playbackHead(headId));
  printSection("PlaybackFrame", await adapter.frame(headId));
  printSection("ReceiptSummary[]", await adapter.receipts(headId));
  printSection("StepForward", await adapter.stepForward(headId));
  printSection("PlaybackHeadSnapshot (after step)", await adapter.playbackHead(headId));
  printSection("PlaybackFrame (after step)", await adapter.frame(headId));
  printSection("ReceiptSummary[] (after step)", await adapter.receipts(headId));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
