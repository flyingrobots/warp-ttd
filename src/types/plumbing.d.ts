declare module "@git-stunts/plumbing" {
  interface PlumbingInstance {
    execute(options: { args: string[] }): Promise<string>;
    executeStream(options: { args: string[] }): Promise<AsyncIterable<Uint8Array> & { collect(opts?: { asString?: boolean }): Promise<string | Uint8Array> }>;
    readonly emptyTree: string;
  }

  interface PlumbingStatic {
    createDefault(options: { cwd: string }): PlumbingInstance;
  }

  const Plumbing: PlumbingStatic;
  export default Plumbing;
}
