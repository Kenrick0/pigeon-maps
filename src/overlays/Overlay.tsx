import type React from "react";
import type { Point } from "../types";
import { useMapApi } from "../map/PigeonMap";

export interface OverlayProps {
	anchor: Point; // lat/lng coordinates of the marker
	offsetPx?: Point; // offset of marker in pixels from the anchor point
	offsetPercent?: Point; // offset of marker in percent from the anchor point
	style?: React.CSSProperties;
	className?: string;
	children?: React.ReactNode;
}

/**
 * A React component that renders an overlay on a map at a specified anchor point.
 *
 * @param {[number, number]} anchor - The geographical coordinates [latitude, longitude] where the overlay is anchored.
 * @param {[number, number]} [offset=[0, 0]] - The pixel offset [x, y] to apply to the overlay's position.
 * @param {React.CSSProperties} [style={}] - Additional CSS styles to apply to the overlay.
 * @param {string} [className] - Additional CSS class names to apply to the overlay.
 * @param {React.ReactNode} children - The content to render inside the overlay.
 * @param {object} [divAttributes] - Additional props to spread onto the root `div` element.
 *
 * @returns {JSX.Element} The rendered overlay component.
 *
 * @example
 * ```tsx
 * <Overlay
 *   anchor={[50.879, 4.6997]}
 *   offset={[10, 20]}
 *   style={{ backgroundColor: 'white' }}
 *   className="custom-overlay"
 *   onClick={() => console.log('Overlay clicked!')}
 * >
 *   <div>Overlay Content</div>
 * </Overlay>
 * ```
 */
export function Overlay({
	anchor,
	offsetPx = [0, 0],
	offsetPercent = [0, 0],
	style = {},
	className,
	children,
	...divAttributes
}: OverlayProps & React.HTMLAttributes<HTMLDivElement>) {
	const mapApi = useMapApi();
	const c = mapApi.latLngToPixel(anchor);
	const left = c[0] - offsetPx[0];
	const top = c[1] - offsetPx[1];

	return (
		<div
			{...divAttributes}
			className={className ? `${className} pigeon-click-block` : "pigeon-click-block"}
			style={{
				position: "absolute",
				transform: `translate(${left}px, ${top}px) translate(${offsetPercent[0]}%, ${offsetPercent[1]}%)`,
				...style,
			}}
		>
			{children}
		</div>
	);
}
