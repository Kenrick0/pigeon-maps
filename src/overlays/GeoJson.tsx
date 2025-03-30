import type React from "react";
import { type CSSProperties, type SVGProps, useState } from "react";
import { useMapApi } from "../map/PigeonMap";

// ----------------------------------- GeoJSON types ------------------------------------
// GeoJSON types are defined in https://datatracker.ietf.org/doc/html/rfc7946

interface GeoJsonPoint {
	type: "Point";
	coordinates: [number, number];
}

interface GeoJsonMultiPoint {
	type: "MultiPoint";
	coordinates: Array<[number, number]>;
}

interface GeoJsonLineString {
	type: "LineString";
	coordinates: Array<[number, number]>;
}

interface GeoJsonMultiLineString {
	type: "MultiLineString";
	coordinates: Array<Array<[number, number]>>;
}

interface GeoJsonPolygon {
	type: "Polygon";
	coordinates: Array<Array<[number, number]>>;
}

interface GeoJsonMultiPolygon {
	type: "MultiPolygon";
	coordinates: Array<Array<Array<[number, number]>>>;
}

interface GeoJsonGeometryCollection {
	type: "GeometryCollection";
	geometries: Array<GeoJsonGeometry>;
}

interface GeoJsonFeature {
	type: "Feature";
	geometry: GeoJsonGeometry;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	properties: Record<string, any>;
}

interface GeoJsonFeatureCollection {
	type: "FeatureCollection";
	features: Array<GeoJsonFeature>;
}

type GeoJsonGeometry =
	| GeoJsonPoint
	| GeoJsonMultiPoint
	| GeoJsonLineString
	| GeoJsonMultiLineString
	| GeoJsonPolygon
	| GeoJsonMultiPolygon
	| GeoJsonGeometryCollection;

// --------------------------------- End GeoJSON types ----------------------------------

interface GeoJsonProps {
	data: GeoJsonGeometry | GeoJsonFeature | GeoJsonFeatureCollection;
	className?: string;
	svgAttributes?: SVGProps<SVGElement>;
	style?: CSSProperties;
	styleCallback?: (feature: GeoJsonFeature, hover: boolean) => SVGProps<SVGElement>;

	// callbacks
	onClick?: ({ event, feature }: { event: React.MouseEvent; feature: GeoJsonFeature }) => void;
	onContextMenu?: ({
		event,
		feature,
	}: { event: React.MouseEvent; feature: GeoJsonFeature }) => void;
	onMouseOver?: ({ event, feature }: { event: React.MouseEvent; feature: GeoJsonFeature }) => void;
	onMouseOut?: ({ event, feature }: { event: React.MouseEvent; feature: GeoJsonFeature }) => void;
}

interface GeoJsonExtraProps {
	svgAttributes?: SVGProps<SVGElement>;
}

interface GeoJsonFeatureExtraProps {
	svgAttributes?: SVGProps<SVGElement>;
	styleCallback?: (feature: GeoJsonFeature, hover: boolean) => SVGProps<SVGElement>;

	// callbacks
	onClick?: ({ event, feature }: { event: React.MouseEvent; feature: GeoJsonFeature }) => void;
	onContextMenu?: ({
		event,
		feature,
	}: { event: React.MouseEvent; feature: GeoJsonFeature }) => void;
	onMouseOver?: ({ event, feature }: { event: React.MouseEvent; feature: GeoJsonFeature }) => void;
	onMouseOut?: ({ event, feature }: { event: React.MouseEvent; feature: GeoJsonFeature }) => void;
}

const defaultSvgAttributes = {
	fill: "#93c0d099",
	strokeWidth: "2",
	stroke: "white",
	r: "30",
};

const PointComponent = ({
	coordinates,
	svgAttributes,
}: GeoJsonPoint & GeoJsonExtraProps): JSX.Element => {
	const { latLngToPixel } = useMapApi();
	const [lon, lat] = coordinates; // Note: GeoJSON uses [lon, lat] order
	const [cx, cy] = latLngToPixel([lat, lon]);
	return <circle cx={cx} cy={cy} {...(svgAttributes as SVGProps<SVGCircleElement>)} />;
};

const MultiPoint = (props: GeoJsonMultiPoint & GeoJsonExtraProps): JSX.Element => {
	return (
		<>
			{props.coordinates.map((point, i) => (
				<PointComponent
					// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
					key={i}
					type="Point"
					coordinates={point}
					svgAttributes={props.svgAttributes}
				/>
			))}
		</>
	);
};

const LineString = (props: GeoJsonLineString & GeoJsonExtraProps): JSX.Element => {
	const { latLngToPixel } = useMapApi();
	const pointString = props.coordinates.reduce((a, [lon, lat]) => {
		const [v, w] = latLngToPixel([lat, lon]);
		return `${a} ${v.toFixed(1)} ${w.toFixed(1)}`;
	}, "");
	return <path d={`M ${pointString}`} {...(props.svgAttributes as SVGProps<SVGPathElement>)} />;
};

