import { useEffect, useMemo, useRef } from "preact/hooks";
import { Loader } from "~/shared/components/loader";
import { isDarkPage } from "~/shared/utils/theme";
import { geocodeCity, getCachedCity, latLonToSmallMapCoords } from "./geocode";
import { SMALL_MAP_SVG } from "./map-svg";
import type { CityPoint } from "./types";

type Props = {
	cities?: (string | CityPoint)[];
};

const SVG_NS = "http://www.w3.org/2000/svg";
const MARKER_GROUP_CLASS = "rymmt-small-map-markers";

function sanitizeHtml(html: string) {
	return html.replace(/onclick="[^"]*"/g, "");
}

function getMarkerGroup(svg: SVGSVGElement) {
	const transformGroup = svg.querySelector<SVGGElement>(
		'g[transform^="translate"]',
	);
	const parent =
		transformGroup ?? (svg.firstElementChild as SVGGElement | null) ?? svg;
	let group = parent.querySelector<SVGGElement>(`.${MARKER_GROUP_CLASS}`);
	if (!group) {
		group = document.createElementNS(SVG_NS, "g");
		group.setAttribute("class", MARKER_GROUP_CLASS);
		group.setAttribute("transform", "translate(0,-5)");
		parent.appendChild(group);
	}
	return group;
}

function createMarker(point: CityPoint, index: number) {
	const { cx, cy } = latLonToSmallMapCoords(point.lat, point.lon);
	const circle = document.createElementNS(SVG_NS, "circle");
	circle.setAttribute("class", "rymmt-small-map-marker");

	// Explicit numeric values for radius and stroke to ensure TS controls sizing
	const r = 3;
	const strokeW = 1.5;

	// Set attributes and inline styles so RYM's page CSS cannot override markers.
	circle.setAttribute("r", String(r));
	circle.setAttribute("cx", String(cx));
	circle.setAttribute("cy", String(cy));
	circle.setAttribute("fill", "rgb(255, 255, 255)");
	circle.setAttribute("stroke", "#fff");
	circle.setAttribute("stroke-width", String(strokeW));
	circle.setAttribute("opacity", "0.45");
	circle.style.setProperty("fill", "rgb(255, 255, 255)", "important");
	circle.style.setProperty("stroke", "#fff", "important");
	circle.style.setProperty("stroke-width", String(strokeW), "important");
	circle.style.setProperty("opacity", "0.45", "important");
	circle.dataset.city = point.name;
	circle.dataset.index = String(index);
	circle.setAttribute("title", point.name);

	// Also set SVG DOM properties where available to avoid CSS or server-side markup
	// from overriding the numeric radius/position values.
	try {
		circle.r.baseVal.value = r;
		circle.cx.baseVal.value = cx;
		circle.cy.baseVal.value = cy;
		circle.setAttribute("stroke-width", String(strokeW));
	} catch (error) {
		// TODO: Decide whether SVG DOM property failures should be reported.
		console.warn("Failed to set SVG marker DOM properties", error);
	}

	return circle;
}

function fillMapContainer(svg: SVGSVGElement): void {
	svg.setAttribute("preserveAspectRatio", "none");
	svg.style.setProperty("display", "block", "important");
	svg.style.setProperty("width", "100%", "important");
	svg.style.setProperty("height", "100%", "important");
}

function configureLoadingOverlay(
	overlay: HTMLDivElement | null,
	root: HTMLDivElement,
	hasCities: boolean,
): void {
	if (!overlay) return;
	if (!hasCities) {
		overlay.style.display = "none";
		return;
	}

	const dark = isDarkPage(root);
	overlay.style.display = "flex";
	overlay.style.background = dark
		? "rgba(30, 30, 30, 0.75)"
		: "rgba(190, 190, 190, 0.65)";
	overlay.style.color = dark ? "rgba(255,255,255,0.85)" : "rgba(30,30,30,0.85)";
}

