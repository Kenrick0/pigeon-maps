import type React from "react";
import { useMapApi } from "../map/PigeonMap";

interface ZoomProps {
	style?: React.CSSProperties;
	buttonStyle?: React.CSSProperties;
}

const commonStyle: React.CSSProperties = {
	position: "absolute",
	top: 10,
	left: 10,
};

const commonButtonStyle: React.CSSProperties = {
	width: 28,
	height: 28,
	borderRadius: 2,
	padding: 0,
	boxShadow: "0 1px 4px -1px rgba(0,0,0,.3)",
	background: "white",
	lineHeight: "26px",
	fontSize: "20px",
	fontWeight: 700,
	color: "#666",
	marginBottom: 1,
	cursor: "pointer",
	border: "none",
	display: "block",
	outline: "none",
};

export function ZoomControl({ style = {}, buttonStyle = {} }: ZoomProps): JSX.Element {
	const mapApi = useMapApi();
	const mapProps = mapApi.mapProps;
	const mapState = mapApi.mapState;

	return (
		<div className="pigeon-zoom-buttons pigeon-drag-block" style={{ ...commonStyle, ...style }}>
			<button
				className="pigeon-zoom-in"
				type="button"
				style={{ ...commonButtonStyle, ...buttonStyle }}
				onClick={() =>
					mapApi.setCenterZoomTarget(mapState.center, Math.min(mapState.zoom + 1, mapProps.maxZoom))
				}
			>
				+
			</button>
			<button
				className="pigeon-zoom-out"
				type="button"
				style={{ ...commonButtonStyle, ...buttonStyle }}
				onClick={() =>
					mapApi.setCenterZoomTarget(mapState.center, Math.max(mapState.zoom - 1, mapProps.minZoom))
				}
			>
				–
			</button>
		</div>
	);
}
