import { LineSeries, createChart } from "lightweight-charts";
import { generateLineData } from "../sample-data";
import { DrawingPlugin } from "../drawing-plugin";
import { DrawingPluginOptions } from "../type";

const DEFAULT_OPTIONS: Required<DrawingPluginOptions> = {
  color: "rgba(32, 108, 237, 1)",
  lineWidth: 2,
  showEndpoints: true,
  toolBoxOffset: { x: 0, y: 10 },
};
const chart = ((window as unknown as any).chart = createChart("chart", {
  autoSize: true,
}));

const lineSeries = chart.addSeries(LineSeries, {
  color: "#000000",
});
const data = generateLineData();
lineSeries.setData(data);
const drawingTools = new DrawingPlugin(DEFAULT_OPTIONS);
lineSeries.attachPrimitive(drawingTools);
let attatched = true;
const toggle = document.getElementById("toggle") as HTMLButtonElement;
toggle.addEventListener("click", () => {
  if (attatched) {
    lineSeries.detachPrimitive(drawingTools);
    attatched = false;
    return;
  }
  lineSeries.attachPrimitive(drawingTools);
  attatched = true;
});
