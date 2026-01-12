import { Time } from "lightweight-charts";

export type ToolType = "none" | "trendline";

export interface Line {
  p1: { time: Time; price: number };
  p2: { time: Time; price: number };
  preview?: boolean;
}

export class DrawingTools {
  private activeTool: ToolType = "none";
  private startPoint: Line["p1"] | null = null;
  public lines: Line[] = [];

  setTool(tool: ToolType) {
    this.activeTool = tool;
    this.startPoint = null;
    this.lines = this.lines.filter((l) => !l.preview);
  }

  onClick(time: Time, price: number) {
    if (this.activeTool !== "trendline") return;
    if (!this.startPoint) {
      this.startPoint = { time, price };
      return;
    }
    this.lines = this.lines.filter((l) => !l.preview);

    this.lines.push({
      p1: this.startPoint,
      p2: { time, price },
    });

    this.startPoint = null;
  }
  onMove(time: Time, price: number) {
    if (!this.startPoint) return;
    this.lines = this.lines.filter((l) => !l.preview);
    this.lines.push({
      p1: this.startPoint,
      p2: { time, price },
      preview: true,
    });
  }
}
