import {
  IChartApi,
  IPrimitivePaneView,
  ISeriesApi,
  Logical,
  Time,
} from "lightweight-charts";
import { PaneRenderer, RenderLine } from "./pane-renderer";
import { DrawingTools } from "./drawing-tools";
import { DrawingPluginOptions } from "./type";
import { nanoid } from "nanoid";

function timeToDate(time: Time): Date {
  if (typeof time === "string") {
    return new Date(time);
  }
  if (typeof time === "number") {
    return new Date(time * 1000);
  }
  if (time && typeof time === "object" && "year" in time && "month" in time && "day" in time) {
    return new Date(time.year, time.month - 1, time.day);
  }
  return new Date();
}

function getDurationString(d1: Date, d2: Date): string {
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  const mins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
}

export class PaneView implements IPrimitivePaneView {
  private _renderer: PaneRenderer;

  private isDragging = false;

  constructor(
    private chart: IChartApi,
    private series: ISeriesApi<any>,
    private tools: DrawingTools,
    private requestUpdate?: () => void
  ) {
    this._renderer = new PaneRenderer();

    this.initializeHandlers();
  }

  private initializeHandlers() {
    this.chart.subscribeCrosshairMove((param) => {
      if (!param.point) return;
      this._renderer?.onHover(param.point.x, param.point.y, this.chart);
    });

    this.chart.subscribeClick((param) => {
      if (!param.point) return;
      this.handleClick(param.point.x, param.point.y);
    });

    const container = this.chart.chartElement();
    container.addEventListener("mousedown", this.handlePointerDown.bind(this));
    container.addEventListener("mousemove", this.handlePointerMove.bind(this));
    window.addEventListener("mouseup", this.handlePointerUp.bind(this));
  }

  private handleClick(x: number, y: number) {
    if (this.tools.tool === "remover") {
      const line = this._renderer.findLineAt(x, y);
      if (line) {
        this.tools.removeLine(line.id);
        this._renderer.onHover(x, y, this.chart); // re-check hover to clear cursor if needed
      }
      return;
    }
    if (this.tools.tool === "text") {
      const timeScale = this.chart.timeScale();
      const time = timeScale.coordinateToTime(x);
      const price = this.series.coordinateToPrice(y);
      if (time && price) {
        this.showInlineEditor(x, y, "", (text) => {
          if (text.trim() !== "") {
            this.tools.lines.push({
              id: nanoid(),
              p1: { time, price },
              p2: { time, price },
              type: "text",
              text,
            });
            this.update();
            this.requestUpdate?.();
          }
        });
      }
      return;
    }
    if (this.tools.tool === "move") {
      const clickedLine = this._renderer.findLineAt(x, y);
      if (clickedLine && clickedLine.type === "text") {
        const modelLine = this.tools.lines.find((l) => l.id === clickedLine.id);
        if (modelLine && modelLine.type === "text") {
          const timeScale = this.chart.timeScale();
          const tx = timeScale.timeToCoordinate(modelLine.p1.time);
          const ty = this.series.priceToCoordinate(modelLine.p1.price);
          if (tx !== null && ty !== null) {
            const originalText = modelLine.text || "";
            modelLine.text = ""; // hide temporarily
            this.update();
            this.requestUpdate?.();

            this.showInlineEditor(tx, ty, originalText, (text) => {
              if (text.trim() !== "") {
                modelLine.text = text;
              } else {
                modelLine.text = originalText;
              }
              this.update();
              this.requestUpdate?.();
            });
          }
          return;
        }
      }
    }
    this._renderer?.onClick(x, y);
  }

