import { LineSeries, createChart } from "lightweight-charts";
import { generateLineData } from "../sample-data";
import { DrawingPlugin } from "../drawing-plugin";

const chart = ((window as unknown as any).chart = createChart("chart", {
  autoSize: true,
}));

const lineSeries = chart.addSeries(LineSeries, {
  color: "#000000",
});
const data = generateLineData();
lineSeries.setData(data);

lineSeries.attachPrimitive(new DrawingPlugin());
