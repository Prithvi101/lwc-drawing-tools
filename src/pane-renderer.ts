import { IPrimitivePaneRenderer } from "lightweight-charts";

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

        ctx.strokeStyle = l.preview ? "rgba(74,222,128,0.5)" : "#4ade80";

        ctx.setLineDash(l.preview ? [4, 4] : []);
        ctx.lineWidth = 1 * vRatio;

        ctx.beginPath();
        ctx.moveTo(l.x1 * hRatio, l.y1 * vRatio);
        ctx.lineTo(l.x2 * hRatio, l.y2 * vRatio);
        ctx.stroke();

        ctx.restore();
      }
    });
  }
}
