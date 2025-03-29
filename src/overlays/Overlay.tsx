import type React from "react";
import type { PigeonProps } from "../types";
import { useMapApi } from "../map/PigeonMap";

interface OverlayProps extends PigeonProps {
	style?: React.CSSProperties;
	className?: string;
	children?: React.ReactNode;
}

export function Overlay(props: OverlayProps) {
	const mapApi = useMapApi();

	const c = mapApi.latLngToPixel(props.anchor || mapApi.mapState.center);
	const left = c[0] - (props.offset ? props.offset[0] : 0);
	const top = c[1] - (props.offset ? props.offset[1] : 0);

	return (
		<div
			style={{
				position: "absolute",
				transform: `translate(${left}px, ${top}px)`,
				...(props.style || {}),
			}}
			className={props.className ? `${props.className} pigeon-click-block` : "pigeon-click-block"}
		>
			{props.children}
		</div>
	);
}
