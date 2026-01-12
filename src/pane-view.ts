import { IChartApi, IPrimitivePaneView, ISeriesApi } from "lightweight-charts";
import { PaneRenderer, RenderLine } from "./pane-renderer";
import { DrawingTools } from "./drawing-tools";

export class PaneView implements IPrimitivePaneView {
  private _renderer: PaneRenderer;

  constructor(
    private chart: IChartApi,
    private series: ISeriesApi<any>,
    private tools: DrawingTools
  ) {
    this._renderer = new PaneRenderer();
  }

  update() {
    const timeScale = this.chart.timeScale();
    const renderLines: RenderLine[] = [];

    for (const line of this.tools.lines) {
      const x1 = timeScale.timeToCoordinate(line.p1.time);
      const x2 = timeScale.timeToCoordinate(line.p2.time);
      const y1 = this.series.priceToCoordinate(line.p1.price);
      const y2 = this.series.priceToCoordinate(line.p2.price);

      if (x1 == null || x2 == null || y1 == null || y2 == null) continue;

      renderLines.push({
        x1,
        y1,
        x2,
        y2,
        preview: line.preview,
      });
    }

    this._renderer.update(renderLines);
  }

  renderer() {
    return this._renderer;
  }
}
