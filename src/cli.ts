import { EchoFixtureAdapter } from "./adapters/echoFixtureAdapter.ts";

type Command = "demo" | "hello" | "catalog" | "frame" | "step";

function printSection(label: string, value: unknown): void {
  console.log(`\n## ${label}`);
  console.log(JSON.stringify(value, null, 2));
}

function parseCommand(argv: string[]): Command {
  const command = argv[2] as Command | undefined;

  if (!command) {
    return "demo";
  }

  if (command === "demo" || command === "hello" || command === "catalog" || command === "frame" || command === "step") {
    return command;
  }

  throw new Error(`Unsupported command: ${command}`);
}

function main(): void {
  const adapter = new EchoFixtureAdapter();
  const command = parseCommand(process.argv);
  const headId = "head:main";

  if (command === "hello") {
    printSection("HostHello", adapter.hello());
    return;
  }

  if (command === "catalog") {
    printSection("LaneCatalog", adapter.laneCatalog());
    return;
  }

  if (command === "frame") {
    printSection("PlaybackHeadSnapshot", adapter.playbackHead(headId));
    printSection("PlaybackFrame", adapter.frame(headId));
    printSection("ReceiptSummary[]", adapter.receipts(headId));
    return;
  }

  if (command === "step") {
    printSection("Before", adapter.playbackHead(headId));
    printSection("NextFrame", adapter.stepForward(headId));
    printSection("After", adapter.playbackHead(headId));
    printSection("ReceiptSummary[]", adapter.receipts(headId));
    return;
  }

  printSection("HostHello", adapter.hello());
  printSection("LaneCatalog", adapter.laneCatalog());
  printSection("PlaybackHeadSnapshot", adapter.playbackHead(headId));
  printSection("PlaybackFrame", adapter.frame(headId));
  printSection("ReceiptSummary[]", adapter.receipts(headId));
  printSection("StepForward", adapter.stepForward(headId));
  printSection("PlaybackHeadSnapshot (after step)", adapter.playbackHead(headId));
  printSection("PlaybackFrame (after step)", adapter.frame(headId));
  printSection("ReceiptSummary[] (after step)", adapter.receipts(headId));
}

main();
