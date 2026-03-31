/**
 * Custom error types for warp-ttd.
 *
 * Raw `new Error()` is banned by lint. Every throwable condition
 * gets a named error class with structured context.
 */

export class UnknownHeadError extends Error {
  public readonly headId: string;

  public constructor(headId: string) {
    super(`Unknown playback head: ${headId}`);
    this.name = "UnknownHeadError";
    this.headId = headId;
  }
}

export class FrameOutOfRangeError extends Error {
  public readonly frameIndex: number;
  public readonly maxFrame: number;

  public constructor(frameIndex: number, maxFrame: number) {
    super(`Frame index ${frameIndex.toString()} out of range [0, ${maxFrame.toString()}]`);
    this.name = "FrameOutOfRangeError";
    this.frameIndex = frameIndex;
    this.maxFrame = maxFrame;
  }
}

export class FrameResolutionError extends Error {
  public readonly frameIndex: number;
  public readonly headId: string;

  public constructor(frameIndex: number, headId: string) {
    super(`Unable to resolve frame ${frameIndex.toString()} for playback head ${headId}`);
    this.name = "FrameResolutionError";
    this.frameIndex = frameIndex;
    this.headId = headId;
  }
}

export class InternalIndexError extends Error {
  public readonly index: number;
  public readonly length: number;

  public constructor(index: number, length: number) {
    super(`Internal frame index ${index.toString()} out of bounds (length: ${length.toString()})`);
    this.name = "InternalIndexError";
    this.index = index;
    this.length = length;
  }
}

export class NoFramesConfiguredError extends Error {
  public readonly headId: string;

  public constructor(headId: string) {
    super(`No frames configured for playback head: ${headId}`);
    this.name = "NoFramesConfiguredError";
    this.headId = headId;
  }
}

export class UnsupportedCommandError extends Error {
  public readonly command: string;

  public constructor(command: string) {
    super(`Unsupported command: ${command}`);
    this.name = "UnsupportedCommandError";
    this.command = command;
  }
}

export class UnexpectedArgumentsError extends Error {
  public readonly args: string[];

  public constructor(args: string[]) {
    super(`Unexpected arguments: ${args.join(", ")}`);
    this.name = "UnexpectedArgumentsError";
    this.args = args;
  }
}

export class UnknownFlagsError extends Error {
  public readonly flags: string[];

  public constructor(flags: string[]) {
    super(`Unknown flags: ${flags.join(", ")}`);
    this.name = "UnknownFlagsError";
    this.flags = flags;
  }
}

export class UnknownAdapterKindError extends Error {
  public readonly kind: string;

  public constructor(kind: string) {
    super(`Unknown adapter kind: ${kind}`);
    this.name = "UnknownAdapterKindError";
    this.kind = kind;
  }
}
