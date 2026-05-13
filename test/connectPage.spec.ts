import assert from "node:assert/strict";
import test from "node:test";

import { initDefaultContext } from "@flyingrobots/bijou-node";
import type { Cmd } from "@flyingrobots/bijou-tui";

import { EchoFixtureAdapter } from "../src/adapters/echoFixtureAdapter.ts";
import { connectPage } from "../src/tui/pages/connectPage.ts";
import type { HostHello } from "../src/protocol.ts";

const HEAD_ID = "head:main";
type TestCommandCapabilities = Parameters<Cmd<never>>[1];

const COMMAND_CAPABILITIES: TestCommandCapabilities = {
  onPulse(): { dispose(): void } {
    return {
      dispose(): void {
        return undefined;
      }
    };
  }
};

class ExtraHelloCallError extends Error {
  public constructor() {
    super("connect page must reuse DebuggerSession host hello");
    this.name = "ExtraHelloCallError";
  }
}

class OneShotHelloAdapter extends EchoFixtureAdapter {
  #helloCalls = 0;

  public get helloCalls(): number {
    return this.#helloCalls;
  }

  public override async hello(): Promise<HostHello> {
    this.#helloCalls += 1;
    if (this.#helloCalls > 1) {
      throw new ExtraHelloCallError();
    }
    return super.hello();
  }
}

test("connect page reuses DebuggerSession host hello for session context", async () => {
  const adapter = new OneShotHelloAdapter();
  const page = connectPage(initDefaultContext(), () => Promise.resolve({
    adapter,
    defaultHeadId: HEAD_ID
  }));
  const [initialModel] = page.init();
  const [, commands] = page.update({ type: "select" }, initialModel);
  const command = commands[0];
  const emitted: object[] = [];

  assert.ok(command !== undefined);
  await command((msg) => { emitted.push(msg); }, COMMAND_CAPABILITIES);

  assert.equal(adapter.helloCalls, 1);
  assert.equal(emitted.length, 1);
  assert.equal((emitted[0] as { readonly type?: string }).type, "session-ready");
});
