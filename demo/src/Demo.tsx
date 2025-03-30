import { useState, useEffect } from "react";

import {
	PigeonMap,
	Marker,
	Draggable,
	ZoomControl,
	GeoJson,
	type Point,
	Overlay,
	useMapApi,
} from "../../src";
import * as providers from "../../src/providers";
import { PigeonIcon } from "./PigeonIcon";

const lng2tile = (lon, zoom) => ((lon + 180) / 360) * Math.pow(2, zoom);
const lat2tile = (lat, zoom) =>
	((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
		2) *
	Math.pow(2, zoom);

const markers = {
	leuven1: [[50.879, 4.6997], 13],
	leuven2: [[50.874, 4.6947], 13],
	brussels: [[50.8505, 4.35149], 11],
	ghent: [[51.0514, 3.7103], 12],
	coast: [[51.2214, 2.9541], 10],
};

const geoJsonSample = {
	type: "FeatureCollection",
	features: [
		{
			type: "Feature",
			geometry: { type: "Point", coordinates: [2.0, 48.5] },
			properties: { prop0: "value0" },
		},
		{
			type: "Feature",
			geometry: {
				type: "LineString",
				coordinates: [
					[2.0, 48.0],
					[3.0, 49.0],
					[4.0, 48.0],
					[5.0, 49.0],
				],
			},
			properties: {
				prop0: "value0",
				prop1: 0.0,
			},
		},
		{
			type: "Feature",
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[0.0, 48.0],
						[1.0, 48.0],
						[1.0, 49.0],
						[0.0, 49.0],
						[0.0, 48.0],
					],
				],
			},
			properties: {
				prop0: "value0",
				prop1: { this: "that" },
			},
		},
		{
			type: "Feature",
			geometry: {
				type: "MultiLineString",
				coordinates: [
					[
						[3.0, 46.0],
						[4.0, 47.0],
						[5.0, 46.0],
						[6.0, 47.0],
					],
					[
						[4.0, 46.0],
						[5.0, 47.0],
						[6.0, 46.0],
						[7.0, 47.0],
					],
				],
			},
		},
		{
			type: "Feature",
			properties: { name: "yea" },
			geometry: {
				type: "GeometryCollection",
				geometries: [
					{ type: "Point", coordinates: [2.0, 46.5] },
					{
						type: "LineString",
						coordinates: [
							[2.0, 46.0],
							[3.0, 47.0],
							[4.0, 46.0],
							[5.0, 47.0],
						],
					},
					{
						type: "Polygon",
						coordinates: [
							[
								[0.0, 46.0],
								[1.0, 46.0],
								[1.0, 47.0],
								[0.0, 47.0],
								[0.0, 46.0],
							],
						],
					},
				],
			},
		},
	],
};

const StamenAttribution = () => (
	<span className="map-attribution">
		Map tiles by{" "}
		<a href="http://stamen.com" target="_blank" rel="noreferrer noopener">
			Stamen Design
		</a>
		, under{" "}
		<a href="http://creativecommons.org/licenses/by/3.0" target="_blank" rel="noreferrer noopener">
			CC BY 3.0
		</a>
		. Data by{" "}
		<a href="http://openstreetmap.org" target="_blank" rel="noreferrer noopener">
			OpenStreetMap
		</a>
		, under{" "}
		<a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">
			ODbL
		</a>
		.
	</span>
);

const GeoJsonLoader = ({ link, ...props }: { link: string }): JSX.Element => {
	const [data, setData] = useState(null);

	useEffect(() => {
		fetch(link)
			.then((response) => response.json())
			.then((data) => setData(data));
	}, [link]);

	return data ? <GeoJson data={data} {...props} /> : null;
};

const ExampleCustomOverlay = () => {
	const mapApi = useMapApi();
	const center = mapApi.mapState.center;
	const zoomFactor = 2 ** mapApi.mapState.zoom;

	return (
		<Overlay
			anchor={[49.879, -6.6997]}
			style={{
				background: "blue",
				color: "white",
				width: 5 * zoomFactor,
				fontSize: 0.2 * zoomFactor,
			}}
		>
			I'm a custom overlay that stays a fixed size <br />
			the center of the map is at {center[0].toFixed(4)}, {center[1].toFixed(4)}
		</Overlay>
	);
};

