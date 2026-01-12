import { Time } from "lightweight-charts";
import { nanoid } from "nanoid";

export type ToolType = "none" | "trendline" | "remover";

export interface Line {
  id: string;
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
    this.setTool("remover");

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
