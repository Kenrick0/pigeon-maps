import type React from "react";
import type { ReactElement } from "react";

/** @description `[latitude, longitude]` */
export type Point = [number, number];

/** @description `{ ne: [latitude, longitude], sw: [latitude, longitude] }` */
export interface Bounds {
	ne: [number, number];
	sw: [number, number];
}

/**
 * Properties for configuring the behavior and appearance of a map component.
 */
export interface MapProps {
	/**
	 * Coordinates to programmatically move the map center to.
	 */
	goToCenter?: Point;

	/**
	 * Initial center coordinates of the map.
	 */
	defaultCenter?: Point;

	/**
	 * Zoom level to programmatically set on the map.
	 */
	goToZoom?: number;

	/**
	 * Initial zoom level of the map.
	 */
	defaultZoom?: number;

	/**
	 * Width of the map in pixels.
	 */
	width?: number;

	/**
	 * Default width of the map in pixels.
	 */
	defaultWidth?: number;

	/**
	 * Height of the map in pixels.
	 */
	height?: number;

	/**
	 * Default height of the map in pixels.
	 */
	defaultHeight?: number;

	/**
	 * Function to provide tile URLs based on x, y, zoom coordinates and optional device pixel ratio (dpr).
	 */
	provider?: (x: number, y: number, z: number, dpr?: number) => string;

	/**
	 * Array of supported device pixel ratios (dprs) for tile rendering.
	 */
	dprs?: number[];

	/**
	 * React children to render inside the map.
	 */
	children?: React.ReactNode;

	/**
	 * Whether to enable animations for map transitions.
	 */
	animate?: boolean;

	/**
	 * Whether to animate the map when certain props change.
	 */
	animateOnPropChange?: boolean;

	/**
	 * Minimum zoom level allowed on the map.
	 */
	minZoom?: number;

	/**
	 * Maximum zoom level allowed on the map.
	 */
	maxZoom?: number;

	/**
	 * Enable zooming with the meta (or control) key and mouse wheel.
	 */
	metaWheelZoom?: boolean;

	/**
	 * Warning message displayed when metaWheelZoom is enabled.
	 */
	metaWheelZoomWarning?: string;

	/**
	 * Enable dragging with two fingers on touch devices.
	 */
	twoFingerDrag?: boolean;

	/**
	 * Warning message displayed when twoFingerDrag is enabled.
	 */
	twoFingerDragWarning?: string;

	/**
	 * Z-index of the warning messages.
	 */
	warningZIndex?: number;

	/**
	 * Attribution content to display on the map, or `false` to disable it.
	 */
	attribution?: ReactElement | false;

	/**
	 * Prefix content for the attribution, or `false` to disable it.
	 */
	attributionPrefix?: ReactElement | false;

	/**
	 * Enable snapping to zoom levels when zooming.
	 */
	enableZoomSnap?: boolean;

	/**
	 * Enable mouse event handling on the map.
	 */
	enableMouseEvents?: boolean;

	/**
	 * Enable touch event handling on the map.
	 */
	enableTouchEvents?: boolean;

	/**
	 * Callback triggered when the map is clicked.
	 * @param event - The mouse event.
	 * @param latLng - The latitude and longitude of the clicked point.
	 * @param pixel - The pixel coordinates of the clicked point.
	 */
	onClick?: ({
		event,
		latLng,
		pixel,
	}: {
		event: MouseEvent;
		latLng: [number, number];
		pixel: [number, number];
	}) => void;

	/**
	 * Callback triggered when the map bounds or zoom level change.
	 * @param center - The new center coordinates of the map.
	 * @param bounds - The new bounds of the map.
	 * @param zoom - The new zoom level of the map.
	 * @param initial - Whether this is the initial bounds change.
	 * @param isAnimating - Whether the map is currently animating.
	 */
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

	/**
	 * Callback triggered when a map animation starts.
	 */
	onAnimationStart?: () => void;

	/**
	 * Callback triggered when a map animation stops.
	 */
	onAnimationStop?: () => void;

	/**
	 * Callback triggered when a user interaction starts (e.g. dragging, zooming).
	 */
	onUserInteractionStart?: () => void;

	/**
	 * CSS class name for the map container.
	 */
	boxClassname?: string;

	/**
	 * Custom component to render map tiles.
	 */
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

export interface MapApi {
	latLngToPixel: (latLng: Point, center?: Point, zoom?: number) => Point;
	pixelToLatLng: (pixel: Point, center?: Point, zoom?: number) => Point;
	setCenterZoomTarget: (
		center: Point,
		zoom: number,
		zoomAroundPixel?: Point,
		animate?: boolean,
		animationDuration?: number,
	) => void;
	mapProps: MapProps;
	mapState: MapState;
}