export const Demo = () => {
	const [center, setCenter] = useState([50.1102, 3.1506] as Point);
	const [zoom, setZoom] = useState(6);
	const [goToCenter, setGoToCenter] = useState([50.1102, 3.1506] as Point);
	const [goToZoom, setGoToZoom] = useState(6);
	const [provider, setProvider] = useState("osm");
	const [metaWheelZoom, setMetaWheelZoom] = useState(false);
	const [twoFingerDrag, setTwoFingerDrag] = useState(false);
	const [animate, setAnimate] = useState(true);
	const [animating, setAnimating] = useState(false);
	const [zoomSnap, setZoomSnap] = useState(true);
	const [mouseEvents, setMouseEvents] = useState(true);
	const [touchEvents, setTouchEvents] = useState(true);
	const [minZoom, setMinZoom] = useState(1);
	const [maxZoom, setMaxZoom] = useState(18);
	const [dragAnchor, setDragAnchor] = useState([48.8565, 2.3475]);

	let providerFunction = providers[provider];
	if (provider === "maptiler") {
		providerFunction = providerFunction("wrAA6s63uzhKow7wUsFT", "streets");
	}

	return (
		<div className={"container"}>
			<div>
				<PigeonMap
					limitBounds="edge"
					goToCenter={goToCenter}
					goToZoom={goToZoom}
					provider={providerFunction}
					dprs={provider === "osm" ? [1] : [1, 2]}
					onBoundsChanged={({ center, zoom, bounds, initial, isAnimating }) => {
						if (initial) {
							console.log("Got initial bounds: ", bounds);
						}
						setCenter(center);
						setZoom(zoom);
					}}
					onClick={({ event, latLng, pixel }) => {
						console.log("Map clicked!", latLng, pixel);
					}}
					onAnimationStart={() => {
						setAnimating(true);
					}}
					onAnimationStop={() => {
						setAnimating(false);
					}}
					animate={animate}
					metaWheelZoom={metaWheelZoom}
					twoFingerDrag={twoFingerDrag}
					enableZoomSnap={zoomSnap}
					enableMouseEvents={mouseEvents}
					enableTouchEvents={touchEvents}
					minZoom={minZoom}
					maxZoom={maxZoom}
					attribution={
						provider === "stamenTerrain" || provider === "stamenToner" ? (
							<StamenAttribution />
						) : null
					}
					width={900}
					height={500}
				>
					<ExampleCustomOverlay />
					<Marker anchor={[-50, 80]} height={80} />
					{Object.keys(markers).map((key, index) => (
						<Marker
							key={key}
							anchor={markers[key][0]}
							onClick={() => {
								console.log(`Marker #${key} clicked at: `, markers[key][0]);
							}}
							onMouseOver={() => {
								console.log(`Marker #${key} mouse over`);
							}}
							height={34 + 10 * index}
						/>
					))}
					<Draggable
						anchor={dragAnchor}
						onDragEnd={(dragAnchor) => setDragAnchor(dragAnchor)}
						offset={[60, 87]}
						style={{
							clipPath:
								"polygon(100% 0, 83% 0, 79% 15%, 0 68%, 0 78%, 39% 84%, 43% 96%, 61% 100%, 79% 90%, 69% 84%, 88% 71%, 100% 15%)",
						}}
					>
						<PigeonIcon width={100} height={95} />
					</Draggable>
					<GeoJsonLoader
						link="https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/main/2_bundeslaender/4_niedrig.geo.json"
						styleCallback={(feature, hover) =>
							hover
								? { fill: "#93c0d099", strokeWidth: "2", stroke: "white" }
								: {
										fill: "#d4e6ec99",
										strokeWidth: "1",
										stroke: "white",
										r: "20",
									}
						}
					/>
					<GeoJson
						data={geoJsonSample}
						styleCallback={(feature, hover) => {
							if (feature.geometry.type === "LineString") {
								return { strokeWidth: "1", stroke: "black" };
							}
							return {
								fill: "#ff000099",
								strokeWidth: "1",
								stroke: "white",
								r: "4",
							};
						}}
						onClick={({ event, payload }) => {
							console.log("GeoJson clicked!", event, payload);
						}}
					/>
					<Overlay anchor={[50.879, 4.6997]} style={{ background: "red" }}>
						<span>I'm some overlay text</span>
					</Overlay>
					<ZoomControl />
				</PigeonMap>
				<div className="mapControls">
					<div style={{ marginTop: 20 }}>
						Visit:
						{Object.keys(markers).map((key) => (
							<button
								type="button"
								className="button button--secondary button--sm"
								style={{ margin: "0 10px" }}
								key={key}
								onClick={() => {
									setCenter(markers[key][0]);
									setZoom(markers[key][1]);
									setGoToCenter(markers[key][0]);
									setGoToZoom(markers[key][1]);
								}}
							>
								{key}
							</button>
						))}
						<button
							type="button"
							className="button button--secondary button--sm"
							style={{ margin: "0 10px" }}
							onClick={() => {
								setCenter(dragAnchor);
								setZoom(5);
								setGoToCenter(dragAnchor);
								setGoToZoom(5);
							}}
						>
							Pigeon
						</button>
					</div>
					<div style={{ marginTop: 20 }}>
						Map Layer:
						{Object.keys(providers).map((key) => (
							<button
								type="button"
								key={key}
								onClick={() => setProvider(key)}
								className="button button--secondary button--sm"
								style={{
									margin: "0 10px",
									fontWeight: provider === key ? "bold" : "normal",
								}}
							>
								{key}
							</button>
						))}
					</div>
					<div style={{ marginTop: 20 }}>
						Zoom controls:
						<button
							type="button"
							style={{ margin: "0 10px" }}
							onClick={() => {
								setGoToZoom(Math.min(zoom + 1, 18));
							}}
						>
							Zoom In
						</button>
						<button
							type="button"
							style={{ margin: "0 10px" }}
							onClick={() => {
								setGoToZoom(Math.max(zoom - 1, 1));
							}}
						>
							Zoom Out
						</button>
					</div>
					<div style={{ marginTop: 20 }}>
						Options:
						<label>
							<input type="checkbox" checked={animate} onChange={() => setAnimate(!animate)} />
							animation
						</label>
						<label>
							<input
								type="checkbox"
								checked={twoFingerDrag}
								onChange={() => setTwoFingerDrag(!twoFingerDrag)}
							/>
							two finger drag
						</label>
						<label>
							<input
								type="checkbox"
								checked={metaWheelZoom}
								onChange={() => setMetaWheelZoom(!metaWheelZoom)}
							/>
							meta wheel zoom
						</label>
						<label>
							<input type="checkbox" checked={zoomSnap} onChange={() => setZoomSnap(!zoomSnap)} />
							zoom snap
						</label>
						<label>
							<input
								type="checkbox"
								checked={mouseEvents}
								onChange={() => setMouseEvents(!mouseEvents)}
							/>
							mouse events
						</label>
						<label>
							<input
								type="checkbox"
								checked={touchEvents}
								onChange={() => setTouchEvents(!touchEvents)}
							/>
							touch events
						</label>
					</div>
					<div style={{ marginTop: 20 }}>
						minZoom:{" "}
						<input
							onChange={(e) => setMinZoom(Number.parseInt(e.target.value) || 1)}
							value={minZoom}
							type="number"
							style={{ width: 40 }}
						/>{" "}
						maxZoom:{" "}
						<input
							onChange={(e) => setMaxZoom(Number.parseInt(e.target.value) || 18)}
							value={maxZoom}
							type="number"
							style={{ width: 40 }}
						/>
					</div>
				</div>
			</div>
			<div style={{ textAlign: "center", marginTop: 50 }}>
				<table>
					<thead>
						<tr>
							<th>Property</th>
							<th>Value</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>center (lat/lng)</td>
							<td>{`${center[0].toFixed(4)}, ${center[1].toFixed(4)}`}</td>
						</tr>
						<tr>
							<td>center (tile coordinates)</td>
							<td>{`${lat2tile(center[0], zoom).toFixed(4)}, ${lng2tile(center[1], zoom).toFixed(4)}`}</td>
						</tr>
						<tr>
							<td>zoom</td>
							<td>{zoom.toFixed(2)}</td>
						</tr>
						<tr>
							<td>animation state</td>
							<td>{animating ? "animating" : "stopped"}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
};
