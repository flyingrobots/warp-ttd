import { EchoFixtureAdapter } from "./adapters/echoFixtureAdapter.ts";
import { DebuggerSession } from "./app/debuggerSession.ts";
import {
  UnexpectedArgumentsError,
  UnknownFlagsError,
  UnsupportedCommandError
} from "./errors.ts";

type Command = "demo" | "hello" | "catalog" | "frame" | "step" | "effects" | "deliveries" | "context" | "session";

const VALID_COMMANDS = new Set<Command>(["demo", "hello", "catalog", "frame", "step", "effects", "deliveries", "context", "session"]);

function isValidCommand(cmd: string): cmd is Command {
  return (VALID_COMMANDS as Set<string>).has(cmd);
}

function parseArgs(argv: string[]): { command: Command; json: boolean } {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const positional = args.filter((a) => !a.startsWith("--"));

  if (positional.length > 1) {
    throw new UnexpectedArgumentsError(positional.slice(1));
  }

  const command = positional[0];

  if (command === undefined) {
    return { command: "demo", json };
  }

  const unknown = args.filter((a) => a.startsWith("--") && a !== "--json");

  if (unknown.length > 0) {
    throw new UnknownFlagsError(unknown);
  }

  if (isValidCommand(command)) {
    return { command, json };
  }

  throw new UnsupportedCommandError(command);
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

  const print = json ? printJsonl : (envelope: string, data: unknown): void => { printSection(envelope, data); };

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

  if (command === "effects" || command === "deliveries") {
    const [envelope, items] = command === "effects"
      ? ["EffectEmissionSummary", await adapter.effectEmissions(headId)] as const
      : ["DeliveryObservationSummary", await adapter.deliveryObservations(headId)] as const;
    if (json) {
      for (const item of items) {
        print(envelope, item);
      }
    } else {
      printSection(envelope, items);
    }
    return;
  }

  if (command === "context") {
    print("ExecutionContext", await adapter.executionContext());
    return;
  }

  if (command === "session") {
    const session = await DebuggerSession.create(adapter, headId);
    if (json) {
      print("SerializedSession", session.toJSON());
    } else {
      printSection("Session", session.toJSON());
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
    const receiptsAfter = await adapter.receipts(headId);
    for (const r of receiptsAfter) {
      print("ReceiptSummary", r);
    }
    // Effect/delivery data at the stepped frame (JSON-only; human-readable mode omits these)
    const emissions = await adapter.effectEmissions(headId);
    for (const e of emissions) {
      print("EffectEmissionSummary", e);
    }
    const observations = await adapter.deliveryObservations(headId);
    for (const o of observations) {
      print("DeliveryObservationSummary", o);
    }
    print("ExecutionContext", await adapter.executionContext());
  } else {
    printSection("StepForward", await adapter.stepForward(headId));
    printSection("PlaybackHeadSnapshot (after step)", await adapter.playbackHead(headId));
    printSection("PlaybackFrame (after step)", await adapter.frame(headId));
    printSection("ReceiptSummary[] (after step)", await adapter.receipts(headId));
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);

  if (process.argv.includes("--json")) {
    process.stderr.write(JSON.stringify({ error: message }) + "\n");
  } else {
    console.error(message);
  }

  process.exitCode = 1;
});
