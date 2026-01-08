import {
	Coordinate,
	IPrimitivePaneView,
	PrimitivePaneViewZOrder,
} from 'lightweight-charts';
import { DrawingToolsAxisPaneRenderer } from './axis-pane-renderer';
import { DrawingToolsDataSource } from './data-source';

abstract class DrawingToolsAxisPaneView implements IPrimitivePaneView {
	_source: DrawingToolsDataSource;
	_p1: number | null = null;
	_p2: number | null = null;
	_vertical: boolean = false;

	constructor(source: DrawingToolsDataSource, vertical: boolean) {
		this._source = source;
		this._vertical = vertical;
	}

	abstract getPoints(): [Coordinate | null, Coordinate | null];

	update() {
		[this._p1, this._p2] = this.getPoints();
	}

	renderer() {
		return new DrawingToolsAxisPaneRenderer(
			this._p1,
			this._p2,
			this._source.options.fillColor,
			this._vertical
		);
	}
	zOrder(): PrimitivePaneViewZOrder {
		return 'bottom';
	}
}

export class DrawingToolsPriceAxisPaneView extends DrawingToolsAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(this._source.p1.price);
		const y2 = series.priceToCoordinate(this._source.p2.price);
		return [y1, y2];
	}
}

export class DrawingToolsTimeAxisPaneView extends DrawingToolsAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source.p1.time);
		const x2 = timeScale.timeToCoordinate(this._source.p2.time);
		return [x1, x2];
	}
}
