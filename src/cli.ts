import { EchoFixtureAdapter } from "./adapters/echoFixtureAdapter.ts";
import { buildAdmissionChainReadModel } from "./app/admissionChainReadModel.ts";
import { DebuggerSession } from "./app/debuggerSession.ts";
import { inspectLiveTargets } from "./app/liveTargetInspection.ts";
import { inspectLiveTargetSessions } from "./app/liveTargetSessionInspection.ts";
import { inspectRuntimeHello } from "./app/runtimeHelloInspection.ts";
import { buildTickRows } from "./tui/worldlineLayout.ts";
import type { FrameData } from "./tui/worldlineLayout.ts";
import {
  UnexpectedArgumentsError,
  UnknownFlagsError,
  UnsupportedCommandError
} from "./errors.ts";

type Command = "demo" | "hello" | "catalog" | "frame" | "step" | "effects" | "deliveries" | "context" | "session" | "worldline" | "targets" | "target-session" | "runtime-hello" | "admission-chain";
type AdapterCommand = Exclude<Command, "targets" | "target-session" | "runtime-hello">;
type PrintableValue = object | string | number | boolean | null | undefined;
type PrintFn = (envelope: string, data: PrintableValue, label?: string) => void;
type CliHandler = (ctx: CliContext) => Promise<void>;

const VALID_COMMANDS = new Set<Command>([
  "admission-chain",
  "catalog",
  "context",
  "deliveries",
  "demo",
  "effects",
  "frame",
  "hello",
  "runtime-hello",
  "session",
  "step",
  "targets",
  "target-session",
  "worldline"
]);

interface PrintContext {
  json: boolean;
  print: PrintFn;
}

interface CliContext extends PrintContext {
  adapter: EchoFixtureAdapter;
  headId: string;
}

function isValidCommand(cmd: string): cmd is Command {
  return (VALID_COMMANDS as Set<string>).has(cmd);
}

function parseArgs(argv: string[]): { command: Command; json: boolean } {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const positional = args.filter((a) => !a.startsWith("--"));
  const unknown = args.filter((a) => a.startsWith("--") && a !== "--json");

  if (unknown.length > 0) {
    throw new UnknownFlagsError(unknown);
  }

  if (positional.length > 1) {
    throw new UnexpectedArgumentsError(positional.slice(1));
  }

  const command = positional[0];

  if (command === undefined) {
    return { command: "demo", json };
  }

  if (isValidCommand(command)) {
    return { command, json };
  }

  throw new UnsupportedCommandError(command);
}

function writeLine(line: string): void {
  process.stdout.write(`${line}\n`);
}

function printSection(label: string, value: PrintableValue): void {
  writeLine(`\n## ${label}`);
  writeLine(JSON.stringify(value, null, 2));
}

function printJsonl(envelope: string, data: PrintableValue, label?: string): void {
  const line = label !== undefined
    ? JSON.stringify({ envelope, data, label })
    : JSON.stringify({ envelope, data });
  writeLine(line);
}

function createPrintFn(json: boolean): PrintFn {
  if (json) return printJsonl;

  return (envelope, data): void => {
    printSection(envelope, data);
  };
}

async function handleHello(ctx: CliContext): Promise<void> {
  ctx.print("HostHello", await ctx.adapter.hello());
}

async function handleCatalog(ctx: CliContext): Promise<void> {
  ctx.print("LaneCatalog", await ctx.adapter.laneCatalog());
}

async function printReceipts(ctx: CliContext): Promise<void> {
  const receipts = await ctx.adapter.receipts(ctx.headId);
  for (const receipt of receipts) {
    ctx.print("ReceiptSummary", receipt);
  }
}

async function handleFrame(ctx: CliContext): Promise<void> {
  ctx.print("PlaybackHeadSnapshot", await ctx.adapter.playbackHead(ctx.headId));
  ctx.print("PlaybackFrame", await ctx.adapter.frame(ctx.headId));
  await printReceipts(ctx);
}

function printList(
  ctx: PrintContext,
  envelope: string,
  items: PrintableValue[]
): void {
  if (!ctx.json) {
    printSection(envelope, items);
    return;
  }
  for (const item of items) {
    ctx.print(envelope, item);
  }
}

async function handleEffects(ctx: CliContext): Promise<void> {
  printList(ctx, "EffectEmissionSummary", await ctx.adapter.effectEmissions(ctx.headId));
}

async function handleDeliveries(ctx: CliContext): Promise<void> {
  printList(ctx, "DeliveryObservationSummary", await ctx.adapter.deliveryObservations(ctx.headId));
}

async function handleContext(ctx: CliContext): Promise<void> {
  ctx.print("ExecutionContext", await ctx.adapter.executionContext());
}

async function handleSession(ctx: CliContext): Promise<void> {
  const session = await DebuggerSession.create(ctx.adapter, ctx.headId);
  if (ctx.json) {
    ctx.print("SerializedSession", session.toJSON());
    return;
  }
  printSection("Session", session.toJSON());
}

async function handleAdmissionChain(ctx: CliContext): Promise<void> {
  const session = await DebuggerSession.create(ctx.adapter, ctx.headId);
  ctx.print("AdmissionChainReadModel", buildAdmissionChainReadModel(session));
}

function handleTargets(ctx: PrintContext): Promise<void> {
  printList(ctx, "LiveTargetInspection", inspectLiveTargets());
  return Promise.resolve();
}

