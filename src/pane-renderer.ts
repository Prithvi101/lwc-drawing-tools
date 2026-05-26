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
  interaction?: boolean; // default true
  color?: string;
  label?: string;
  textColor?: string;
  points?: { x: number; y: number }[];
  type?: "line" | "fib" | "pen" | "measure" | "rectangle" | "text";
  text?: string;
  measureLabel?: {
    priceChange: string;
    bars: string;
    duration: string;
  };
};

type DrawTarget = Parameters<IPrimitivePaneRenderer["draw"]>[0];

export class PaneRenderer {
  private lines: RenderLine[] = [];
  private options?: DrawingPluginOptions;

  private hoveredLineId: string | null = null;
  private selectedLineId: string | null = null;
  private dragState: {
    lineId: string;
    type: "line" | "start" | "end" | "poly";
    grabOffset?: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };
    pointsSnapshot?: { x: number; y: number }[];
    dragOrigin?: { x: number; y: number };
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

        const baseColor =
          l.color ?? this.options?.color ?? "rgba(32,108,237,1)";

        const colors = {
          normal: baseColor,
          hovered: withAlpha(baseColor, 0.6),
          selected: brighten(baseColor, 40),
        };

        if (l.interaction === false) {
          ctx.strokeStyle = colors.normal; // plain color for non-interactive
        } else {
          ctx.strokeStyle = isSelected
            ? colors.selected
            : isHovered
            ? colors.hovered
            : colors.normal;
        }

        ctx.lineWidth =
          ((this.options?.lineWidth ?? 1) + (isHovered || isSelected ? 1 : 0)) *
          v;

