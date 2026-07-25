import { useEffect, useMemo, useRef } from "preact/hooks";
import { Loader } from "~/shared/components/loader";
import { isDarkPage } from "~/shared/utils/theme";
import { geocodeCity, getCachedCity, latLonToSmallMapCoords } from "./geocode";
import { SMALL_MAP_SVG } from "./map-svg";
import type { CityPoint } from "./types";
import "./map.css";

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

	// Set attributes (works in all browsers)
	circle.setAttribute("r", String(r));
	circle.setAttribute("cx", String(cx));
	circle.setAttribute("cy", String(cy));
	circle.setAttribute("fill", "rgb(255, 255, 255)");
	circle.setAttribute("stroke", "#fff");
	circle.setAttribute("stroke-width", String(strokeW));
	circle.setAttribute("opacity", "0.45");
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

export default function MapApp({ cities = [] }: Readonly<Props>) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const overlayRef = useRef<HTMLDivElement | null>(null);
	const mapHtml = useMemo(() => sanitizeHtml(SMALL_MAP_SVG), []);

	useEffect(() => {
		let active = true;
		const root = containerRef.current;
		const overlay = overlayRef.current;
		if (!root) return;

		// Show overlay while geocoding (only if there are cities to resolve)
		if (overlay) {
			if (cities.length > 0) {
				const dark = isDarkPage(root);
				overlay.style.display = "flex";
				overlay.style.background = dark
					? "rgba(30, 30, 30, 0.75)"
					: "rgba(190, 190, 190, 0.65)";
				overlay.style.color = dark
					? "rgba(255,255,255,0.85)"
					: "rgba(30,30,30,0.85)";
			} else {
				overlay.style.display = "none";
			}
		}

		// Remove any pre-rendered marker groups or individual marker elements
		// so the TypeScript runtime fully controls marker rendering.
		const preGroups = root.querySelectorAll<SVGGElement>(
			`.${MARKER_GROUP_CLASS}`,
		);
		for (const g of Array.from(preGroups)) {
			try {
				g.innerHTML = "";
			} catch (error) {
				// TODO: Decide whether marker cleanup failures should be reported.
				console.warn("Failed to clear pre-rendered marker group", error);
				g.remove();
			}
		}
		const preMarkers = root.querySelectorAll<SVGElement>(
			".rymmt-small-map-marker",
		);
		for (const m of Array.from(preMarkers)) {
			m.remove();
		}

		const svg = root.querySelector("svg");
		if (!svg || !(svg instanceof SVGSVGElement)) return;

		const markerGroup = getMarkerGroup(svg);
		markerGroup.innerHTML = "";

		const loadMarkers = async () => {
			const points: CityPoint[] = [];
			try {
				for (const city of cities) {
					if (!active) return;
					if (typeof city === "string") {
						const cached = getCachedCity(city);
						if (cached) {
							points.push(cached);
							continue;
						}
						const g = await geocodeCity(city);
						if (g) points.push(g);
					} else {
						points.push(city);
					}
				}
			} finally {
				if (active) {
					markerGroup.innerHTML = "";
					for (const [index, point] of points.entries()) {
						markerGroup.appendChild(createMarker(point, index));
					}
					if (overlay) overlay.style.display = "none";
				}
			}
		};

		loadMarkers().catch((error) => {
			console.error("Failed to render map markers:", error);
			if (overlay) overlay.style.display = "none";
		});

		return () => {
			active = false;
		};
	}, [cities]);

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
