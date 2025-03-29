import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { Point } from "../types";
import { useMapApi } from "../map/PigeonMap";

function isDescendentOf(element, ancestor) {
	let currentElement = element;
	while (currentElement) {
		if (currentElement === ancestor) {
			return true;
		}
		currentElement = currentElement.parentElement;
	}

	return false;
}

interface DraggableProps {
	anchor: Point;
	offset?: Point;

	className?: string;
	style?: React.CSSProperties;

	children?: React.ReactNode;

	onDragStart?: (anchor: Point) => void;
	onDragMove?: (anchor: Point) => void;
	onDragEnd?: (anchor: Point) => void;
}

interface DraggableState {
	isDragging: boolean;
	startX?: number;
	startY?: number;
	startLeft?: number;
	startTop?: number;
	deltaX: number;
	deltaY: number;
}

const defaultState: DraggableState = {
	isDragging: false,
	startX: undefined,
	startY: undefined,
	startLeft: undefined,
	startTop: undefined,
	deltaX: 0,
	deltaY: 0,
};

export function Draggable(props: DraggableProps): JSX.Element {
	const [_state, _setState] = useState(defaultState);
	const mapApi = useMapApi();

	const dragRef = useRef<HTMLDivElement>();
	const propsRef = useRef<DraggableProps>(props);
	const stateRef = useRef({ ...defaultState });
	const mapRef = useRef(mapApi);

	propsRef.current = props;
	mapRef.current = mapApi;

	const { enableMouseEvents: mouseEvents, enableTouchEvents: touchEvents } = mapApi.mapProps;

	useEffect(() => {
		const setState = (stateUpdate: Partial<DraggableState>): void => {
			const newState = { ...stateRef.current, ...stateUpdate };
			stateRef.current = newState;
			_setState(newState);
		};

		const handleDragStart = (event: MouseEvent | TouchEvent) => {
			if (isDescendentOf(event.target, dragRef.current)) {
				event.preventDefault();

				const c = mapRef.current.latLngToPixel(propsRef.current.anchor);
				const { offset } = propsRef.current;
				const left = c[0] - offset[0];
				const top = c[1] - offset[1];

				setState({
					isDragging: true,
					startX: ("touches" in event ? event.touches[0] : event).clientX,
					startY: ("touches" in event ? event.touches[0] : event).clientY,
					startLeft: left,
					startTop: top,
					deltaX: 0,
					deltaY: 0,
				});

				propsRef.current.onDragStart?.(
					mapRef.current.pixelToLatLng([
						left + (offset ? offset[0] : 0),
						top + (offset ? offset[1] : 0),
					]),
				);
			}
		};

		const handleDragMove = (event: MouseEvent | TouchEvent) => {
			if (!stateRef.current.isDragging) {
				return;
			}

			event.preventDefault();

			const x = ("touches" in event ? event.touches[0] : event).clientX;
			const y = ("touches" in event ? event.touches[0] : event).clientY;

			const deltaX = x - stateRef.current.startX;
			const deltaY = y - stateRef.current.startY;

			setState({ deltaX, deltaY });

			if (propsRef.current.onDragMove) {
				const { offset } = propsRef.current;
				const { startLeft, startTop } = stateRef.current;

				propsRef.current.onDragMove(
					mapRef.current.pixelToLatLng([
						startLeft + deltaX + (offset ? offset[0] : 0),
						startTop + deltaY + (offset ? offset[1] : 0),
					]),
				);
			}
		};

		const handleDragEnd = (event: MouseEvent | TouchEvent) => {
			if (!stateRef.current.isDragging) {
				return;
			}

			event.preventDefault();

			const { offset } = propsRef.current;
			const { deltaX, deltaY, startLeft, startTop } = stateRef.current;

			propsRef.current.onDragEnd?.(
				mapRef.current.pixelToLatLng([
					startLeft + deltaX + (offset ? offset[0] : 0),
					startTop + deltaY + (offset ? offset[1] : 0),
				]),
			);

			setState({
				isDragging: false,
				startX: undefined,
				startY: undefined,
				startLeft: undefined,
				startTop: undefined,
				deltaX: 0,
				deltaY: 0,
			});
		};

		const wa = window.addEventListener;
		const wr = window.removeEventListener;

		if (mouseEvents) {
			wa("mousedown", handleDragStart);
			wa("mousemove", handleDragMove);
			wa("mouseup", handleDragEnd);
		}

		if (touchEvents) {
			wa("touchstart", handleDragStart, { passive: false });
			wa("touchmove", handleDragMove, { passive: false });
			wa("touchend", handleDragEnd, { passive: false });
		}

		return () => {
			if (mouseEvents) {
				wr("mousedown", handleDragStart);
				wr("mousemove", handleDragMove);
				wr("mouseup", handleDragEnd);
			}

			if (touchEvents) {
				wr("touchstart", handleDragStart);
				wr("touchmove", handleDragMove);
				wr("touchend", handleDragEnd);
			}
		};
	}, [mouseEvents, touchEvents]);

	const c = mapApi.latLngToPixel(props.anchor || mapApi.mapState.center);
	const left = c[0] - (props.offset ? props.offset[0] : 0);
	const top = c[1] - (props.offset ? props.offset[1] : 0);

	const { className, style } = props;
	const { deltaX, deltaY, startLeft, startTop, isDragging } = _state;

	return (
		<div
			style={{
				cursor: isDragging ? "grabbing" : "grab",
				...(style || {}),
				position: "absolute",
				transform: `translate(${isDragging ? startLeft + deltaX : left}px, ${isDragging ? startTop + deltaY : top}px)`,
			}}
			ref={dragRef}
			className={`pigeon-drag-block${className ? ` ${className}` : ""}`}
		>
			{props.children}
		</div>
	);
}
