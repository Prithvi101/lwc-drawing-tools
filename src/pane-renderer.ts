import { IPrimitivePaneRenderer } from "lightweight-charts";
import { DrawingPluginOptions } from "./type";

export type RenderLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  preview?: boolean;
};

type DrawTarget = Parameters<IPrimitivePaneRenderer["draw"]>[0];

export class PaneRenderer {
  private lines: RenderLine[] = [];
  private options?: DrawingPluginOptions;

  update(lines: RenderLine[]) {
    this.lines = lines;
  }

  draw(target: DrawTarget) {
    target.useBitmapCoordinateSpace((scope) => {
      const ctx = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;

      for (const l of this.lines) {
        ctx.save();

        ctx.strokeStyle = l.preview
          ? this.options?.previewColor ?? "rgba(74,222,128,0.5)"
          : this.options?.color ?? "#4ade80";

        ctx.setLineDash(l.preview ? [4, 4] : []);
        ctx.lineWidth = (this.options?.lineWidth ?? 1) * vRatio;

        ctx.beginPath();
        ctx.moveTo(l.x1 * hRatio, l.y1 * vRatio);
        ctx.lineTo(l.x2 * hRatio, l.y2 * vRatio);
        ctx.stroke();

        if (this.options?.showEndpoints) {
          const endpointRadius = 4 * vRatio;
          ctx.fillStyle = this.options?.color ?? ctx.strokeStyle;
          // Start point
          ctx.beginPath();
          ctx.arc(l.x1 * hRatio, l.y1 * vRatio, endpointRadius, 0, Math.PI * 2);
          ctx.fill();
          // End point
          ctx.beginPath();
          ctx.arc(l.x2 * hRatio, l.y2 * vRatio, endpointRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    });
  }

  setOptions(options: DrawingPluginOptions) {
    this.options = {
      ...options,
    };
  }
}