function removePreRenderedMarkers(root: HTMLDivElement): void {
	const preGroups = root.querySelectorAll<SVGGElement>(
		`.${MARKER_GROUP_CLASS}`,
	);
	for (const group of preGroups) {
		try {
			group.innerHTML = "";
		} catch (error) {
			console.warn("Failed to clear pre-rendered marker group", error);
			group.remove();
		}
	}

	for (const marker of root.querySelectorAll<SVGElement>(
		".rymmt-small-map-marker",
	)) {
		marker.remove();
	}
}

async function appendCityPoints(
	cities: readonly (string | CityPoint)[],
	points: CityPoint[],
	isActive: () => boolean,
): Promise<void> {
	for (const city of cities) {
		if (!isActive()) return;
		if (typeof city !== "string") {
			points.push(city);
			continue;
		}

		const cached = getCachedCity(city);
		if (cached) {
			points.push(cached);
			continue;
		}

		const geocoded = await geocodeCity(city);
		if (geocoded) points.push(geocoded);
	}
}

function renderMarkers(
	markerGroup: SVGGElement,
	points: readonly CityPoint[],
	overlay: HTMLDivElement | null,
): void {
	markerGroup.innerHTML = "";
	for (const [index, point] of points.entries()) {
		markerGroup.appendChild(createMarker(point, index));
	}
	if (overlay) overlay.style.display = "none";
}

function loadMapMarkers(
	cities: readonly (string | CityPoint)[],
	markerGroup: SVGGElement,
	overlay: HTMLDivElement | null,
	isActive: () => boolean,
): void {
	const points: CityPoint[] = [];
	void appendCityPoints(cities, points, isActive)
		.catch((error) => {
			console.error("Failed to render map markers:", error);
		})
		.finally(() => {
			if (isActive()) renderMarkers(markerGroup, points, overlay);
		});
}

function loadMapEffect(
	root: HTMLDivElement | null,
	overlay: HTMLDivElement | null,
	cities: readonly (string | CityPoint)[],
): (() => void) | undefined {
	if (!root) return;

	configureLoadingOverlay(overlay, root, cities.length > 0);
	removePreRenderedMarkers(root);

	const svg = root.querySelector("svg");
	if (!svg || !(svg instanceof SVGSVGElement)) return;

	fillMapContainer(svg);
	const markerGroup = getMarkerGroup(svg);
	markerGroup.innerHTML = "";

	let active = true;
	loadMapMarkers(cities, markerGroup, overlay, () => active);

	return () => {
		active = false;
	};
}

export default function MapApp({ cities = [] }: Readonly<Props>) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const overlayRef = useRef<HTMLDivElement | null>(null);
	const mapHtml = useMemo(() => sanitizeHtml(SMALL_MAP_SVG), []);

	useEffect(
		() => loadMapEffect(containerRef.current, overlayRef.current, cities),
		[cities],
	);

	return (
		<div
			class="rymmt-small-map-wrapper"
			style={{
				position: "relative",
				width: "100%",
				height: "0",
				paddingBottom: "55%",
				overflow: "hidden",
				borderRadius: "3px",
			}}
		>
			<div
				class="rymmt-small-map-root"
				ref={containerRef}
				style={{
					position: "absolute",
					top: "0",
					left: "0",
					width: "100%",
					height: "100%",
				}}
				dangerouslySetInnerHTML={{ __html: mapHtml }}
			/>
			<div
				class="rymmt-map-loading-overlay"
				ref={overlayRef}
				style={{
					display: "none",
					position: "absolute",
					top: "0",
					right: "0",
					bottom: "0",
					left: "0",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					zIndex: 10,
					borderRadius: "3px",
				}}
			>
				<div
					class="rymmt-map-loading-content"
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "12px",
					}}
				>
					<Loader width="48" height="48" />
					<div class="rymmt-map-loading-text">Building map...</div>
				</div>
			</div>
		</div>
	);
}
