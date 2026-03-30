import { EchoFixtureAdapter } from "./adapters/echoFixtureAdapter.ts";

type Command = "demo" | "hello" | "catalog" | "frame" | "step";

const VALID_COMMANDS = new Set<Command>(["demo", "hello", "catalog", "frame", "step"]);

function isValidCommand(cmd: string): cmd is Command {
  return (VALID_COMMANDS as Set<string>).has(cmd);
}

function parseArgs(argv: string[]): { command: Command; json: boolean } {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const positional = args.filter((a) => a !== "--json");
  const command = positional[0];

  if (command === undefined) {
    return { command: "demo", json };
  }

  if (isValidCommand(command)) {
    return { command, json };
  }

  throw new Error(`Unsupported command: ${command}`);
}

function printSection(label: string, value: unknown): void {
  console.log(`\n## ${label}`);
  console.log(JSON.stringify(value, null, 2));
}

function printJsonl(envelope: string, data: unknown, label?: string): void {
  const line = label !== undefined
    ? JSON.stringify({ envelope, data, label })
    : JSON.stringify({ envelope, data });
  process.stdout.write(line + "\n");
}

async function main(): Promise<void> {
  const adapter = new EchoFixtureAdapter();
  const { command, json } = parseArgs(process.argv);
  const headId = "head:main";

  const print = json ? printJsonl : (envelope: string, data: unknown) => printSection(envelope, data);

  if (command === "hello") {
    print("HostHello", await adapter.hello());
    return;
  }

  if (command === "catalog") {
    print("LaneCatalog", await adapter.laneCatalog());
    return;
  }

  if (command === "frame") {
    print("PlaybackHeadSnapshot", await adapter.playbackHead(headId));
    print("PlaybackFrame", await adapter.frame(headId));
    const receipts = await adapter.receipts(headId);
    for (const r of receipts) {
      print("ReceiptSummary", r);
    }
    return;
  }

  if (command === "step") {
    if (json) {
      print("PlaybackHeadSnapshot", await adapter.playbackHead(headId), "before");
      print("PlaybackFrame", await adapter.stepForward(headId), "stepped");
      print("PlaybackHeadSnapshot", await adapter.playbackHead(headId), "after");
      const receipts = await adapter.receipts(headId);
      for (const r of receipts) {
        print("ReceiptSummary", r);
      }
    } else {
      printSection("Before", await adapter.playbackHead(headId));
      printSection("NextFrame", await adapter.stepForward(headId));
      printSection("After", await adapter.playbackHead(headId));
      printSection("ReceiptSummary[]", await adapter.receipts(headId));
    }
    return;
  }

  // demo: full sequence
  print("HostHello", await adapter.hello());
  print("LaneCatalog", await adapter.laneCatalog());
  print("PlaybackHeadSnapshot", await adapter.playbackHead(headId));
  print("PlaybackFrame", await adapter.frame(headId));
  const receipts0 = await adapter.receipts(headId);
  for (const r of receipts0) {
    print("ReceiptSummary", r);
  }
  if (json) {
    print("PlaybackFrame", await adapter.stepForward(headId), "stepped");
    print("PlaybackHeadSnapshot", await adapter.playbackHead(headId), "after");
  } else {
    printSection("StepForward", await adapter.stepForward(headId));
    printSection("PlaybackHeadSnapshot (after step)", await adapter.playbackHead(headId));
    printSection("PlaybackFrame (after step)", await adapter.frame(headId));
    printSection("ReceiptSummary[] (after step)", await adapter.receipts(headId));
  }
  const receiptsAfter = await adapter.receipts(headId);
  for (const r of receiptsAfter) {
    print("ReceiptSummary", r);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
