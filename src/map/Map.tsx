import React, { Component } from "react";

import type {
	Bounds,
	MapProps,
	MapApi,
	MapReactState,
	MoveEvent,
	Point,
	Tile,
	TileComponent,
	TileValues,
	WarningType,
} from "../types";
import { osm } from "../providers";

const MapContext = React.createContext(null);

export function useMapApi(): MapApi {
	const map_api = React.useContext(MapContext);
	if (!map_api) {
		throw new Error("MapContext not found, are you inside a <Map>?");
	}
	return map_api;
}

const ANIMATION_TIME = 300;
const SCROLL_PIXELS_FOR_ZOOM_LEVEL = 150;
const MIN_VELOCITY_FOR_THROW = 250;
const TOUCH_THROW_MULTIPLIER = 0.5; // Allow touch to throw further
const MOUSE_THROW_MULTIPLIER = 0.2;
const CLICK_TOLERANCE = 2;
const DOUBLE_CLICK_DELAY = 300;
const PINCH_RELEASE_THROW_DELAY = 300;
const WARNING_DISPLAY_TIMEOUT = 300;

// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
const lng2tile = (lon: number, zoom: number): number => ((lon + 180) / 360) * 2 ** zoom;
const lat2tile = (lat: number, zoom: number): number =>
	((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
		2) *
	2 ** zoom;

function tile2lng(x: number, z: number): number {
	return (x / 2 ** z) * 360 - 180;
}

function tile2lat(y: number, z: number): number {
	const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
	return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function getMousePixel(dom: HTMLElement, event: Pick<MouseEvent, "clientX" | "clientY">): Point {
	const parent = parentPosition(dom);
	return [event.clientX - parent.x, event.clientY - parent.y];
}

const hasWindow = typeof window !== "undefined";

const performanceNow =
	hasWindow && window.performance && window.performance.now
		? () => window.performance.now()
		: (() => {
				const timeStart = new Date().getTime();
				return () => new Date().getTime() - timeStart;
			})();

const requestAnimationFrame = (callback: (timestamp: number) => void): number | null => {
	if (hasWindow) {
		return (window.requestAnimationFrame || window.setTimeout)(callback);
	}
	callback(new Date().getTime());
	return null;
};
const cancelAnimationFrame = (animFrame: number | null) =>
	hasWindow && animFrame ? (window.cancelAnimationFrame || window.clearTimeout)(animFrame) : false;

function parentHasClass(element: HTMLElement, className: string) {
	let currentElement = element;
	while (currentElement) {
		if (currentElement.classList?.contains(className)) {
			return true;
		}
		currentElement = currentElement.parentElement;
	}

	return false;
}

function parentPosition(element: HTMLElement) {
	const rect = element.getBoundingClientRect();
	return { x: rect.left, y: rect.top };
}

// Short names to reduce minified bundle size
const wa = window.addEventListener;
const wr = window.removeEventListener;

const ImgTile: TileComponent = ({ tile, tileLoaded }) => (
	<img
		src={tile.url}
		srcSet={tile.srcSet}
		width={tile.width}
		height={tile.height}
		loading={"lazy"}
		onLoad={tileLoaded}
		alt={""}
		style={{
			position: "absolute",
			left: tile.left,
			top: tile.top,
			willChange: "transform",
			transformOrigin: "top left",
			opacity: 1,
		}}
	/>
);

export class PigeonMap extends Component<MapProps, MapReactState> {
	static defaultProps = {
		animate: true,
		metaWheelZoom: false,
		metaWheelZoomWarning: "Use META + wheel to zoom!",
		twoFingerDrag: false,
		twoFingerDragWarning: "Use two fingers to move the map",
		enableZoomSnap: navigator.maxTouchPoints === 0, // snap by default for non-touch devices
		enableMouseEvents: true,
		enableTouchEvents: true,
		warningZIndex: 100,
		animateMaxScreens: 5,
		minZoom: 1,
		maxZoom: 18,
		dprs: [],
		boxClassname: "pigeon-tiles-box",
		tileComponent: ImgTile,
	};

	_loadTracker?: { [key: string]: boolean };

	_containerRef?: HTMLDivElement;
	_resizeObserver = null;
	_lastMousePosition?: Point;
	_dragStart: Point | null = null;
	_mouseDown = false;
	_moveEvents: MoveEvent[] = [];
	_lastClickTime: number | null = null;
	_lastTapTime: number | null = null;
	_lastWheelTime: number | null = null;
	_touchStartPixel: Point[] | null = null;
	_touchStartZoom: number | null = null;
	_touchLastPixel: Point[] | null = null;
	_touchStartMidPoint: Point | null = null;
	_touchStartDistance: number | null = null;
	_secondTouchEnd: number | null = null;
	_warningClearTimeout: number | null = null;

	_isAnimating = false;
	_animationStartTime: number | null = null;
	_animationDuration: number | null = null;
	_centerStart: Point | null = null;
	_zoomStart: number | null = null;
	_centerTarget: Point | null = null;
	_zoomTarget: number | null = null;
	_zoomAroundPixel: Point | null = null;
	_animFrame: number | null = null;

	constructor(props: MapProps) {
		super(props);

		this.state = {
			zoom: props.defaultZoom ?? props.zoom ?? 14,
			center: props.defaultCenter ?? props.center ?? [0, 0],
			width: props.width ?? props.defaultWidth ?? -1,
			height: props.height ?? props.defaultHeight ?? -1,
			oldTiles: [],
			showWarning: false,
			warningType: undefined,
		};
	}

	componentDidMount(): void {
		this.props.enableMouseEvents && this.bindMouseEvents();
		this.props.enableTouchEvents && this.bindTouchEvents();

		if (!this.props.width || !this.props.height) {
			// A height:100% container div often results in height=0 being returned on mount.
			// So ask again once everything is painted.
			if (!this.updateWidthHeight()) {
				requestAnimationFrame(this.updateWidthHeight);
			}
			this.bindResizeEvent();
		}

		if (typeof window.ResizeObserver !== "undefined") {
			this._resizeObserver = new window.ResizeObserver(() => {
				this.updateWidthHeight();
			});

			this._resizeObserver.observe(this._containerRef);
		}

		// Initial call to onBoundsChanged
		this.props.onBoundsChanged?.({
			center: this.state.center,
			zoom: this.state.zoom,
			bounds: this.getBounds(this.state.center, this.state.zoom),
			initial: true,
			isAnimating: this._isAnimating,
		});
	}

	componentWillUnmount(): void {
		this.props.enableMouseEvents && this.unbindMouseEvents();
		this.props.enableTouchEvents && this.unbindTouchEvents();

		if (!this.props.width || !this.props.height) {
			this.unbindResizeEvent();
		}

		if (this._resizeObserver) {
			this._resizeObserver.disconnect();
		}
	}

	updateWidthHeight = (): boolean => {
		if (this._containerRef) {
			const rect = this._containerRef.getBoundingClientRect();

			if (rect && rect.width > 0 && rect.height > 0) {
				this.setState({
					width: rect.width,
					height: rect.height,
				});
				return true;
			}
		}
		return false;
	};

	bindMouseEvents = (): void => {
		wa("mousedown", this.handleMouseDown);
		wa("mouseup", this.handleMouseUp);
		wa("mousemove", this.handleMouseMove);

		this._containerRef?.addEventListener("wheel", this.handleWheel, {
			passive: false,
		});
	};

	unbindMouseEvents = (): void => {
		wr("mousedown", this.handleMouseDown);
		wr("mouseup", this.handleMouseUp);
		wr("mousemove", this.handleMouseMove);
		this._containerRef?.removeEventListener("wheel", this.handleWheel);
	};

	bindTouchEvents = (): void => {
		wa("touchstart", this.handleTouchStart, { passive: false });
		wa("touchmove", this.handleTouchMove, { passive: false });
		wa("touchend", this.handleTouchEnd, { passive: false });
	};

	unbindTouchEvents = (): void => {
		wr("touchstart", this.handleTouchStart);
		wr("touchmove", this.handleTouchMove);
		wr("touchend", this.handleTouchEnd);
	};

	bindResizeEvent = (): void => {
		wa("resize", this.updateWidthHeight);
	};

	unbindResizeEvent = (): void => {
		wr("resize", this.updateWidthHeight);
	};

	componentDidUpdate(prevProps: MapProps): void {
		if (this.props.enableMouseEvents !== prevProps.enableMouseEvents) {
			this.props.enableMouseEvents ? this.bindMouseEvents() : this.unbindMouseEvents();
		}

		if (this.props.enableTouchEvents !== prevProps.enableTouchEvents) {
			this.props.enableTouchEvents ? this.bindTouchEvents() : this.unbindTouchEvents();
		}

		if (this.props.width && this.props.width !== prevProps.width) {
			this.setState({ width: this.props.width });
		}

		if (this.props.height && this.props.height !== prevProps.height) {
			this.setState({ height: this.props.height });
		}

		if (!this.props.center && !this.props.zoom) {
			// if the user isn't controlling neither zoom nor center we don't have to update.
			return;
		}
		if (
			(!this.props.center ||
				(this.props.center[0] === prevProps?.center?.[0] &&
					this.props.center[1] === prevProps.center[1])) &&
			this.props.zoom === prevProps.zoom
		) {
			// if the user is controlling either zoom or center but nothing changed
			// we don't have to update as well
			return;
		}

		const currentCenter = this._isAnimating ? this._centerTarget : this.state.center;
		const currentZoom = this._isAnimating ? this._zoomTarget : this.state.zoom;

		if (currentCenter && currentZoom) {
			const nextCenter = this.props.center ?? currentCenter;
			const nextZoom = this.props.zoom ?? currentZoom;

			if (
				Math.abs(nextZoom - currentZoom) > 0.001 ||
				Math.abs(nextCenter[0] - currentCenter[0]) > 0.0001 ||
				Math.abs(nextCenter[1] - currentCenter[1]) > 0.0001
			) {
				this.setCenterZoomTarget(nextCenter, nextZoom, null, this.props.animateOnPropChange);
			}
		}
	}

	pixelToLatLng = (pixel: Point, center = this.state.center, zoom = this.state.zoom): Point => {
		const { width, height } = this.state;

		const pointDiff = [(pixel[0] - width / 2) / 256.0, (pixel[1] - height / 2) / 256.0];

		const tileX = lng2tile(center[1], zoom) + pointDiff[0];
		const tileY = lat2tile(center[0], zoom) + pointDiff[1];

		// minLat, maxLat, minLng, maxLng
		const absoluteMinMax = [
			tile2lat(2 ** 10, 10),
			tile2lat(0, 10),
			tile2lng(0, 10),
			tile2lng(2 ** 10, 10),
		];

		return [
			Math.max(absoluteMinMax[0], Math.min(absoluteMinMax[1], tile2lat(tileY, zoom))),
			Math.max(absoluteMinMax[2], Math.min(absoluteMinMax[3], tile2lng(tileX, zoom))),
		] as Point;
	};

	latLngToPixel = (latLng: Point, center = this.state.center, zoom = this.state.zoom): Point => {
		const { width, height } = this.state;

		const tileCenterX = lng2tile(center[1], zoom);
		const tileCenterY = lat2tile(center[0], zoom);

		const tileX = lng2tile(latLng[1], zoom);
		const tileY = lat2tile(latLng[0], zoom);

		return [
			(tileX - tileCenterX) * 256.0 + width / 2,
			(tileY - tileCenterY) * 256.0 + height / 2,
		] as Point;
	};

	calculateZoomCenter = (
		center: Point,
		zoomAroundPixel: Point,
		oldZoom: number,
		newZoom: number,
	): Point => {
		const { width, height } = this.state;

		// zoomAroundPixel is in screen coordinates
		const zoomFactor = 2 ** (newZoom - oldZoom);
		return this.pixelToLatLng(
			[
				width / 2 + (zoomAroundPixel[0] - width / 2) * (zoomFactor - 1),
				height / 2 + (zoomAroundPixel[1] - height / 2) * (zoomFactor - 1),
			],
			center,
			newZoom,
		);
	};

	setPanZoomTarget = (
		panPixelsArg: Point | null = null,
		zoomIncrement: number | null = null,
		zoomAroundPixel: Point | null = null,
		animate = true,
		animationDuration = ANIMATION_TIME,
	) => {
		const { center } = this.state;
		const panPixels = panPixelsArg || [0, 0];
		const zoomRequest = this.state.zoom + zoomIncrement;

		const lng = tile2lng(lng2tile(center[1], zoomRequest) - panPixels[0] / 256.0, zoomRequest);
		const lat = tile2lat(lat2tile(center[0], zoomRequest) - panPixels[1] / 256.0, zoomRequest);
		this.setCenterZoomTarget([lat, lng], zoomRequest, zoomAroundPixel, animate, animationDuration);
	};

	setCenterZoomTarget = (
		center: Point,
		zoomRequest: number,
		zoomAroundPixel: Point | null = null,
		animate = true,
		animationDuration = ANIMATION_TIME,
	): void => {
		// Clip zoom to min/max values
		const { minZoom, maxZoom } = this.props;
		const zoomTarget = Math.max(minZoom, Math.min(zoomRequest, maxZoom));

		let centerTarget = center;
		if (zoomAroundPixel) {
			centerTarget = this.calculateZoomCenter(
				centerTarget,
				zoomAroundPixel,
				this.state.zoom,
				zoomTarget,
			);
		}

		if (this.props.animate && animate) {
			// If overall animation is enabled and animation requested for this specific move
			this._isAnimating = true;
			this._centerTarget = centerTarget;
			this._zoomTarget = zoomTarget;
			this._zoomAroundPixel = zoomAroundPixel;
			this._animationStartTime = null; // flag to start animation on next frame
			this._animationDuration = animationDuration;
			this._animFrame = requestAnimationFrame(this.animate);
		} else {
			// No animation, just set the center and zoom immediately
			this.stopAnimating();
			this.setCenterZoom(centerTarget, zoomTarget);
		}
	};

	animationStep = (timestamp: number): { centerStep: Point; zoomStep: number } => {
		if (
			!this._animationDuration ||
			!this._animationStartTime ||
			!this._zoomTarget ||
			!this._zoomStart ||
			!this._centerStart ||
			!this._centerTarget
		) {
			return {
				centerStep: this.state.center,
				zoomStep: this.state.zoom,
			};
		}
		const progress = Math.max(timestamp - this._animationStartTime, 0);
		const easeOutQuad = (t: number): number => {
			return t * (2 - t);
		};
		const percentage = easeOutQuad(progress / this._animationDuration);

		const zoomStep = this._zoomStart + (this._zoomTarget - this._zoomStart) * percentage;

		if (this._zoomAroundPixel) {
			const centerStep = this.calculateZoomCenter(
				this._centerStart,
				this._zoomAroundPixel,
				this._zoomStart,
				zoomStep,
			);

			return { centerStep, zoomStep };
		}
		const centerStep = [
			this._centerStart[0] + (this._centerTarget[0] - this._centerStart[0]) * percentage,
			this._centerStart[1] + (this._centerTarget[1] - this._centerStart[1]) * percentage,
		] as Point;

		return { centerStep, zoomStep };
	};

	animate = (timestamp: number): void => {
		if (this._animationStartTime === null) {
			// First frame of animation, set the start values
			this._animationStartTime = timestamp;
			this._centerStart = this.state.center;
			this._zoomStart = this.state.zoom;
			this.props.onAnimationStart?.();
			this._animFrame = requestAnimationFrame(this.animate);
		} else if (
			!this._animationDuration ||
			timestamp >= this._animationDuration + this._animationStartTime
		) {
			// End of animation
			this._isAnimating = false;
			this.setCenterZoom(this._centerTarget, this._zoomTarget);
			this.props.onAnimationStop?.();
		} else {
			// Next frame of animation
			const { centerStep, zoomStep } = this.animationStep(timestamp);
			this.setCenterZoom(centerStep, zoomStep);
			this._animFrame = requestAnimationFrame(this.animate);
		}
	};

	stopAnimating = (): void => {
		if (this._isAnimating) {
			this._isAnimating = false;
			this.props.onAnimationStop?.();
			cancelAnimationFrame(this._animFrame);
		}
	};

	limitCenter = (center: Point, zoom: number | null): Point => {
		// Ensure the edges of viewport don't go beyond the edges of the map
		const { width, height } = this.state;

		const centerU = lng2tile(center[1], zoom);
		const centerV = lat2tile(center[0], zoom);
		const widthU = width / 256;
		const heightV = height / 256;
		const maxUV = 2 ** zoom;

		const clippedCenterU =
			widthU > maxUV ? maxUV / 2 : Math.max(widthU / 2, Math.min(maxUV - widthU / 2, centerU));
		const clippedCenterV =
			heightV > maxUV ? maxUV / 2 : Math.max(heightV / 2, Math.min(maxUV - heightV / 2, centerV));

		return [tile2lat(clippedCenterV, zoom), tile2lng(clippedCenterU, zoom)];
	};

	// main logic when changing coordinates
	setCenterZoom = (center: Point, zoom: number): void => {
		const limitedCenter = this.limitCenter(center, zoom);

		const zoomChanged = Math.round(this.state.zoom) !== Math.round(zoom);
		const centerChanged =
			limitedCenter[0] !== this.state.center[0] || limitedCenter[1] !== this.state.center[1];

		// Update tiles if zoom changed
		if (zoomChanged) {
			const tileValues = this.tileValues(this.state);
			const nextValues = this.tileValues({
				center: limitedCenter,
				zoom,
				width: this.state.width,
				height: this.state.height,
			});
			const oldTiles = this.state.oldTiles;

			this.setState({
				oldTiles: oldTiles
					.filter((o) => o.roundedZoom !== tileValues.roundedZoom)
					.concat(tileValues),
			});

			const loadTracker: { [key: string]: boolean } = {};

			for (let x = nextValues.tileMinX; x <= nextValues.tileMaxX; x++) {
				for (let y = nextValues.tileMinY; y <= nextValues.tileMaxY; y++) {
					const key = `${x}-${y}-${nextValues.roundedZoom}`;
					loadTracker[key] = false;
				}
			}

			this._loadTracker = loadTracker;
		}

		// Apply center and zoom if it's different
		if (zoomChanged || centerChanged) {
			this.setState({ center: limitedCenter, zoom: zoom });

			// Call onBoundsChanged callback if it's defined
			this.props.onBoundsChanged?.({
				center: limitedCenter,
				zoom,
				bounds: this.getBounds(limitedCenter, zoom),
				initial: false,
				isAnimating: this._isAnimating,
			});
		}
	};

	tileLoaded = (key: string): void => {
		if (this._loadTracker && key in this._loadTracker) {
			this._loadTracker[key] = true;

			const unloadedCount = Object.values(this._loadTracker).filter((v) => !v).length;

			if (unloadedCount === 0) {
				this.setState({ oldTiles: [] });
			}
		}
	};

	coordsInside(pixel: Point): boolean {
		const { width, height } = this.state;

		if (pixel[0] < 0 || pixel[1] < 0 || pixel[0] >= width || pixel[1] >= height) {
			return false;
		}

		const parent = this._containerRef;
		if (parent) {
			const pos = parentPosition(parent);
			const element = document.elementFromPoint(pixel[0] + pos.x, pixel[1] + pos.y);

			return parent === element || parent.contains(element);
		}
		return false;
	}

	handleTouchStart = (event: TouchEvent): void => {
		if (!this._containerRef) {
			return;
		}
		if (event.target && parentHasClass(event.target as HTMLElement, "pigeon-drag-block")) {
			return;
		}
		if (event.touches.length === 1) {
			const touch = event.touches[0];
			const pixel = getMousePixel(this._containerRef, touch);

			if (this.coordsInside(pixel)) {
				this._touchStartPixel = [pixel];
				this._touchLastPixel = [pixel];

				if (!this.props.twoFingerDrag) {
					this.stopAnimating();

					if (this._lastTapTime && performanceNow() - this._lastTapTime < DOUBLE_CLICK_DELAY) {
						event.preventDefault();
						this.setPanZoomTarget(null, 1, this._touchStartPixel[0]);
					} else {
						this._lastTapTime = performanceNow();
						this.trackMoveEvents(pixel);
					}
				}
			}
			// added second finger and first one was in the area
		} else if (event.touches.length === 2 && this._touchStartPixel) {
			event.preventDefault();

			this.stopTrackingMoveEvents();

			const t1 = getMousePixel(this._containerRef, event.touches[0]);
			const t2 = getMousePixel(this._containerRef, event.touches[1]);

			this._touchStartPixel = [t1, t2];
			this._touchLastPixel = [t1, t2];
			this._touchStartZoom = this.state.zoom;
			this._touchStartMidPoint = [(t1[0] + t2[0]) / 2, (t1[1] + t2[1]) / 2];
			this._touchStartDistance = Math.sqrt((t1[0] - t2[0]) ** 2 + (t1[1] - t2[1]) ** 2);
		}
	};

	handleTouchMove = (event: TouchEvent): void => {
		if (!this._containerRef) {
			this._touchStartPixel = null;
			return;
		}
		if (event.touches.length === 1 && this._touchStartPixel) {
			const touch = event.touches[0];
			const pixel = getMousePixel(this._containerRef, touch);

			if (this.props.twoFingerDrag) {
				if (this.coordsInside(pixel)) {
					this.showWarning("fingers");
				}
			} else {
				event.preventDefault();
				this.trackMoveEvents(pixel);

				const panPixels: Point = [
					pixel[0] - this._touchLastPixel[0][0],
					pixel[1] - this._touchLastPixel[0][1],
				];
				this.setPanZoomTarget(panPixels, null, null, false);
				this._touchLastPixel = [pixel];
			}
		} else if (
			event.touches.length === 2 &&
			this._touchStartPixel &&
			this._touchStartMidPoint &&
			this._touchStartDistance
		) {
			event.preventDefault();

			const t1 = getMousePixel(this._containerRef, event.touches[0]);
			const t2 = getMousePixel(this._containerRef, event.touches[1]);

			const midPoint: Point = [(t1[0] + t2[0]) / 2, (t1[1] + t2[1]) / 2];
			const oldMidPoint = [
				(this._touchLastPixel[0][0] + this._touchLastPixel[1][0]) / 2,
				(this._touchLastPixel[0][1] + this._touchLastPixel[1][1]) / 2,
			];
			const midPointDiff: Point = [midPoint[0] - oldMidPoint[0], midPoint[1] - oldMidPoint[1]];

			const distance = Math.sqrt((t1[0] - t2[0]) ** 2 + (t1[1] - t2[1]) ** 2);

			const oldDistance = Math.sqrt(
				(this._touchLastPixel[0][0] - this._touchLastPixel[1][0]) ** 2 +
					(this._touchLastPixel[0][1] - this._touchLastPixel[1][1]) ** 2,
			);
			const zoomIncrement = Math.log2(distance / oldDistance);

			this.setPanZoomTarget(midPointDiff, zoomIncrement, midPoint, false);
			this._touchLastPixel = [t1, t2];
		}
	};

	handleTouchEnd = (event: TouchEvent): void => {
		if (!this._containerRef) {
			this._touchStartPixel = null;
			return;
		}
		if (this._touchStartPixel) {
			const { enableZoomSnap, twoFingerDrag } = this.props;

			if (event.touches.length === 0) {
				if (twoFingerDrag) {
					this.clearWarning();
				} else {
					// if the click started and ended at about
					// the same place we can view it as a click
					// and not prevent default behavior.
					const oldTouchPixel = this._touchStartPixel[0];
					const newTouchPixel = getMousePixel(this._containerRef, event.changedTouches[0]);

					if (
						Math.abs(oldTouchPixel[0] - newTouchPixel[0]) > CLICK_TOLERANCE ||
						Math.abs(oldTouchPixel[1] - newTouchPixel[1]) > CLICK_TOLERANCE
					) {
						// don't throw immediately after releasing the second finger
						if (
							!this._secondTouchEnd ||
							performanceNow() - this._secondTouchEnd > PINCH_RELEASE_THROW_DELAY
						) {
							event.preventDefault();
							this.throwAfterMoving(newTouchPixel, true);
						}
					}

					this._touchStartPixel = null;
					this._secondTouchEnd = null;
				}
			} else if (event.touches.length === 1) {
				event.preventDefault();
				const pixel = getMousePixel(this._containerRef, event.touches[0]);

				this._secondTouchEnd = performanceNow();
				this._touchStartPixel = [pixel];
				this._touchLastPixel = [pixel];
				this.trackMoveEvents(pixel);

				if (enableZoomSnap) {
					const zoom_around_pixel = this._touchStartMidPoint
						? this._touchStartMidPoint
						: ([this.state.width / 2, this.state.height / 2] as Point);

					let zoomTarget: number;

					// do not zoom up/down if we must drag with 2 fingers and didn't change the zoom level
					if (twoFingerDrag && Math.round(this._touchStartZoom) === Math.round(this.state.zoom)) {
						zoomTarget = Math.round(this.state.zoom);
					} else {
						zoomTarget =
							this.state.zoom > this._touchStartZoom
								? Math.ceil(this.state.zoom)
								: Math.floor(this.state.zoom);
					}

					this.setPanZoomTarget(null, zoomTarget - this.state.zoom, zoom_around_pixel);
				}
			}
		}
	};

	handleMouseDown = (event: MouseEvent): void => {
		if (!this._containerRef) {
			return;
		}
		const pixel = getMousePixel(this._containerRef, event);

		if (
			event.button === 0 &&
			(!event.target || !parentHasClass(event.target as HTMLElement, "pigeon-drag-block")) &&
			this.coordsInside(pixel)
		) {
			this.stopAnimating();
			event.preventDefault();

			if (this._lastClickTime && performanceNow() - this._lastClickTime < DOUBLE_CLICK_DELAY) {
				if (!parentHasClass(event.target as HTMLElement, "pigeon-click-block")) {
					this.setPanZoomTarget(null, 1, pixel);
				}
			} else {
				this._lastClickTime = performanceNow();

				this._mouseDown = true;
				this._dragStart = pixel;
				this.trackMoveEvents(pixel);
			}
		}
	};

	handleMouseMove = (event: MouseEvent): void => {
		if (!this._containerRef) {
			return;
		}
		const newPixel = getMousePixel(this._containerRef, event);

		if (this._mouseDown && this._dragStart) {
			this.trackMoveEvents(this._lastMousePosition);
			const panPixels: Point = [
				newPixel[0] - this._lastMousePosition[0],
				newPixel[1] - this._lastMousePosition[1],
			];
			this.setPanZoomTarget(panPixels, null, null, false);
		}

		this._lastMousePosition = newPixel;
	};

	handleMouseUp = (event: MouseEvent): void => {
		if (!this._containerRef) {
			this._mouseDown = false;
			return;
		}

		if (this._mouseDown) {
			this._mouseDown = false;

			const pixel = getMousePixel(this._containerRef, event);
			const move_distance_pixels = [
				// mouse move distance in pixels
				pixel[0] - this._dragStart[0],
				pixel[1] - this._dragStart[1],
			];

			if (
				this.props.onClick &&
				(!event.target || !parentHasClass(event.target as HTMLElement, "pigeon-click-block")) &&
				(!move_distance_pixels ||
					Math.abs(move_distance_pixels[0]) + Math.abs(move_distance_pixels[1]) <= CLICK_TOLERANCE)
			) {
				const latLng = this.pixelToLatLng(pixel);
				this.props.onClick({ event, latLng, pixel });
			} else {
				this.throwAfterMoving(pixel, false);
			}
		}
	};

	// https://www.bennadel.com/blog/1856-using-jquery-s-animate-step-callback-function-to-create-custom-animations.htm
	stopTrackingMoveEvents = (): void => {
		this._moveEvents = [];
	};

	trackMoveEvents = (coords: Point): void => {
		const timestamp = performanceNow();

		if (
			this._moveEvents.length === 0 ||
			timestamp - this._moveEvents[this._moveEvents.length - 1].timestamp > 40
		) {
			this._moveEvents.push({ timestamp, coords });
			if (this._moveEvents.length > 2) {
				this._moveEvents.shift();
			}
		}
	};

	throwAfterMoving = (coords: Point, throwByTouch: boolean): void => {
		const { animate } = this.props;

		const timestamp = performanceNow();
		const lastEvent = this._moveEvents.shift();

		if (lastEvent && animate) {
			const deltaMs = Math.max(timestamp - lastEvent.timestamp, 1);
			const delta = [
				// Pixels per second
				((coords[0] - lastEvent.coords[0]) / deltaMs) * 1000,
				((coords[1] - lastEvent.coords[1]) / deltaMs) * 1000,
			];

			const velocityMag = Math.sqrt(delta[0] * delta[0] + delta[1] * delta[1]);
			if (velocityMag > MIN_VELOCITY_FOR_THROW) {
				const gain = throwByTouch ? TOUCH_THROW_MULTIPLIER : MOUSE_THROW_MULTIPLIER;
				const throw_time = 800 + velocityMag / 10;
				this.setPanZoomTarget([gain * delta[0], gain * delta[1]], null, null, true, throw_time);
			}
		}

		this.stopTrackingMoveEvents();
	};

	getBounds = (center = this.state.center, zoom = this.state.zoom): Bounds => {
		const { width, height } = this.state;

		return {
			ne: this.pixelToLatLng([width - 1, 0], center, zoom),
			sw: this.pixelToLatLng([0, height - 1], center, zoom),
		};
	};

	handleWheel = (event: WheelEvent): void => {
		const { metaWheelZoom, enableZoomSnap, animate } = this.props;
		if (!this._containerRef) {
			return;
		}

		if (metaWheelZoom && !event.metaKey && !event.ctrlKey) {
			this.showWarning("wheel");
			return;
		}

		event.preventDefault();

		const addToZoom = -event.deltaY / SCROLL_PIXELS_FOR_ZOOM_LEVEL;

		let ammountToZoom = 0;
		if (!enableZoomSnap && this._zoomTarget) {
			const stillToAdd = this._zoomTarget - this.state.zoom;
			ammountToZoom = addToZoom + stillToAdd;
		} else if (
			animate ||
			!this._lastWheelTime ||
			performanceNow() - this._lastWheelTime > ANIMATION_TIME
		) {
			this._lastWheelTime = performanceNow();
			ammountToZoom = addToZoom;
		}

		let newZoom = this.state.zoom + ammountToZoom;
		if (enableZoomSnap) {
			newZoom = ammountToZoom < 0 ? Math.floor(newZoom) : Math.ceil(newZoom);
		}
		newZoom = Math.max(this.props.minZoom, Math.min(this.props.maxZoom, newZoom));
		if (newZoom !== (this._zoomTarget || this.state.zoom)) {
			const pixel = getMousePixel(this._containerRef, event);
			this.setPanZoomTarget(null, newZoom - this.state.zoom, pixel);
		}
	};

	showWarning = (warningType: WarningType): void => {
		if (!this.state.showWarning || this.state.warningType !== warningType) {
			this.setState({ showWarning: true, warningType });
		}

		if (this._warningClearTimeout) {
			window.clearTimeout(this._warningClearTimeout);
		}
		this._warningClearTimeout = window.setTimeout(this.clearWarning, WARNING_DISPLAY_TIMEOUT);
	};

	clearWarning = (): void => {
		if (this.state.showWarning) {
			this.setState({ showWarning: false });
		}
	};

	// ref

	setRef = (dom: HTMLDivElement) => {
		this._containerRef = dom;
	};

	tileValues({
		center,
		zoom,
		width,
		height,
	}: {
		center: Point;
		zoom: number;
		width: number;
		height: number;
	}): TileValues {
		// data to display the tiles
		const roundedZoom = Math.round(zoom);

		const scale = 2 ** (zoom - roundedZoom);
		const scaleWidth = width / scale;
		const scaleHeight = height / scale;

		const tileCenterX = lng2tile(center[1], roundedZoom);
		const tileCenterY = lat2tile(center[0], roundedZoom);

		const halfWidth = scaleWidth / 2 / 256.0;
		const halfHeight = scaleHeight / 2 / 256.0;

		return {
			tileMinX: Math.floor(tileCenterX - halfWidth),
			tileMaxX: Math.floor(tileCenterX + halfWidth),
			tileMinY: Math.floor(tileCenterY - halfHeight),
			tileMaxY: Math.floor(tileCenterY + halfHeight),
			tileCenterX,
			tileCenterY,
			roundedZoom,
			scaleWidth,
			scaleHeight,
			scale,
		};
	}

	// -----------------------------------------------------------------------------------------------
	//                                        Render methods
	// -----------------------------------------------------------------------------------------------

	renderTiles(): JSX.Element {
		function srcSet(
			dprs: number[],
			url: (x: number, y: number, z: number, dpr?: number) => string,
			x: number,
			y: number,
			z: number,
		): string {
			if (!dprs || dprs.length === 0) {
				return "";
			}
			return dprs.map((dpr) => url(x, y, z, dpr) + (dpr === 1 ? "" : ` ${dpr}x`)).join(", ");
		}

		const { oldTiles, width, height } = this.state;
		const { dprs, boxClassname } = this.props;
		const mapUrl = this.props.provider || osm;

		const {
			tileMinX,
			tileMaxX,
			tileMinY,
			tileMaxY,
			tileCenterX,
			tileCenterY,
			roundedZoom,
			scaleWidth,
			scaleHeight,
			scale,
		} = this.tileValues(this.state);

		const tiles: Tile[] = [];

		console.log(oldTiles);
		for (const old of oldTiles) {
			const zoomDiff = old.roundedZoom - roundedZoom;
			if (Math.abs(zoomDiff) > 4 || zoomDiff === 0) {
				continue;
			}

			const pow = 1 / 2 ** zoomDiff;
			const xDiff = -(tileMinX - old.tileMinX * pow) * 256;
			const yDiff = -(tileMinY - old.tileMinY * pow) * 256;

			const xMin = Math.max(old.tileMinX, 0);
			const yMin = Math.max(old.tileMinY, 0);
			const xMax = Math.min(old.tileMaxX, 2 ** old.roundedZoom - 1);
			const yMax = Math.min(old.tileMaxY, 2 ** old.roundedZoom - 1);

			for (let x = xMin; x <= xMax; x++) {
				for (let y = yMin; y <= yMax; y++) {
					tiles.push({
						key: `${x}-${y}-${old.roundedZoom}`,
						url: mapUrl(x, y, old.roundedZoom),
						srcSet: srcSet(dprs, mapUrl, x, y, old.roundedZoom),
						left: xDiff + (x - old.tileMinX) * 256 * pow,
						top: yDiff + (y - old.tileMinY) * 256 * pow,
						width: 256 * pow,
						height: 256 * pow,
						active: false,
					});
				}
			}
		}

		const xMin = Math.max(tileMinX, 0);
		const yMin = Math.max(tileMinY, 0);
		const xMax = Math.min(tileMaxX, 2 ** roundedZoom - 1);
		const yMax = Math.min(tileMaxY, 2 ** roundedZoom - 1);

		for (let x = xMin; x <= xMax; x++) {
			for (let y = yMin; y <= yMax; y++) {
				tiles.push({
					key: `${x}-${y}-${roundedZoom}`,
					url: mapUrl(x, y, roundedZoom),
					srcSet: srcSet(dprs, mapUrl, x, y, roundedZoom),
					left: (x - tileMinX) * 256,
					top: (y - tileMinY) * 256,
					width: 256,
					height: 256,
					active: true,
				});
			}
		}

		const boxStyle: React.CSSProperties = {
			width: scaleWidth,
			height: scaleHeight,
			position: "absolute",
			top: `calc((100% - ${height}px) / 2)`,
			left: `calc((100% - ${width}px) / 2)`,
			overflow: "hidden",
			willChange: "transform",
			transform: `scale(${scale}, ${scale})`,
			transformOrigin: "top left",
		};

		const left = -((tileCenterX - tileMinX) * 256 - scaleWidth / 2);
		const top = -((tileCenterY - tileMinY) * 256 - scaleHeight / 2);

		const tilesStyle: React.CSSProperties = {
			position: "absolute",
			width: (tileMaxX - tileMinX + 1) * 256,
			height: (tileMaxY - tileMinY + 1) * 256,
			willChange: "transform",
			transform: `translate(${left}px, ${top}px)`,
		};

		console.log("Rendering n tiles", tiles.length);
		const Tile = this.props.tileComponent;

		return (
			<div style={boxStyle} className={boxClassname}>
				<div className="pigeon-tiles" style={tilesStyle}>
					{tiles.map((tile) => (
						<Tile key={tile.key} tile={tile} tileLoaded={() => this.tileLoaded(tile.key)} />
					))}
				</div>
			</div>
		);
	}

	renderOverlays(): JSX.Element {
		const { width, height } = this.state;

		const childrenStyle: React.CSSProperties = {
			position: "absolute",
			width: width,
			height: height,
			top: `calc((100% - ${height}px) / 2)`,
			left: `calc((100% - ${width}px) / 2)`,
		};

		return (
			<div className="pigeon-overlays" style={childrenStyle}>
				{this.props.children}
			</div>
		);
	}

	renderAttribution(): JSX.Element | null {
		const { attribution, attributionPrefix } = this.props;

		if (attribution === false) {
			return null;
		}

		const style: React.CSSProperties = {
			position: "absolute",
			bottom: 0,
			right: 0,
			fontSize: "11px",
			padding: "2px 5px",
			background: "rgba(255, 255, 255, 0.7)",
			fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
			color: "#333",
		};

		const linkStyle: React.CSSProperties = {
			color: "#0078A8",
			textDecoration: "none",
		};

		return (
			<div key="attr" className="pigeon-attribution" style={style}>
				{attributionPrefix === false ? null : (
					<span>
						{attributionPrefix || (
							<a
								href="https://pigeon-maps.js.org/"
								style={linkStyle}
								target="_blank"
								rel="noreferrer noopener"
							>
								Pigeon
							</a>
						)}
						{" | "}
					</span>
				)}
				{attribution || (
					<span>
						{" © "}
						<a
							href="https://www.openstreetmap.org/copyright"
							style={linkStyle}
							target="_blank"
							rel="noreferrer noopener"
						>
							OpenStreetMap
						</a>
						{" contributors"}
					</span>
				)}
			</div>
		);
	}

	renderWarning(): JSX.Element | null {
		const {
			metaWheelZoom,
			metaWheelZoomWarning,
			twoFingerDrag,
			twoFingerDragWarning,
			warningZIndex,
		} = this.props;
		const { showWarning, warningType, width, height } = this.state;

		if ((metaWheelZoom && metaWheelZoomWarning) || (twoFingerDrag && twoFingerDragWarning)) {
			const style: React.CSSProperties = {
				position: "absolute",
				top: 0,
				left: 0,
				width: width,
				height: height,
				overflow: "hidden",
				pointerEvents: "none",
				opacity: showWarning ? 100 : 0,
				transition: "opacity 300ms",
				background: "rgba(0,0,0,0.5)",
				color: "#fff",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				fontSize: 22,
				fontFamily: '"Arial", sans-serif',
				textAlign: "center",
				zIndex: warningZIndex,
			};

			const meta =
				hasWindow && window.navigator && window.navigator.platform.toUpperCase().indexOf("MAC") >= 0
					? "⌘"
					: "ctrl";

			const warningText = warningType === "fingers" ? twoFingerDragWarning : metaWheelZoomWarning;

			return (
				<div className="pigeon-overlay-warning" style={style}>
					{warningText.replace("META", meta)}
				</div>
			);
		}
		return null;
	}

	render(): JSX.Element {
		const { enableTouchEvents, twoFingerDrag } = this.props;
		const { width, height } = this.state;

		const containerStyle: React.CSSProperties = {
			width: this.props.width ? width : "100%",
			height: this.props.height ? height : "100%",
			position: "relative",
			display: "inline-block",
			overflow: "hidden",
			background: "#dddddd",
			touchAction: enableTouchEvents ? (twoFingerDrag ? "pan-x pan-y" : "none") : "auto",
		};

		const hasSize = !!(width && height);

		const map_api: MapApi = {
			latLngToPixel: this.latLngToPixel,
			pixelToLatLng: this.pixelToLatLng,
			setCenterZoom: this.setCenterZoom,
			mapProps: this.props,
			mapState: {
				bounds: this.getBounds(),
				zoom: this.state.zoom,
				center: this.state.center,
				width: this.state.width,
				height: this.state.height,
			},
		};

		return (
			<MapContext.Provider value={map_api}>
				<div style={containerStyle} ref={this.setRef} dir="ltr">
					{hasSize && this.renderTiles()}
					{hasSize && this.renderOverlays()}
					{hasSize && this.renderAttribution()}
					{hasSize && this.renderWarning()}
				</div>
			</MapContext.Provider>
		);
	}
}