  private showInlineEditor(
    x: number,
    y: number,
    initialText: string,
    onSave: (text: string) => void
  ) {
    const container = this.chart.chartElement();

    const input = document.createElement("input");
    input.type = "text";
    input.value = initialText;

    input.style.position = "absolute";
    input.style.left = `${x}px`;
    input.style.top = `${y - 28}px`;
    input.style.transform = "translateX(-50%)";
    input.style.textAlign = "center";
    input.style.font = "bold 14px sans-serif";
    input.style.color = "#ffffff";
    input.style.background = "#1e222d";
    input.style.border = "1px solid rgba(32, 108, 237, 0.6)";
    input.style.borderRadius = "4px";
    input.style.padding = "2px 6px";
    input.style.outline = "none";
    input.style.zIndex = "10000000";
    input.style.boxShadow = "0 2px 8px rgba(0,0,0,0.5)";

    container.appendChild(input);
    input.focus();
    input.select();

    let finished = false;

    const finish = (save: boolean) => {
      if (finished) return;
      finished = true;
      if (save) {
        onSave(input.value);
      }
      input.remove();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        finish(true);
        e.preventDefault();
      } else if (e.key === "Escape") {
        finish(false);
        e.preventDefault();
      }
    });

    input.addEventListener("blur", () => {
      finish(true);
    });
  }

  private handlePointerDown(e: MouseEvent) {
    const container = this.chart.chartElement();
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.tools.tool === "pen") {
      const timeScale = this.chart.timeScale();
      const time = timeScale.coordinateToTime(x);
      const logical = timeScale.coordinateToLogical(x);
      const price = this.series.coordinateToPrice(y);
      if (time && price && logical !== null) {
        this.tools.startDrawing(time, price, logical);
        this.update(); // Trigger re-render to show start
        e.preventDefault(); // Stop chart scroll
      }
      return;
    }

    this.isDragging = true;
    this._renderer.onPointerDown(x, y);
  }

  private handlePointerMove(e: MouseEvent) {
    const container = this.chart.chartElement();
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.tools.tool === "pen") {
      const timeScale = this.chart.timeScale();
      const time = timeScale.coordinateToTime(x);
      const logical = timeScale.coordinateToLogical(x);
      const price = this.series.coordinateToPrice(y);
      if (time && price && logical !== null) {
        this.tools.continueDrawing(time, price, logical);
        this.update();
      }
      return;
    }

    if (this.isDragging) {
      this._renderer.onPointerMove(x, y);
      this.syncDragState();
    } else {
      this._renderer.onHover(x, y, this.chart);
    }
  }

  private handlePointerUp() {
    if (this.tools.tool === "pen") {
      this.tools.endDrawing();
      return;
    }

    if (!this.isDragging) return;
    this.isDragging = false;
    this._renderer.onPointerUp();
  }

  private syncDragState() {
    const drag = this._renderer.getDragState();
    if (!drag) {
      this.chart.applyOptions({
        handleScroll: true,
        handleScale: true,
      });
      return;
    }
    this.chart.applyOptions({
      handleScroll: false,
      handleScale: false,
    });
    const renderLine = this._renderer
      .rendererLines()
      .find((l) => l.id === drag.lineId);
    if (!renderLine) return;

    const timeScale = this.chart.timeScale();

    const modelLine = this.tools.lines.find((l) => l.id === drag.lineId);
    if (!modelLine) return;

    // Handle Polyline Sync
    if (renderLine.points && modelLine.points) {
      for (let i = 0; i < renderLine.points.length; i++) {
        if (i >= modelLine.points.length) break;

        const rp = renderLine.points[i];
        const logical = timeScale.coordinateToLogical(rp.x);
        const price = this.series.coordinateToPrice(rp.y);

        if (logical !== null && price !== null) {
          modelLine.points[i].logical = logical as unknown as number; // Store as number
          modelLine.points[i].price = price;

          // Optional: Update time as well if needed for persistence, though logical is primary now
          const time = timeScale.coordinateToTime(rp.x);
          if (time) modelLine.points[i].time = time;
        }
      }
      return;
    }

    const t1 = timeScale.coordinateToTime(renderLine.x1);
    const t2 = timeScale.coordinateToTime(renderLine.x2);
    const p1 = this.series.coordinateToPrice(renderLine.y1);
    const p2 = this.series.coordinateToPrice(renderLine.y2);

    if (t1 == null || t2 == null || p1 == null || p2 == null) return;

    modelLine.p1.time = t1;
    modelLine.p1.price = p1;
    modelLine.p2.time = t2;
    modelLine.p2.price = p2;
  }

  update() {
    const timeScale = this.chart.timeScale();
    const renderLines: RenderLine[] = [];

    for (const line of this.tools.lines) {
      const x1 = timeScale.timeToCoordinate(line.p1.time);
      const x2 = timeScale.timeToCoordinate(line.p2.time);
      const y1 = this.series.priceToCoordinate(line.p1.price);
      const y2 = this.series.priceToCoordinate(line.p2.price);
      const id = line.id;

      if (x1 == null || y1 == null) continue;

      const x2Val = x2 !== null ? x2 : x1;
      const y2Val = y2 !== null ? y2 : y1;

      // Render the main line (interactive)
      const renderObj: RenderLine = {
        id: id,
        x1,
        y1,
        x2: x2Val,
        y2: y2Val,
        preview: line.preview,
        type: line.type,
        text: line.text,
      };

      if (line.type === "measure") {
        const priceDiff = line.p2.price - line.p1.price;
        const pricePct = line.p1.price !== 0 ? (priceDiff / line.p1.price) * 100 : 0;

        const logical1 = timeScale.coordinateToLogical(x1);
        const logical2 = x2 !== null ? timeScale.coordinateToLogical(x2) : logical1;
        const bars = (logical1 !== null && logical2 !== null) ? Math.abs(logical2 - logical1) : 0;

        const d1 = timeToDate(line.p1.time);
        const d2 = timeToDate(line.p2.time);
        const duration = getDurationString(d1, d2);

        renderObj.measureLabel = {
          priceChange: `${priceDiff >= 0 ? "+" : ""}${priceDiff.toFixed(2)} (${priceDiff >= 0 ? "+" : ""}${pricePct.toFixed(2)}%)`,
          bars: `${bars} bar${bars !== 1 ? "s" : ""}`,
          duration,
        };
      }

      if (line.points) {
        renderObj.points = line.points
          .map((p) => {
            let px = null;
            if (p.logical !== undefined) {
              px = timeScale.logicalToCoordinate(
                p.logical as unknown as Logical
              );
            } else {
              px = timeScale.timeToCoordinate(p.time);
            }

            const py = this.series.priceToCoordinate(p.price);
            return px !== null && py !== null
              ? { x: px as number, y: py as number }
              : null;
          })
          .filter((p): p is { x: number; y: number } => p !== null);
      }

      renderLines.push(renderObj);

      // If it's a Fibonacci tool, render the levels
      if (line.type === "fib") {
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const colors: Record<number, string> = {
          0: "#787b86",
          0.236: "#f23645",
          0.382: "#ff9800",
          0.5: "#4caf50",
          0.618: "#089981",
          0.786: "#2962ff",
          1: "#787b86",
        };

        const priceDiff = line.p2.price - line.p1.price;

        for (const level of levels) {
          const levelPrice = line.p1.price + priceDiff * level;
          const levelY = this.series.priceToCoordinate(levelPrice);
          if (levelY === null) continue;

          renderLines.push({
            id: `${id}-fib-${level}`, // unique ID for renderer
            x1,
            y1: levelY,
            x2: x2Val,
            y2: levelY,
            preview: line.preview,
            interaction: false, // Not interactive
            color: colors[level] || "#787b86",
            label: `${level} (${levelPrice.toFixed(2)})`,
            textColor: colors[level] || "#787b86",
          });
        }
      }
    }

    this._renderer.update(renderLines);
  }

  setOptions(options?: DrawingPluginOptions) {
    if (options) this._renderer.setOptions(options);
  }

  setCursor(cursor: string) {
    const container = this.chart.chartElement();

    // Lightweight Charts renders one or more canvas elements
    const canvases = container.querySelectorAll("canvas");

    canvases.forEach((c) => {
      (c as HTMLCanvasElement).style.cursor = cursor;
    });
  }

  renderer() {
    return this._renderer;
  }
}
