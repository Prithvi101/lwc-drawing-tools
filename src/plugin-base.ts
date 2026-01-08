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

export abstract class PluginBase implements ISeriesPrimitive<Time> {
  private _chart?: IChartApi;
  private _series?: ISeriesApi<keyof SeriesOptionsMap>;
  private _requestUpdate?: () => void;

  protected tools = new DrawingTools();
  private pane: PaneView | null = null;
  private toolbox?: HTMLDivElement;

  protected requestUpdate() {
    this._requestUpdate?.();
  }

  attached({ chart, series, requestUpdate }: SeriesAttachedParameter<Time>) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;

    this.pane = new PaneView(chart, series, this.tools);

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
      <button data-tool="trendline">📈</button>
      <button data-tool="none">✖</button>
    `;

    el.onclick = (e) => {
      const btn = (e.target as HTMLElement).closest("button");
      if (!btn) return;

      const tool = btn.dataset.tool as any;
      this.tools.setTool(tool);

      this.chart.applyOptions({
        handleScroll: tool === "none",
        handleScale: tool === "none",
      });
    };

    container.appendChild(el);
    this.toolbox = el;
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
