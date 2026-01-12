import {
  IChartApi,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  SeriesOptionsMap,
  Time,
} from "lightweight-charts";
import { DrawingTools } from "./drawing-tools";
import { PaneView } from "./pane-view";
import { ensureDefined } from "./helpers/assertions";
import { DrawingPluginOptions } from "./type";

export abstract class PluginBase implements ISeriesPrimitive<Time> {
  private _chart?: IChartApi;
  private _series?: ISeriesApi<keyof SeriesOptionsMap>;
  private _requestUpdate?: () => void;

  protected tools = new DrawingTools();
  protected pane: PaneView | null = null;
  private toolbox?: HTMLDivElement;
  public options?: DrawingPluginOptions;

  protected requestUpdate() {
    this._requestUpdate?.();
  }

  attached({ chart, series, requestUpdate }: SeriesAttachedParameter<Time>) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;

    this.pane = new PaneView(chart, series, this.tools);
    this.pane.setOptions(this.options);
    this.mountToolbox();
    this.bindEvents();
    this.requestUpdate();
  }

  detached() {
    this.toolbox?.remove();
    this.toolbox = undefined;
    this.pane = null;
  }

  paneViews() {
    return this.pane ? [this.pane] : [];
  }

  protected get chart() {
    return ensureDefined(this._chart);
  }

  protected get series() {
    return ensureDefined(this._series);
  }

  // --------------------

  private mountToolbox() {
    const container = this.chart.chartElement();
    container.style.position = "relative";

    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.top = "10px";
    el.style.left = "10px";
    el.style.zIndex = "9999";
    el.style.background = "rgba(0,0,0,0.7)";
    el.style.padding = "6px";
    el.style.display = "flex";
    el.style.gap = "6px";
    el.innerHTML = `
  <button data-tool="none" class="tool-btn">
    <!-- Cursor / Crosshair -->
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2V6" stroke="currentColor" stroke-width="2" />
      <path d="M12 18V22" stroke="currentColor" stroke-width="2" />
      <path d="M2 12H6" stroke="currentColor" stroke-width="2" />
      <path d="M18 12H22" stroke="currentColor" stroke-width="2" />
    </svg>
  </button>

  <button data-tool="trendline" class="tool-btn">
    <!-- Trend Line -->
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <line
        x1="4"
        y1="18"
        x2="18"
        y2="6"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
      <circle cx="4" cy="18" r="2" fill="currentColor" />
      <circle cx="18" cy="6" r="2" fill="currentColor" />
    </svg>
  </button>
`;
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.style.gap = "6px";
    el.style.background = "white";
    el.style.padding = "6px";
    el.style.borderRadius = "10px";
    el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)";

    const style = document.createElement("style");
    style.textContent = `
  .tool-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: #ffffff;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #111;
  }

  .tool-btn:hover {
    background: #f2f2f2;
  }

  .tool-btn.active {
    background: #e5e5e5;
  }

  .tool-btn svg {
    pointer-events: none;
  }
`;
    document.head.appendChild(style);

    el.onclick = (e) => {
      const btn = (e.target as HTMLElement).closest("button");
      if (!btn) return;

      const tool = btn.dataset.tool as any;
      this.tools.setTool(tool);

      el.querySelectorAll(".tool-btn").forEach((b) =>
        b.classList.toggle("active", b === btn)
      );

      this.chart.applyOptions({
        handleScroll: tool === "none",
        handleScale: tool === "none",
      });
    };

    el.onclick = (e) => {
      const btn = (e.target as HTMLElement).closest("button");
      if (!btn) return;

      const tool = btn.dataset.tool as any;
      this.tools.setTool(tool);

      // Active button UI
      el.querySelectorAll(".tool-btn").forEach((b) =>
        b.classList.toggle("active", b === btn)
      );

      if (tool === "trendline") {
        this.setCursor("crosshair");
      } else {
        this.setCursor("default");
      }

      this.chart.applyOptions({
        handleScroll: tool === "none",
        handleScale: tool === "none",
      });
    };

    container.appendChild(el);
    this.toolbox = el;
  }

  private setCursor(cursor: string) {
    const container = this.chart.chartElement();

    // Lightweight Charts renders one or more canvas elements
    const canvases = container.querySelectorAll("canvas");

    canvases.forEach((c) => {
      (c as HTMLCanvasElement).style.cursor = cursor;
    });
  }

  private bindEvents() {
    this.chart.subscribeClick((param) => {
      if (!param.time || !param.point) return;

      const price = this.series.coordinateToPrice(param.point.y);
      if (price == null) return;

      this.tools.onClick(param.time, price);
      this.pane?.update();
      this.requestUpdate();
    });

    this.chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) return;

      const price = this.series.coordinateToPrice(param.point.y);
      if (price == null) return;

      this.tools.onMove(param.time, price);
      this.pane?.update();
      this.requestUpdate();
    });
  }
}
