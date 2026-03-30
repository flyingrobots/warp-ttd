/**
 * DAG visualization shader.
 *
 * Simple branching worldline simulation with main trunk and fork branches.
 * Ported from warp-lens dag-shader.ts, updated for bijou v4.
 */
import { canvas } from "@flyingrobots/bijou-tui";
import type { ShaderFn } from "@flyingrobots/bijou-tui";
import type { Surface } from "@flyingrobots/bijou";

export function renderDagShader(
  cols: number,
  rows: number,
  time: number
): Surface {
  const shader: ShaderFn = ({ u, v }) => {
    // Main trunk (Gold/Amber)
    if (Math.abs(v - 0.5) < 0.01 && u < 0.4) {
      return { char: "X", fg: "#ffcc00" };
    }

    // Fork A (Purple/Magenta)
    if (u >= 0.4 && u < 0.8) {
      const offset = (u - 0.4) * 0.5;
      if (Math.abs(v - (0.5 - offset)) < 0.01) return { char: "X", fg: "#cc33ff" };
      if (Math.abs(v - (0.5 + offset)) < 0.01) return { char: "X", fg: "#ff33cc" };
    }

    return " ";
  };

  return canvas(cols, rows, shader, { resolution: "braille", time });
}
