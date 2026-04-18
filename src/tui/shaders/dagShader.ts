/**
 * DAG visualization shader.
 *
 * Simple branching worldline simulation with main trunk and fork branches.
 * Ported from warp-lens dag-shader.ts, updated for bijou v4.
 */
import { canvas } from "@flyingrobots/bijou-tui";
import type { ShaderFn } from "@flyingrobots/bijou-tui";
import type { Surface } from "@flyingrobots/bijou";

function trunkPixel(t: number): { char: string; fg: string } {
  const brightness = 180 + Math.floor(Math.sin(t * 2) * 40);
  return { char: "X", fg: `#ff${brightness.toString(16).padStart(2, "0")}00` };
}

function forkPixel(u: number, v: number): string | { char: string; fg: string } {
  const offset = (u - 0.4) * 0.5;
  if (Math.abs(v - (0.5 - offset)) < 0.01) return { char: "X", fg: "#cc33ff" };
  if (Math.abs(v - (0.5 + offset)) < 0.01) return { char: "X", fg: "#ff33cc" };
  return " ";
}

export function renderDagShader(cols: number, rows: number, time: number): Surface {
  const shader: ShaderFn = ({ u, v, time: t }) => {
    if (Math.abs(v - 0.5) < 0.01 && u < 0.4) return trunkPixel(t);
    if (u >= 0.4 && u < 0.8) return forkPixel(u, v);
    return " ";
  };

  return canvas(cols, rows, shader, { resolution: "braille", time });
}
