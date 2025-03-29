import type React from "react";
import type { ReactElement } from "react";

/** @description `[latitude, longitude]` */
export type Point = [number, number];

/** @description `{ ne: [latitude, longitude], sw: [latitude, longitude] }` */
export interface Bounds {
	ne: [number, number];
	sw: [number, number];
}

export interface MapProps {
	goToCenter?: Point;
	defaultCenter?: Point;

	goToZoom?: number;
	defaultZoom?: number;

	width?: number;
	defaultWidth?: number;

	height?: number;
	defaultHeight?: number;

	provider?: (x: number, y: number, z: number, dpr?: number) => string;
	dprs?: number[];
	children?: React.ReactNode;

	animate?: boolean;
	animateOnPropChange?: boolean;

	minZoom?: number;
	maxZoom?: number;

	metaWheelZoom?: boolean;
	metaWheelZoomWarning?: string;
	twoFingerDrag?: boolean;
	twoFingerDragWarning?: string;
	warningZIndex?: number;

	attribution?: ReactElement | false;
	attributionPrefix?: ReactElement | false;

	enableZoomSnap?: boolean;
	enableMouseEvents?: boolean;
	enableTouchEvents?: boolean;

	onClick?: ({
		event,
		latLng,
		pixel,
	}: {
		event: MouseEvent;
		latLng: [number, number];
		pixel: [number, number];
	}) => void;
	onBoundsChanged?: ({
		center,
		zoom,
		bounds,
		initial,
		isAnimating,
	}: {
		center: [number, number];
		bounds: Bounds;
		zoom: number;
		initial: boolean;
		isAnimating: boolean;
	}) => void;
	onAnimationStart?: () => void;
	onAnimationStop?: () => void;

	boxClassname?: string;
	tileComponent?: TileComponent;
}

export type TileComponent = (props: TileComponentProps) => ReactElement;

export interface TileComponentProps {
	tile: Tile;
	onTileLoaded: () => void;
}

export interface Tile {
	key: string;
	url: string;
	srcSet: string;
	left: number;
	top: number;
	width: number;
	height: number;
	active: boolean;
}

export interface TileValues {
	tileMinX: number;
	tileMaxX: number;
	tileMinY: number;
	tileMaxY: number;
	tileCenterX: number;
	tileCenterY: number;
	roundedZoom: number;
	scaleWidth: number;
	scaleHeight: number;
	scale: number;
}

export type WarningType = "fingers" | "wheel";

export interface MoveEvent {
	timestamp: number;
	coords: Point;
}

export interface MapReactState {
	zoom: number;
	center: Point;
	width: number;
	height: number;
	oldTiles: TileValues[];
	showWarning: boolean;
	warningType?: WarningType;
}

export interface MapState {
	bounds: Bounds;
	zoom: number;
	center: Point;
	width: number;
	height: number;
}

export interface PigeonProps {
	anchor?: Point;
	offset?: Point;
	left?: number;
	top?: number;
	mapState?: MapState;
	mapProps?: MapProps;

	// pigeon functions
	latLngToPixel?: (latLng: Point, center?: Point, zoom?: number) => Point;
	pixelToLatLng?: (pixel: Point, center?: Point, zoom?: number) => Point;
	setCenterZoom?: (
		center: Point | null,
		zoom: number,
		zoomAround?: Point | null,
		animationDuration?: number,
	) => void;
}

export interface MapApi {
	latLngToPixel: (latLng: Point, center?: Point, zoom?: number) => Point;
	pixelToLatLng: (pixel: Point, center?: Point, zoom?: number) => Point;
	setCenterZoom: (center: Point | null, zoom: number, animationEnded?: boolean) => void;
	mapProps: MapProps;
	mapState: MapState;
}