        if (l.type === "rectangle") {
          const rx1 = l.x1 * h;
          const ry1 = l.y1 * v;
          const rx2 = l.x2 * h;
          const ry2 = l.y2 * v;
          const rw = rx2 - rx1;
          const rh = ry2 - ry1;

          ctx.fillStyle = withAlpha(baseColor, 0.15);
          ctx.fillRect(rx1, ry1, rw, rh);

          ctx.beginPath();
          ctx.rect(rx1, ry1, rw, rh);
          ctx.stroke();

          if ((isHovered || isSelected) && l.interaction !== false) {
            const r = 4 * v;
            const drawEdge = (ex: number, ey: number) => {
              ctx.fillStyle = colors.normal;
              ctx.beginPath();
              ctx.arc(ex * h, ey * v, r, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = colors.normal;
              ctx.lineWidth = 1 * v;
              ctx.stroke();
            };
            drawEdge(l.x1, l.y1);
            drawEdge(l.x2, l.y1);
            drawEdge(l.x2, l.y2);
            drawEdge(l.x1, l.y2);
          }

          ctx.restore();
          continue;
        }

        if (l.type === "measure") {
          const rx1 = l.x1 * h;
          const ry1 = l.y1 * v;
          const rx2 = l.x2 * h;
          const ry2 = l.y2 * v;
          const rw = rx2 - rx1;
          const rh = ry2 - ry1;

          ctx.fillStyle = withAlpha(baseColor, 0.12);
          ctx.fillRect(rx1, ry1, rw, rh);

          ctx.strokeStyle = colors.normal;
          ctx.lineWidth = 1 * v;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.rect(rx1, ry1, rw, rh);
          ctx.stroke();
          ctx.setLineDash([]);

          if (l.measureLabel) {
            const cx = (rx1 + rx2) / 2;
            const cy = (ry1 + ry2) / 2;

            const paddingX = 10 * h;
            const paddingY = 8 * v;
            const fontSize = 11 * v;
            ctx.font = `500 ${fontSize}px sans-serif`;

            const textLines = [
              l.measureLabel.priceChange,
              `${l.measureLabel.bars}, ${l.measureLabel.duration}`
            ];

            let maxTextWidth = 0;
            for (const lineText of textLines) {
              const m = ctx.measureText(lineText).width;
              if (m > maxTextWidth) maxTextWidth = m;
            }

            const cardWidth = maxTextWidth + paddingX * 2;
            const cardHeight = fontSize * 2 + paddingY * 2 + 4 * v;

            const cardX = cx - cardWidth / 2;
            const cardY = cy - cardHeight / 2;

            ctx.fillStyle = "#1e222d";
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = 1 * v;

            ctx.beginPath();
            const radius = 6 * v;
            ctx.roundRect(cardX, cardY, cardWidth, cardHeight, radius);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.fillText(textLines[0], cx, cardY + paddingY + fontSize / 2);
            ctx.fillText(textLines[1], cx, cardY + paddingY + fontSize * 1.5 + 4 * v);
          }

          if ((isHovered || isSelected) && l.interaction !== false) {
            const r = 4 * v;
            const drawEdge = (ex: number, ey: number) => {
              ctx.fillStyle = colors.normal;
              ctx.beginPath();
              ctx.arc(ex * h, ey * v, r, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = colors.normal;
              ctx.lineWidth = 1 * v;
              ctx.stroke();
            };
            drawEdge(l.x1, l.y1);
            drawEdge(l.x2, l.y2);
          }

          ctx.restore();
          continue;
        }

        if (l.type === "text") {
          const tx = l.x1 * h;
          const ty = l.y1 * v;
          const text = l.text || "";

          const fontSize = 14 * v;
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.fillStyle = colors.normal;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";

          const m = ctx.measureText(text);
          const textWidth = m.width;
          const textHeight = fontSize;
          const pad = 6 * v;
          const gap = 6 * v;

          (l as any).textWidth = textWidth / h;
          (l as any).textHeight = textHeight / v;

          if ((isHovered || isSelected) && l.interaction !== false) {
            ctx.strokeStyle = withAlpha(baseColor, 0.4);
            ctx.lineWidth = 1 * v;
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(tx - textWidth / 2 - pad, ty - textHeight - gap - pad, textWidth + pad * 2, textHeight + pad * 2);
            ctx.setLineDash([]);

            const r = 4 * v;
            ctx.fillStyle = colors.normal;
            ctx.beginPath();
            ctx.arc(l.x1 * h, l.y1 * v, r, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillText(text, tx, ty - gap);
          ctx.restore();
          continue;
        }

        ctx.setLineDash(l.preview ? [4, 4] : []);

        ctx.beginPath();

        if (l.points && l.points.length > 0) {
          const points = l.points;
          ctx.moveTo(points[0].x * h, points[0].y * v);

          // Smooth curve using quadratic Bézier
          let i = 1;
          for (; i < points.length - 2; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(
              points[i].x * h,
              points[i].y * v,
              xc * h,
              yc * v
            );
          }

          // Curve through the last two points
          if (i < points.length - 1) {
            ctx.quadraticCurveTo(
              points[i].x * h,
              points[i].y * v,
              points[i + 1].x * h,
              points[i + 1].y * v
            );
          } else if (points.length > 1) {
            // Fallback for very short lines (2 points) where look didn't run
            ctx.lineTo(
              points[points.length - 1].x * h,
              points[points.length - 1].y * v
            );
          }
        } else {
          ctx.moveTo(l.x1 * h, l.y1 * v);
          ctx.lineTo(l.x2 * h, l.y2 * v);
        }

        ctx.stroke();

        // 🔑 edges only on hover or selection (skip for polyline for now to keep it clean)
        if ((isHovered || isSelected) && l.interaction !== false && !l.points) {
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

        // Draw Label if present
        if (l.label) {
          ctx.font = `${10 * v}px sans-serif`;
          ctx.fillStyle = l.textColor ?? l.color ?? baseColor;
          ctx.textAlign = "left";
          ctx.textBaseline = "bottom";
          // Draw slightly above the line, at the start x
          ctx.fillText(l.label, l.x1 * h + 2 * h, l.y1 * v - 2 * v);
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
      if (l.interaction === false) continue; // skip non-interactive lines

      if (l.type === "rectangle" || l.type === "measure") {
        const minX = Math.min(l.x1, l.x2);
        const maxX = Math.max(l.x1, l.x2);
        const minY = Math.min(l.y1, l.y2);
        const maxY = Math.max(l.y1, l.y2);
        if (x >= minX - tolerance && x <= maxX + tolerance && y >= minY - tolerance && y <= maxY + tolerance) {
          const distTop = Math.abs(y - l.y1);
          const distBottom = Math.abs(y - l.y2);
          const distLeft = Math.abs(x - l.x1);
          const distRight = Math.abs(x - l.x2);
          if (
            distTop <= tolerance ||
            distBottom <= tolerance ||
            distLeft <= tolerance ||
            distRight <= tolerance ||
            (x > minX && x < maxX && y > minY && y < maxY)
          ) {
            return l;
          }
        }
      } else if (l.type === "text") {
        const width = (l as any).textWidth || 80;
        const height = (l as any).textHeight || 14;
        const pad = 6;
        const gap = 6;
        if (x >= l.x1 - width / 2 - pad && x <= l.x1 + width / 2 + pad && y >= l.y1 - height - gap - pad && y <= l.y1 - gap + pad) {
          return l;
        }
      } else if (l.points && l.points.length > 0) {
        // Check polyline segments
        for (let j = 0; j < l.points.length - 1; j++) {
          const p1 = l.points[j];
          const p2 = l.points[j + 1];
          if (this.distanceToLine(x, y, p1.x, p1.y, p2.x, p2.y) <= tolerance) {
            return l;
          }
        }
      } else {
        if (this.distanceToLine(x, y, l.x1, l.y1, l.x2, l.y2) <= tolerance) {
          return l;
        }
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

    // Handle Polyline Drag
    if (line.points) {
      this.dragState = {
        lineId: line.id,
        type: "poly",
        pointsSnapshot: line.points.map((p) => ({ ...p })),
        dragOrigin: { x, y },
      };
      return;
    }

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

    if (
      this.dragState.type === "poly" &&
      this.dragState.pointsSnapshot &&
      this.dragState.dragOrigin
    ) {
      const dx = x - this.dragState.dragOrigin.x;
      const dy = y - this.dragState.dragOrigin.y;

      line.points = this.dragState.pointsSnapshot.map((p) => ({
        x: p.x + dx,
        y: p.y + dy,
      }));
      return;
    }

    const o = this.dragState.grabOffset!;

    if (this.dragState.type === "line") {
      line.x1 = x + o.x1;
      line.y1 = y + o.y1;
      line.x2 = x + o.x2;
      line.y2 = y + o.y2;
    }

    if (this.dragState.type === "start") {
      line.x1 = x + o.x1;
      line.y1 = y + o.y1;
      if (line.type === "text") {
        line.x2 = line.x1;
        line.y2 = line.y1;
      }
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