async function handleTargetSession(ctx: PrintContext): Promise<void> {
  printList(ctx, "LiveTargetSessionInspection", await inspectLiveTargetSessions());
}

async function handleRuntimeHello(ctx: PrintContext): Promise<void> {
  printList(ctx, "ContinuumRuntimeHelloInspection", await inspectRuntimeHello());
}

async function collectWorldlineFrames(ctx: CliContext): Promise<FrameData[]> {
  const maxFrame = await ctx.adapter.seekToFrame(ctx.headId, Number.MAX_SAFE_INTEGER);
  const frames: FrameData[] = [];

  for (let i = 0; i <= maxFrame.frameIndex; i++) {
    const frame = await ctx.adapter.frame(ctx.headId, i);
    const receipts = await ctx.adapter.receipts(ctx.headId, i);
    frames.push({ frameIndex: frame.frameIndex, lanes: frame.lanes, receipts });
  }

  return frames;
}

function printWorldlineHuman(row: ReturnType<typeof buildTickRows>[number]): void {
  const conflict = row.hasConflict ? "!" : " ";
  const digest = row.digest.slice(0, 7).padEnd(7);
  const writers = row.writers.length > 0 ? row.writers.join(", ") : "(genesis)";
  const strands = row.strandIds.length > 0 ? ` [${row.strandIds.join(", ")}]` : "";
  writeLine(`${conflict} ${String(row.frameIndex).padStart(4)}  ${digest}  ${writers}${strands}`);
}

async function handleWorldline(ctx: CliContext): Promise<void> {
  const frames = await collectWorldlineFrames(ctx);
  const catalog = await ctx.adapter.laneCatalog();
  const rows = buildTickRows(frames, catalog.lanes);

  for (const row of rows) {
    if (ctx.json) {
      ctx.print("WorldlineTick", row);
    } else {
      printWorldlineHuman(row);
    }
  }
}

async function handleStep(ctx: CliContext): Promise<void> {
  if (!ctx.json) {
    printSection("Before", await ctx.adapter.playbackHead(ctx.headId));
    printSection("NextFrame", await ctx.adapter.stepForward(ctx.headId));
    printSection("After", await ctx.adapter.playbackHead(ctx.headId));
    printSection("ReceiptSummary[]", await ctx.adapter.receipts(ctx.headId));
    return;
  }

  ctx.print("PlaybackHeadSnapshot", await ctx.adapter.playbackHead(ctx.headId), "before");
  ctx.print("PlaybackFrame", await ctx.adapter.stepForward(ctx.headId), "stepped");
  ctx.print("PlaybackHeadSnapshot", await ctx.adapter.playbackHead(ctx.headId), "after");
  await printReceipts(ctx);
}

async function printDemoAfterStep(ctx: CliContext): Promise<void> {
  ctx.print("PlaybackFrame", await ctx.adapter.stepForward(ctx.headId), "stepped");
  ctx.print("PlaybackHeadSnapshot", await ctx.adapter.playbackHead(ctx.headId), "after");
  await printReceipts(ctx);
  await handleEffects(ctx);
  await handleDeliveries(ctx);
  ctx.print("ExecutionContext", await ctx.adapter.executionContext());
}

async function handleDemo(ctx: CliContext): Promise<void> {
  await handleHello(ctx);
  await handleCatalog(ctx);
  ctx.print("PlaybackHeadSnapshot", await ctx.adapter.playbackHead(ctx.headId));
  ctx.print("PlaybackFrame", await ctx.adapter.frame(ctx.headId));
  await printReceipts(ctx);
  if (ctx.json) {
    await printDemoAfterStep(ctx);
    return;
  }
  printSection("StepForward", await ctx.adapter.stepForward(ctx.headId));
  printSection("PlaybackHeadSnapshot (after step)", await ctx.adapter.playbackHead(ctx.headId));
  printSection("PlaybackFrame (after step)", await ctx.adapter.frame(ctx.headId));
  printSection("ReceiptSummary[] (after step)", await ctx.adapter.receipts(ctx.headId));
}

const COMMAND_HANDLERS: Record<AdapterCommand, CliHandler> = {
  "admission-chain": handleAdmissionChain,
  catalog: handleCatalog,
  context: handleContext,
  deliveries: handleDeliveries,
  demo: handleDemo,
  effects: handleEffects,
  frame: handleFrame,
  hello: handleHello,
  session: handleSession,
  step: handleStep,
  worldline: handleWorldline
};

async function main(): Promise<void> {
  const { command, json } = parseArgs(process.argv);
  const print = createPrintFn(json);

  if (command === "targets") {
    await handleTargets({ json, print });
    return;
  }

  if (command === "target-session") {
    await handleTargetSession({ json, print });
    return;
  }

  if (command === "runtime-hello") {
    await handleRuntimeHello({ json, print });
    return;
  }

  const ctx: CliContext = {
    adapter: new EchoFixtureAdapter(),
    headId: "head:main",
    json,
    print
  };

  await COMMAND_HANDLERS[command](ctx);
}

try {
  await main();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);

  if (process.argv.includes("--json")) {
    process.stderr.write(JSON.stringify({ error: message }) + "\n");
  } else {
    process.stderr.write(`${message}\n`);
  }

  process.exitCode = 1;
}
