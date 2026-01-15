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
    this.unBindEvents();
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
  <button data-tool="move" class="tool-btn" id="move-button" title="Move">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#2252cc" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    </svg>
  </button>

  <button data-tool="trendline" class="tool-btn" id="trendline-button" title="Trendline">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#2252cc">
      <line x1="4" y1="18" x2="18" y2="6"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="4" cy="18" r="2" fill="currentColor" />
      <circle cx="18" cy="6" r="2" fill="currentColor" />
    </svg>
  </button>

  <button data-tool="fibonacci" class="tool-btn" id="fibonacci-button" title="Fibonacci Retracement">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="1" y1="20" x2="23" y2="20" />
      <line x1="1" y1="14" x2="23" y2="14" />
      <line x1="1" y1="8" x2="23" y2="8" />
      <line x1="3" y1="2" x2="3" y2="22" />
    </svg>
  </button>

  <button data-tool="pen" class="tool-btn" id="pen-button" title="Pen Tool">
     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
  </button>

  <button data-tool="remover" class="tool-btn" id="remover-button" title="Eraser">
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
        case "fibonacci":
        case "pen":
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
    this.chart.subscribeClick(this.handleClick);
    this.chart.subscribeCrosshairMove(this.handleCrosshairMove);
  }

  private handleClick = (param: any) => {
    if (!param.time || !param.point) return;

    const price = this.series.coordinateToPrice(param.point.y);
    if (price == null) return;

    this.tools.onClick(param.time, price, this.chart);
    this.pane?.update();
    this.requestUpdate();
  };

  private handleCrosshairMove = (param: any) => {
    if (!param.time || !param.point) return;

    const price = this.series.coordinateToPrice(param.point.y);
    if (price == null) return;

    this.tools.onMove(param.time, price);
    this.pane?.update();
    this.requestUpdate();
  };

  private unBindEvents() {
    this.chart.unsubscribeClick(this.handleClick);
    this.chart.unsubscribeCrosshairMove(this.handleCrosshairMove);
  }
}
