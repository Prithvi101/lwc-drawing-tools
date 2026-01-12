import { IChartApi, Time } from "lightweight-charts";
import { nanoid } from "nanoid";

export type ToolType = "move" | "trendline" | "remover";

export interface Line {
  id: string;
  p1: { time: Time; price: number };
  p2: { time: Time; price: number };
  preview?: boolean;
}

export class DrawingTools {
  private activeTool: ToolType = "move";
  private startPoint: Line["p1"] | null = null;
  public lines: Line[] = [];

  setTool(tool: ToolType) {
    this.activeTool = tool;
    console.log(tool);
    this.startPoint = null;
    this.lines = this.lines.filter((l) => !l.preview);

    document
      .querySelectorAll(".tool-btn")
      .forEach((b) => b.classList.toggle("active", b.id === tool + "-button"));
  }

  onClick(time: Time, price: number, chart: IChartApi) {
    if (this.activeTool === "remover") {
    }
    if (this.activeTool !== "trendline") return;
    if (!this.startPoint) {
      this.startPoint = { time, price };
      return;
    }
    this.lines = this.lines.filter((l) => !l.preview);

    this.lines.push({
      id: nanoid(),
      p1: this.startPoint,
      p2: { time, price },
    });
    this.setTool("move");
    chart.applyOptions({
      handleScroll: true,
      handleScale: true,
    });
    this.startPoint = null;
  }

  onMove(time: Time, price: number) {
    if (!this.startPoint) return;
    this.lines = this.lines.filter((l) => !l.preview);
    this.lines.push({
      id: "preview",
      p1: this.startPoint,
      p2: { time, price },
      preview: true,
    });
  }
}
