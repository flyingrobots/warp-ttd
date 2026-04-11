/**
 * EffectKind — runtime-backed effect-kind identity for protocol surfaces.
 *
 * The authored schema treats this as a scalar. Local runtime code hydrates
 * that scalar into a concrete class so behaviorally significant branching
 * never has to compare bare strings outside parser/factory boundaries.
 */
const DIAGNOSTIC_EFFECT = "diagnostic";
const NOTIFICATION_EFFECT = "notification";
const EXPORT_EFFECT = "export";
const BRIDGE_EFFECT = "bridge";

export abstract class EffectKind {
  readonly #value: string;

  protected constructor(value: string) {
    if (value.length === 0) {
      throw new TypeError("EffectKind must not be empty");
    }

    this.#value = value;
  }

  public static from(value: string): EffectKind {
    switch (value) {
      case DIAGNOSTIC_EFFECT:
        return new DiagnosticEffectKind();
      case NOTIFICATION_EFFECT:
        return new NotificationEffectKind();
      case EXPORT_EFFECT:
        return new ExportEffectKind();
      case BRIDGE_EFFECT:
        return new BridgeEffectKind();
      default:
        return new CustomEffectKind(value);
    }
  }

  public clone(): EffectKind {
    return EffectKind.from(this.#value);
  }

  public toJSON(): string {
    return this.#value;
  }

  public toString(): string {
    return this.#value;
  }
}

export class DiagnosticEffectKind extends EffectKind {
  public constructor() {
    super(DIAGNOSTIC_EFFECT);
  }
}

export class NotificationEffectKind extends EffectKind {
  public constructor() {
    super(NOTIFICATION_EFFECT);
  }
}

export class ExportEffectKind extends EffectKind {
  public constructor() {
    super(EXPORT_EFFECT);
  }
}

export class BridgeEffectKind extends EffectKind {
  public constructor() {
    super(BRIDGE_EFFECT);
  }
}

export class CustomEffectKind extends EffectKind {
  public constructor(value: string) {
    super(value);
  }
}

export function formatEffectKind(kind: EffectKind): string {
  return kind.toString();
}
