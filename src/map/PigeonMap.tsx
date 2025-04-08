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

export const useMapApi = (): MapApi => {
	const map_api = React.useContext(MapContext);
	if (!map_api) {
		throw new Error("MapContext not found, are you inside a <PigeonMap>?");
	}
	return map_api;
};

const ANIMATION_TIME = 300;
const SCROLL_PIXELS_FOR_ZOOM_LEVEL = 150;
const MIN_VELOCITY_FOR_THROW = 250;
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

const tile2lng = (x: number, z: number): number => {
	return (x / 2 ** z) * 360 - 180;
};

const tile2lat = (y: number, z: number): number => {
	const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
	return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

const getMousePixel = (dom: HTMLElement, event: Pick<MouseEvent, "clientX" | "clientY">): Point => {
	const parent = parentPosition(dom);
	return [event.clientX - parent.x, event.clientY - parent.y];
};

const wrapNumber = (num: number, max: number): number => {
	// Wrap a number to the range [0, max)
	return ((num % max) + max) % max;
};

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

const parentHasClass = (element: HTMLElement, className: string) => {
	let currentElement = element;
	while (currentElement) {
		if (currentElement.classList?.contains(className)) {
			return true;
		}
		currentElement = currentElement.parentElement;
	}

	return false;
};

const parentPosition = (element: HTMLElement) => {
	const rect = element.getBoundingClientRect();
	return { x: rect.left, y: rect.top };
};

// Short names to reduce minified bundle size
const wa = window.addEventListener;
const wr = window.removeEventListener;

const ImgTile: TileComponent = ({ tile, onTileLoaded }) => (
	<img
		src={tile.url}
		srcSet={tile.srcSet}
		width={tile.width}
		height={tile.height}
		onLoad={onTileLoaded}
		alt={""}
		style={{
			position: "absolute",
			left: tile.left,
			top: tile.top,
			willChange: "transform",
			transformOrigin: "top left",
		}}
	/>
);

export class PigeonMap extends Component<MapProps, MapReactState> {
	static defaultProps: MapProps = {
		animate: true,
		animateOnPropChange: true,
		metaWheelZoom: false,
		metaWheelZoomWarning: "Use META + wheel to zoom!",
		twoFingerDrag: false,
		twoFingerDragWarning: "Use two fingers to move the map",
		enableZoomSnap: navigator.maxTouchPoints === 0, // snap by default for non-touch devices
		enableMouseEvents: true,
		enableTouchEvents: true,
		warningZIndex: 100,
		minZoom: 1,
		maxZoom: 18,
		dprs: [],
		boxClassname: "pigeon-tiles-box",
		tileComponent: ImgTile,
	};

	_loadTracker: { [key: string]: boolean } = {};

	_containerRef?: HTMLDivElement;
	_resizeObserver = null;
	_lastMousePosition?: Point;
	_dragStart: Point | null = null;
	_mouseDown = false;
	_moveEvents: MoveEvent[] = [];
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
			zoom: props.defaultZoom ?? props.goToZoom ?? 14,
			center: props.defaultCenter ?? props.goToCenter ?? [0, 0],
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
			// If width or height is not controlled use the container size
			const updateWidthHeight = () => {
				const rect = this._containerRef.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0) {
					this.setState({
						width: rect.width,
						height: rect.height,
					});
				}
			};

			this._resizeObserver = new window.ResizeObserver(updateWidthHeight);
			this._resizeObserver.observe(this._containerRef);
		}

		// Initial call to onBoundsChanged
		this.props.onBoundsChanged?.({
			center: this.state.center,
			zoom: this.state.zoom,
			bounds: this.getBounds(),
			initial: true,
			isAnimating: this._isAnimating,
		});
	}

	componentWillUnmount(): void {
		this.props.enableMouseEvents && this.unbindMouseEvents();
		this.props.enableTouchEvents && this.unbindTouchEvents();

		if (this._resizeObserver) {
			this._resizeObserver.disconnect();
		}
	}

	bindMouseEvents = (): void => {
		wa("mousedown", this.handleMouseDown);
		wa("mouseup", this.handleMouseUp);
		wa("mousemove", this.handleMouseMove);

		this._containerRef.addEventListener("wheel", this.handleWheel, {
			passive: false,
		});
	};

	unbindMouseEvents = (): void => {
		wr("mousedown", this.handleMouseDown);
		wr("mouseup", this.handleMouseUp);
		wr("mousemove", this.handleMouseMove);
		this._containerRef.removeEventListener("wheel", this.handleWheel);
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

		if (
			(this.props.goToCenter && this.props.goToCenter !== prevProps.goToCenter) ||
			(this.props.goToZoom && this.props.goToZoom !== prevProps.goToZoom)
		) {
			// User has updated center or zoom, animate to it
			const nextCenter = this.props.goToCenter ?? this.state.center;
			const nextZoom = this.props.goToZoom ?? this.state.zoom;

			// No need to move the map if the center and zoom are the same
			if (
				Math.abs(nextZoom - this.state.zoom) > 0.001 ||
				Math.abs(nextCenter[0] - this.state.center[0]) > 0.001 ||
				Math.abs(nextCenter[1] - this.state.center[1]) > 0.001
			) {
				this.setCenterZoomTarget(
					nextCenter,
					nextZoom,
					null,
					this.props.animateOnPropChange,
					ANIMATION_TIME,
				);
			}
		}
	}

	pixelToLatLng = (pixel: Point, center = this.state.center, zoom = this.state.zoom): Point => {
		const { width, height } = this.state;

		const pointDiff = [(pixel[0] - width / 2) / 256.0, (pixel[1] - height / 2) / 256.0];

		const tileX = lng2tile(center[1], zoom) + pointDiff[0];
		const tileY = lat2tile(center[0], zoom) + pointDiff[1];

		// The values are clipped to the range of the Web Mercator projection
		// Refer to https://en.wikipedia.org/wiki/Web_Mercator_projection#Formulas
		return [
			Math.max(-85.051129, Math.min(85.051128, tile2lat(tileY, zoom))),
			Math.max(-180, Math.min(180, tile2lng(tileX, zoom))),
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
		zoom: number,
		zoomAroundPixel: Point | null = null,
		animate = true,
		animationDuration = ANIMATION_TIME,
	): void => {
		// Clip zoom to min/max values (limit minimum allowed to prevent zooming outside the map)
		const { minZoom, maxZoom } = this.props;
		const minZoomAllowed = Math.log2(this.state.height / 256); // ensure we can't see beyond the map up/down
		const zoomTarget = Math.max(minZoomAllowed, minZoom, Math.min(zoom, maxZoom));

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
		const heightV = height / 256;
		const maxUV = 2 ** zoom;

		const clippedCenterU = wrapNumber(centerU, maxUV);
		const clippedCenterV = Math.max(heightV / 2, Math.min(maxUV - heightV / 2, centerV));

		return [tile2lat(clippedCenterV, zoom), tile2lng(clippedCenterU, zoom)];
	};

	// main logic when changing coordinates
	setCenterZoom = (centerRequest: Point, zoomTarget: number): void => {
		const centerTarget = this.limitCenter(centerRequest, zoomTarget);

		const zoomChanged = Math.round(this.state.zoom) !== Math.round(zoomTarget);
		const centerChanged =
			centerTarget[0] !== this.state.center[0] || centerTarget[1] !== this.state.center[1];

		// Update tiles if zoom changed
		if (zoomChanged) {
			const tileValues = this.tileValues(this.state);
			const oldTiles = this.state.oldTiles;

			this.setState({
				oldTiles: oldTiles
					.filter((o) => o.roundedZoom !== tileValues.roundedZoom)
					.concat(tileValues),
			});
		}

		// Apply center and zoom if it's different
		if (zoomChanged || centerChanged) {
			this.setState({ center: centerTarget, zoom: zoomTarget });

			// Call onBoundsChanged callback if it's defined
			this.props.onBoundsChanged?.({
				center: centerTarget,
				zoom: zoomTarget,
				bounds: this.getBounds(centerTarget, zoomTarget),
				initial: false,
				isAnimating: this._isAnimating,
			});
		}
	};

	onTileLoaded = (key: string): void => {
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
		} else if (event.touches.length === 2 && this._touchStartPixel) {
			// Added second finger and first one was in the area
			event.preventDefault();

			// if dragging with 2 fingers, don't throw the map
			this._moveEvents = [];

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

			if (event.detail === 2) {
				// Double click (https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail)
				if (!parentHasClass(event.target as HTMLElement, "pigeon-click-block")) {
					this.setPanZoomTarget(null, 1, pixel);
				}
			} else {
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
		const pixel = getMousePixel(this._containerRef, event);

		if (this._mouseDown && this._dragStart) {
			this.trackMoveEvents(this._lastMousePosition);
			const panPixels: Point = [
				pixel[0] - this._lastMousePosition[0],
				pixel[1] - this._lastMousePosition[1],
			];
			this.setPanZoomTarget(panPixels, null, null, false);
		}

		this._lastMousePosition = pixel;
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
				Math.abs(move_distance_pixels[0]) + Math.abs(move_distance_pixels[1]) <= CLICK_TOLERANCE
			) {
				const latLng = this.pixelToLatLng(pixel);
				this.props.onClick({ event, latLng, pixel });
			} else {
				this.throwAfterMoving(pixel, false);
			}
		}
	};

	// https://www.bennadel.com/blog/1856-using-jquery-s-animate-step-callback-function-to-create-custom-animations.htm
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
		const lastEvent = this._moveEvents[0];
		this._moveEvents = [];

		if (lastEvent && animate) {
			const deltaMs = Math.max(timestamp - lastEvent.timestamp, 1);
			const delta = [
				// Pixels per second
				((coords[0] - lastEvent.coords[0]) / deltaMs) * 1000,
				((coords[1] - lastEvent.coords[1]) / deltaMs) * 1000,
			];

			const velocityMag = Math.sqrt(delta[0] * delta[0] + delta[1] * delta[1]);
			if (velocityMag > MIN_VELOCITY_FOR_THROW) {
				// Allow touch to throw further for better UX on mobile devices
				const gain = throwByTouch ? 0.5 : 0.2;
				const throw_time = 800 + velocityMag / 10;
				this.setPanZoomTarget([gain * delta[0], gain * delta[1]], null, null, true, throw_time);
			}
		}
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

	getBounds = (center = this.state.center, zoom = this.state.zoom): Bounds => {
		const { width, height } = this.state;

		return {
			ne: this.pixelToLatLng([width - 1, 0], center, zoom),
			sw: this.pixelToLatLng([0, height - 1], center, zoom),
		};
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

		const { dprs, boxClassname } = this.props;
		const mapUrl = this.props.provider || osm;

		const tiles: Tile[] = [];

		function generateTiles(tileValues: TileValues, pow = 1, xDiff = 0, yDiff = 0) {
			const tilePixels = 256 * pow; // width and height are the same
			const xMin = tileValues.tileMinX;
			const yMin = Math.max(tileValues.tileMinY, 0);
			const xMax = tileValues.tileMaxX;
			const yMax = Math.min(tileValues.tileMaxY, 2 ** tileValues.roundedZoom - 1);

			for (let x = xMin; x <= xMax; x++) {
				for (let y = yMin; y <= yMax; y++) {
					const xMod = wrapNumber(x, 2 ** tileValues.roundedZoom);
					tiles.push({
						key: `${x}-${y}-${tileValues.roundedZoom}`,
						url: mapUrl(xMod, y, tileValues.roundedZoom),
						srcSet: srcSet(dprs, mapUrl, xMod, y, tileValues.roundedZoom),
						left: xDiff + (x - tileValues.tileMinX) * tilePixels,
						top: yDiff + (y - tileValues.tileMinY) * tilePixels,
						width: tilePixels,
						height: tilePixels,
						active: true,
					});
				}
			}
		}

		const newTileValues = this.tileValues(this.state);
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
		} = newTileValues;

		// Generate tiles for the old zoom levels
		for (const old of this.state.oldTiles) {
			const zoomDiff = old.roundedZoom - roundedZoom;
			if (Math.abs(zoomDiff) > 4 || zoomDiff === 0) {
				continue;
			}

			const pow = 1 / 2 ** zoomDiff;
			const xDiff = (old.tileMinX * pow - tileMinX) * 256;
			const yDiff = (old.tileMinY * pow - tileMinY) * 256;
			generateTiles(old, pow, xDiff, yDiff);
		}

		// Generate tiles for the current zoom level (last so that they are on top)
		generateTiles(newTileValues);

		// Update loadTracker with the new tiles
		const loadTracker: { [key: string]: boolean } = {};
		for (const tile of tiles) {
			loadTracker[tile.key] = this._loadTracker[tile.key] ?? false; // set to false if not present
		}
		this._loadTracker = loadTracker;

		const boxStyle: React.CSSProperties = {
			width: "100%",
			height: "100%",
			position: "absolute",
			willChange: "transform",
			transform: `scale(${scale}, ${scale})`,
			transformOrigin: "top left",
		};

		const left = Math.round(scaleWidth / 2 + (tileMinX - tileCenterX) * 256);
		const top = Math.round(scaleHeight / 2 + (tileMinY - tileCenterY) * 256);

		const tilesStyle: React.CSSProperties = {
			position: "absolute",
			width: (tileMaxX - tileMinX + 1) * 256,
			height: (tileMaxY - tileMinY + 1) * 256,
			willChange: "transform",
			transform: `translate(${left}px, ${top}px)`,
		};

		const Tile = this.props.tileComponent;

		return (
			<div style={boxStyle} className={boxClassname}>
				<div className="pigeon-tiles" style={tilesStyle}>
					{tiles.map((tile) => (
						<Tile key={tile.key} tile={tile} onTileLoaded={() => this.onTileLoaded(tile.key)} />
					))}
				</div>
			</div>
		);
	}

	renderOverlays(): JSX.Element {
		const childrenStyle: React.CSSProperties = {
			position: "absolute",
			width: "100%",
			height: "100%",
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
		const { showWarning, warningType } = this.state;

		if ((metaWheelZoom && metaWheelZoomWarning) || (twoFingerDrag && twoFingerDragWarning)) {
			const style: React.CSSProperties = {
				position: "absolute",
				width: "100%",
				height: "100%",
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
			overflow: "hidden",
			background: "#dddddd",
			touchAction: enableTouchEvents ? (twoFingerDrag ? "pan-x pan-y" : "none") : "auto",
		};

		const hasSize = !!(width && height);

		const map_api: MapApi = {
			latLngToPixel: this.latLngToPixel,
			pixelToLatLng: this.pixelToLatLng,
			setCenterZoomTarget: this.setCenterZoomTarget,
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
				<div
					style={containerStyle}
					ref={(dom) => {
						this._containerRef = dom;
					}}
					dir="ltr"
				>
					{hasSize && this.renderTiles()}
					{hasSize && this.renderOverlays()}
					{hasSize && this.renderAttribution()}
					{hasSize && this.renderWarning()}
				</div>
			</MapContext.Provider>
		);
	}
}