const MultiLineString = (props: GeoJsonMultiLineString & GeoJsonExtraProps): JSX.Element => {
	return (
		<>
			{props.coordinates.map((line, i) => (
				<LineString
					// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
					key={i}
					type="LineString"
					coordinates={line}
					svgAttributes={props.svgAttributes}
				/>
			))}
		</>
	);
};

const Polygon = (props: GeoJsonPolygon & GeoJsonExtraProps): JSX.Element => {
	const { latLngToPixel } = useMapApi();
	// GeoJson polygons is a collection of linear rings
	const p = (props.coordinates as Array<Array<[number, number]>>).reduce((a, part) => {
		const pointString = part.reduce((a, [y, x]) => {
			const [v, w] = latLngToPixel([x, y]);
			return `${a} ${v.toFixed(1)} ${w.toFixed(1)}`;
		}, "");
		return `${a} M${pointString}Z`;
	}, "");
	return <path d={p} {...(props.svgAttributes as SVGProps<SVGPathElement>)} />;
};

const MultiPolygon = (props: GeoJsonMultiPolygon & GeoJsonExtraProps): JSX.Element => {
	return (
		<>
			{props.coordinates.map((polygon, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
				<Polygon key={i} type="Polygon" coordinates={polygon} svgAttributes={props.svgAttributes} />
			))}
		</>
	);
};

const GeometryCollection = (props: GeoJsonGeometryCollection & GeoJsonExtraProps): JSX.Element => {
	return (
		<>
			{props.geometries.map((geometry, i) => {
				return (
					<RenderGeoJsonGeometry
						// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
						key={i}
						geometry={geometry}
						svgAttributes={props.svgAttributes}
					/>
				);
			})}
		</>
	);
};

// RenderGeoJsonGeometry is a helper function to render a GeoJsonGeometry based on its type
const RenderGeoJsonGeometry = ({
	geometry,
	svgAttributes,
}: {
	geometry: GeoJsonGeometry;
	svgAttributes: SVGProps<SVGElement>;
}): JSX.Element => {
	const renderer: Record<string, React.ComponentType<GeoJsonGeometry & GeoJsonExtraProps>> = {
		Point: PointComponent,
		MultiPoint,
		LineString,
		MultiLineString,
		Polygon,
		MultiPolygon,
		GeometryCollection,
	};

	const SpecificGeometryComponent = renderer[geometry.type];
	if (SpecificGeometryComponent === undefined) {
		console.warn(`The GeoJson Geometry Type ${geometry.type} is not known`);
		return <></>;
	}

	return <SpecificGeometryComponent {...geometry} svgAttributes={svgAttributes} />;
};

export const GeoJsonFeature = (
	props: GeoJsonFeature & GeoJsonExtraProps & GeoJsonFeatureExtraProps,
): JSX.Element => {
	const [hover, setHover] = useState(false);
	const callbackSvgAttributes = props.styleCallback?.(props, hover);
	const svgAttributes = callbackSvgAttributes
		? props.svgAttributes
			? { ...props.svgAttributes, ...callbackSvgAttributes }
			: callbackSvgAttributes
		: props.svgAttributes
			? props.svgAttributes
			: defaultSvgAttributes;

	const eventParameters = (event: React.MouseEvent<SVGElement>) => ({
		event,
		feature: props,
	});

	return (
		// biome-ignore lint/a11y/useKeyWithMouseEvents: <explanation>
		// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
		<g
			clipRule="evenodd"
			style={{ pointerEvents: "auto" }}
			onClick={props.onClick ? (event) => props.onClick(eventParameters(event)) : null}
			onContextMenu={
				props.onContextMenu ? (event) => props.onContextMenu(eventParameters(event)) : null
			}
			onMouseOver={(event) => {
				setHover(true);
				props.onMouseOver?.(eventParameters(event));
			}}
			onMouseOut={(event) => {
				setHover(false);
				props.onMouseOut?.(eventParameters(event));
			}}
		>
			<RenderGeoJsonGeometry geometry={props.geometry} svgAttributes={svgAttributes} />
		</g>
	);
};

export const GeoJson = (props: GeoJsonProps): JSX.Element => {
	const mapApi = useMapApi();
	const { width, height } = mapApi.mapState;

	let geoJsonObject = null;
	if (props.data.type === "FeatureCollection") {
		geoJsonObject = props.data.features.map((feature, i) => {
			return (
				// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
				<GeoJsonFeature key={i} {...feature} {...props} />
			);
		});
	} else if (props.data.type === "Feature") {
		geoJsonObject = <GeoJsonFeature {...props.data} {...props} />;
	} else {
		geoJsonObject = (
			<RenderGeoJsonGeometry geometry={props.data} svgAttributes={props.svgAttributes} />
		);
	}

	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				pointerEvents: "none",
				cursor: "pointer",
				...(props.style || {}),
			}}
			className={props.className ? `${props.className} pigeon-click-block` : "pigeon-click-block"}
		>
			{/* biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
			<svg
				width={width}
				height={height}
				viewBox={`0 0 ${width} ${height}`}
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				{geoJsonObject}
			</svg>
		</div>
	);
};
