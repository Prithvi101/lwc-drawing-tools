import { IChartApi, IPrimitivePaneRenderer } from "lightweight-charts";
import { DrawingPluginOptions } from "./type";
import { brighten, withAlpha } from "./helpers/colors";

export type RenderLine = {
  id: string;
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

  private hoveredLineId: string | null = null;
  private selectedLineId: string | null = null;
  private dragState: {
    lineId: string;
    type: "line" | "start" | "end";
    grabOffset: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };
  } | null = null;

  private hitEndpoint(px: number, py: number, cx: number, cy: number, r = 6) {
    return Math.hypot(px - cx, py - cy) <= r;
  }

  update(lines: RenderLine[]) {
    this.lines = lines;
  }

  draw(target: DrawTarget) {
    target.useBitmapCoordinateSpace((scope) => {
      const ctx = scope.context;
      const h = scope.horizontalPixelRatio;
      const v = scope.verticalPixelRatio;

      for (const l of this.lines) {
        const isHovered = l.id === this.hoveredLineId;
        const isSelected = l.id === this.selectedLineId;

        ctx.save();

        const baseColor = this.options?.color ?? "rgba(32,108,237,1)";

        const colors = {
          normal: baseColor,
          hovered: withAlpha(baseColor, 0.6),
          selected: brighten(baseColor, 40),
        };

        ctx.strokeStyle = isSelected
          ? colors.selected
          : isHovered
          ? colors.hovered
          : colors.normal;

        ctx.lineWidth =
          ((this.options?.lineWidth ?? 1) + (isHovered || isSelected ? 1 : 0)) *
          v;

        ctx.setLineDash(l.preview ? [4, 4] : []);

        ctx.beginPath();
        ctx.moveTo(l.x1 * h, l.y1 * v);
        ctx.lineTo(l.x2 * h, l.y2 * v);
        ctx.stroke();

        // 🔑 edges only on hover or selection
        if (isHovered || isSelected) {
          const r = 4 * v;
          const drawEdge = (x: number, y: number) => {
            ctx.fillStyle = colors.normal;
            ctx.beginPath();
            ctx.arc(x * h, y * v, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = colors.normal;
            ctx.lineWidth = 1 * v;
            ctx.stroke();
          };

          drawEdge(l.x1, l.y1);
          drawEdge(l.x2, l.y2);
        }

        ctx.restore();
      }
    });
  }

  private distanceToLine(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const t = Math.max(0, Math.min(1, dot / lenSq));

    const dx = x1 + t * C - px;
    const dy = y1 + t * D - py;

    return Math.sqrt(dx * dx + dy * dy);
  }

  findLineAt(x: number, y: number, tolerance = 6): RenderLine | null {
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const l = this.lines[i];
      if (this.distanceToLine(x, y, l.x1, l.y1, l.x2, l.y2) <= tolerance) {
        return l;
      }
    }
    return null;
  }

  onHover(x: number, y: number, chart: IChartApi) {
    const line = this.findLineAt(x, y);
    this.hoveredLineId = line?.id ?? null;
    if (line) {
      this.setCursor("pointer", chart);
    } else {
      this.setCursor("default", chart);
    }
  }

  getDragState() {
    return this.dragState;
  }

  rendererLines() {
    return this.lines;
  }

  onPointerDown(x: number, y: number) {
    const line = this.findLineAt(x, y);
    if (!line) return;

    this.selectedLineId = line.id;

    // endpoint first
    if (this.hitEndpoint(x, y, line.x1, line.y1)) {
      this.dragState = {
        lineId: line.id,
        type: "start",
        grabOffset: {
          x1: line.x1 - x,
          y1: line.y1 - y,
          x2: 0,
          y2: 0,
        },
      };
      return;
    }

    if (this.hitEndpoint(x, y, line.x2, line.y2)) {
      this.dragState = {
        lineId: line.id,
        type: "end",
        grabOffset: {
          x1: 0,
          y1: 0,
          x2: line.x2 - x,
          y2: line.y2 - y,
        },
      };
      return;
    }

    // whole line
    this.dragState = {
      lineId: line.id,
      type: "line",
      grabOffset: {
        x1: line.x1 - x,
        y1: line.y1 - y,
        x2: line.x2 - x,
        y2: line.y2 - y,
      },
    };
  }

  onPointerMove(x: number, y: number) {
    if (!this.dragState) return;

    const line = this.lines.find((l) => l.id === this.dragState!.lineId);
    if (!line) return;

    const o = this.dragState.grabOffset;

    if (this.dragState.type === "line") {
      line.x1 = x + o.x1;
      line.y1 = y + o.y1;
      line.x2 = x + o.x2;
      line.y2 = y + o.y2;
    }

    if (this.dragState.type === "start") {
      line.x1 = x + o.x1;
      line.y1 = y + o.y1;
    }

    if (this.dragState.type === "end") {
      line.x2 = x + o.x2;
      line.y2 = y + o.y2;
    }
  }
  onPointerUp() {
    this.dragState = null;
  }
  setCursor(cursor: string, chart: IChartApi) {
    const container = chart.chartElement();

    // Lightweight Charts renders one or more canvas elements
    const canvases = container.querySelectorAll("canvas");

    canvases.forEach((c) => {
      (c as HTMLCanvasElement).style.cursor = cursor;
    });
  }

  onClick(x: number, y: number) {
    const line = this.findLineAt(x, y);
    this.selectedLineId = line?.id ?? null;
  }

  getSelected() {
    return this.selectedLineId;
  }

  setOptions(options: DrawingPluginOptions) {
    this.options = {
      ...options,
    };
  }
}
