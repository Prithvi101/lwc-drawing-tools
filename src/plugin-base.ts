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
    el.style.top = `${this.options?.toolBoxOffset?.y ?? 100}px`;
    el.style.left = `${this.options?.toolBoxOffset?.x ?? 10}px`;
    el.style.zIndex = "9999999";

    el.className = "lwc-toolbox";

    el.innerHTML = `
  <button data-tool="move" class="tool-btn" id="move-button">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#2252cc" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    </svg>
  </button>

  <button data-tool="trendline" class="tool-btn" id="trendline-button">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#2252cc">
      <line x1="4" y1="18" x2="18" y2="6"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="4" cy="18" r="2" fill="currentColor" />
      <circle cx="18" cy="6" r="2" fill="currentColor" />
    </svg>
  </button>

  <button data-tool="remover" class="tool-btn" id="remover-button">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#2252cc">
      <path d="M3 6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M8 6V4H16V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path d="M6 6L7 20H17L18 6" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
      <path d="M10 11V17M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
  </button>
`;

    const style = document.createElement("style");
    style.textContent = `
.lwc-toolbox {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;

  background: #020817;
  border: 1px solid #1e222d;
  border-radius: 12px;

  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.6),
    inset 0 0 0 1px rgba(255,255,255,0.02);
}

.tool-btn {
  width: 40px;
  height: 40px;

  border: 1px solid #1e222d;
  background: #2252cc;
  border-radius: 10px;

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  color: #cfd3dc;

  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    color 0.15s ease;
}

.tool-btn:hover {
  background: #1f2430;
  color: #ffffff;
}

.tool-btn.active {
  background: #1e2a3a;
  border-color: #2252cc;
  color: #ffffff;

  box-shadow:
    0 0 0 1px rgba(32,108,237,0.6),
    0 4px 12px rgba(32,108,237,0.35);
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

      this.chart.applyOptions({
        handleScroll: tool === "move",
        handleScale: tool === "move",
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

      switch (tool) {
        case "trendline":
          this.setCursor("crosshair");
          break;
        case "remover":
          this.setCursor("pointer");
          break;
        default:
          break;
      }

      this.chart.applyOptions({
        handleScroll: tool === "move",
        handleScale: tool === "move",
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

      this.tools.onClick(param.time, price, this.chart);

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
