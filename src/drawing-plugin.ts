import { PluginBase } from "./plugin-base";
import { DrawingPluginOptions } from "./type";

export class DrawingPlugin extends PluginBase {
  constructor(options?: DrawingPluginOptions) {
    super();
    if (options) {
      this.options = options;
    }
  }
}
