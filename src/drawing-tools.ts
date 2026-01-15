import { IChartApi, Time } from "lightweight-charts";
import { nanoid } from "nanoid";

export type ToolType = "move" | "trendline" | "fibonacci" | "pen" | "remover";

export interface Line {
  id: string;
  p1: { time: Time; price: number };
  p2: { time: Time; price: number };
  preview?: boolean;
  type?: "line" | "fib" | "pen";
  points?: { time: Time; price: number; logical?: number }[];
}

export class DrawingTools {
  private activeTool: ToolType = "move";
  private startPoint: Line["p1"] | null = null;
  private currentDrawingId: string | null = null;
  public lines: Line[] = [];

  get tool() {
    return this.activeTool;
  }

  setTool(tool: ToolType) {
    this.activeTool = tool;
    this.lines = this.lines.filter((l) => !l.preview);
    document
      .querySelectorAll(".tool-btn")
      .forEach((b) => b.classList.toggle("active", b.id === tool + "-button"));
  }

  onClick(time: Time, price: number, chart: IChartApi) {
    if (this.activeTool === "pen") return; // Pen is handled by drag

    switch (this.activeTool) {
      case "trendline":
      case "fibonacci":
        if (!this.startPoint) {
          this.startPoint = { time, price };
          return;
        }
        this.lines = this.lines.filter((l) => !l.preview);
        this.lines.push({
          id: nanoid(),
          p1: this.startPoint,
          p2: { time, price },
          type: this.activeTool === "fibonacci" ? "fib" : "line",
        });
        // this.setTool("move");
        chart.applyOptions({
          handleScroll: true,
          handleScale: true,
        });
        this.startPoint = null;
        break;
      default:
        break;
    }
  }

  onMove(time: Time, price: number) {
    if (this.activeTool === "pen") return;
    if (!this.startPoint) return;
    this.lines = this.lines.filter((l) => !l.preview);
    this.lines.push({
      id: "preview",
      p1: this.startPoint,
      p2: { time, price },
      preview: true,
      type: this.activeTool === "fibonacci" ? "fib" : "line",
    });
  }

  // Pen Tool Methods
  startDrawing(time: Time, price: number, logical: number) {
    if (this.activeTool !== "pen") return;
    const id = nanoid();
    this.currentDrawingId = id;
    this.lines.push({
      id,
      p1: { time, price }, // Start point (also first point in path)
      p2: { time, price }, // End point (will be updated)
      type: "pen",
      points: [{ time, price, logical }],
    });
  }

  continueDrawing(time: Time, price: number, logical: number) {
    if (this.activeTool !== "pen" || !this.currentDrawingId) return;
    const line = this.lines.find((l) => l.id === this.currentDrawingId);
    if (!line || !line.points) return;

    line.points.push({ time, price, logical });
    line.p2 = { time, price }; // Keep p2 updated as the last point
  }

  endDrawing() {
    if (this.activeTool !== "pen") return;
    this.currentDrawingId = null;
  }

  removeLine(id: string) {
    this.lines = this.lines.filter((l) => l.id !== id);
  }
}
