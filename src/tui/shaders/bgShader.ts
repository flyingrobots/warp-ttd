/**
 * 'Sea of Provenance' wave background shader.
 *
 * Calm oscillating sinusoidal pattern with blue/cyan gradient.
 * Ported from warp-lens bg-shader.ts, updated for bijou v4.
 */
import { canvas } from "@flyingrobots/bijou-tui";
import type { ShaderFn } from "@flyingrobots/bijou-tui";
import type { Surface, BijouContext } from "@flyingrobots/bijou";

function hex(n: number): string {
  return Math.max(0, Math.min(255, Math.floor(n))).toString(16).padStart(2, "0");
}

export function renderWaveShader(
  cols: number,
  rows: number,
  time: number,
  ctx: BijouContext
): Surface {
  const shader: ShaderFn = ({ u, v, time: t }) => {
    const wave1 = Math.sin(u * 10 + t * 0.5) * 0.1;
    const wave2 = Math.cos(v * 8 - t * 0.3) * 0.1;
    const centerDist = Math.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2);
    const wave3 = Math.sin(centerDist * 20 - t) * 0.05;
    const val = 0.5 + wave1 + wave2 + wave3;

    if (val > 0.65) {
      const blue = Math.floor(150 + Math.sin(t + u * 5) * 50);
      const green = Math.floor(100 + Math.cos(t + v * 5) * 50);
      const fg = "#00" + hex(green) + hex(blue);
      return { char: "X", fg };
    }

    return " ";
  };

  return canvas(cols, rows, shader, { resolution: "braille", time });
}
