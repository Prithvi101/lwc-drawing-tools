import { IChartApi, IPrimitivePaneView, ISeriesApi } from "lightweight-charts";
import { PaneRenderer, RenderLine } from "./pane-renderer";
import { DrawingTools } from "./drawing-tools";
import { DrawingPluginOptions } from "./type";

export class PaneView implements IPrimitivePaneView {
  private _renderer: PaneRenderer;

  constructor(
    private chart: IChartApi,
    private series: ISeriesApi<any>,
    private tools: DrawingTools
  ) {
    this._renderer = new PaneRenderer();

    chart.subscribeCrosshairMove((param) => {
      if (!param.point) return;
      this._renderer?.onHover(param.point.x, param.point.y, chart);
      chart.timeScale().fitContent();
    });

    chart.subscribeClick((param) => {
      if (!param.point) return;
      this._renderer?.onClick(param.point.x, param.point.y);
      chart.timeScale().fitContent();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault(); // 🔴 REQUIRED
        const selected = this._renderer?.getSelected();
        this.tools.lines = this.tools.lines.filter((l) => l.id !== selected);
        chart.timeScale().fitContent();
      }
    });

    const container = this.chart.chartElement();
    let isDragging = false;

    /* ======================
   POINTER DOWN
   ====================== */
    container.addEventListener("mousedown", (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      isDragging = true;
      this._renderer.onPointerDown(x, y);
    });

    /* ======================
   POINTER MOVE
   ====================== */
    container.addEventListener("mousemove", (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isDragging) {
        // 🔑 Preview follows cursor
        this._renderer.onPointerMove(x, y);

        // 🔑 Persist absolute position into model
        const drag = this._renderer.getDragState();
        if (!drag) return;

        const renderLine = this._renderer
          .rendererLines()
          .find((l) => l.id === drag.lineId);
        if (!renderLine) return;

        const timeScale = this.chart.timeScale();

        const t1 = timeScale.coordinateToTime(renderLine.x1);
        const t2 = timeScale.coordinateToTime(renderLine.x2);
        const p1 = this.series.coordinateToPrice(renderLine.y1);
        const p2 = this.series.coordinateToPrice(renderLine.y2);

        if (t1 == null || t2 == null || p1 == null || p2 == null) return;

        const modelLine = this.tools.lines.find((l) => l.id === drag.lineId);
        if (!modelLine) return;

        modelLine.p1.time = t1;
        modelLine.p1.price = p1;
        modelLine.p2.time = t2;
        modelLine.p2.price = p2;
      } else {
        this._renderer.onHover(x, y, this.chart);
      }
    });

    /* ======================
   POINTER UP
   ====================== */
    window.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      this._renderer.onPointerUp();
    });
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

      if (x1 == null || x2 == null || y1 == null || y2 == null) continue;

      renderLines.push({
        id: id,
        x1,
        y1,
        x2,
        y2,
        preview: line.preview,
      });
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
