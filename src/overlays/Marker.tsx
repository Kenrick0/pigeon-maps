import type React from "react";
import { useState } from "react";
import type { Point } from "../types";
import { Overlay, type OverlayProps } from "./Overlay";

interface MarkerProps {
	anchor: Point; // lat/lng coordinates of the marker
	height?: number; // height of the marker icon in pixels
	offsetPx?: Point; // offset of marker in pixels from the anchor point
	offsetPercent?: Point; // offset of marker in percent from the anchor point

	color?: string;
	style?: React.CSSProperties;
	children?: JSX.Element;
}

/**
 * A React component that renders a customizable marker on a map.
 * The marker is positioned using latitude/longitude coordinates and can display
 * an optional child element or a default SVG marker icon.
 *
 * @param {Point} anchor - The latitude/longitude coordinates of the marker.
 * @param {number} [height=34] - The height of the marker icon in pixels.
 * @param {Point} [offsetPx=[0, 0]] - The pixel offset of the marker from the anchor point.
 * @param {string} [color] - The color of the default marker icon.
 * @param {React.CSSProperties} [style={}] - Additional CSS styles for the marker.
 * @param {JSX.Element} [children] - Optional child element to render inside the marker.
 *
 * @returns {JSX.Element} A JSX element representing the marker.
 *
 * @example
 * Makes a marker that looks like this:
 *
 *           .........
 *         .............
 *       .................
 *      ......       ......
 *      .....         .....
 *      .....         .....
 *      ......       ......
 *       ........ ........
 *        ...............
 *         .............
 *           .........
 *             .....
 *               .
 *
 */
export function Marker({
	height = 34,
	offsetPx = [0, 0],
	offsetPercent = [-50, -85], // Align the tip of the default marker with the anchor point
	color = "#93C0D0",
	style = {},
	children,
	...overlayDivAttributes
}: MarkerProps & OverlayProps & React.HTMLAttributes<HTMLDivElement>): JSX.Element {
	const [hover, setHover] = useState(false);

	return (
		<Overlay
			// Pass most props to Overlay
			{...overlayDivAttributes}
			// Extend some props to add marker features
			offsetPercent={offsetPercent}
			offsetPx={offsetPx}
			style={{
				filter: hover ? "drop-shadow(0 0 4px rgba(0, 0, 0, .3))" : "",
				pointerEvents: "none",
				cursor: "pointer",
				...style,
			}}
			onMouseOver={(event) => {
				setHover(true);
				overlayDivAttributes.onMouseOver?.(event); // Call user provided onMouseOver if it exists
			}}
			onMouseOut={(event) => {
				setHover(false);
				overlayDivAttributes.onMouseOut?.(event); // Call user provided onMouseOut if it exists
			}}
		>
			{children || (
				<svg height={height} viewBox="0 0 61 71" fill="none" xmlns="http://www.w3.org/2000/svg">
					<title>Marker Icon</title>
					<g style={{ pointerEvents: "auto" }}>
						<path
							d="M52 31.5C52 36.8395 49.18 42.314 45.0107 47.6094C40.8672 52.872 35.619 57.678 31.1763 61.6922C30.7916 62.0398 30.2084 62.0398 29.8237 61.6922C25.381 57.678 20.1328 52.872 15.9893 47.6094C11.82 42.314 9 36.8395 9 31.5C9 18.5709 18.6801 9 30.5 9C42.3199 9 52 18.5709 52 31.5Z"
							fill={color}
							stroke="white"
							strokeWidth="4"
						/>
						<circle cx="30.5" cy="30.5" r="8.5" fill="white" opacity={hover ? 0.98 : 0.6} />
					</g>
				</svg>
			)}
		</Overlay>
	);
}
