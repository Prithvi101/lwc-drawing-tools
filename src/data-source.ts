import {
	IChartApi,
	ISeriesApi,
	SeriesOptionsMap,
	Time,
} from 'lightweight-charts';
import { DrawingToolsOptions } from './options';

export interface Point {
	time: Time;
	price: number;
}

export interface DrawingToolsDataSource {
	chart: IChartApi;
	series: ISeriesApi<keyof SeriesOptionsMap>;
	options: DrawingToolsOptions;
	p1: Point;
	p2: Point;
}
