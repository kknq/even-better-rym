import {
	getOfflineLocationById,
	getOfflineLocationByName,
	latLonToSmallMapCoords,
} from "./geocode";

function findSvgWithLocs(): SVGSVGElement | null {
	const svgs = Array.from(document.querySelectorAll("svg"));

	for (const svg of svgs) {
		if (svg.querySelector('[id^="loc_"]')) return svg;
		if (svg.querySelector("[cx]")) return svg;
	}

	return null;
}

function parseId(el: Element): string | null {
	const match = /loc_\d+/i.exec(el.id || "");
	return match ? match[0].toLowerCase() : null;
}

function applyOfflineLocations(
	locEls: Element[],
	svg: SVGSVGElement | null,
): void {
	for (const el of locEls) {
		const id = parseId(el);

		if (!id) continue;

		const offline = getOfflineLocationById(id);

		if (!offline) continue;

		const { cx, cy } = latLonToSmallMapCoords(offline.lat, offline.lon);

		if (el instanceof SVGElement) {
			el.setAttribute("cx", String(cx));
			el.setAttribute("cy", String(cy));
			el.classList.add("rymmt-small-map-applied");
		} else if (svg) {
			const target = svg.querySelector(`#${CSS.escape(el.id)}`);

			if (target) {
				target.setAttribute("cx", String(cx));
				target.setAttribute("cy", String(cy));
				target.classList.add("rymmt-small-map-applied");
			}
		}
	}
}

function applyCityNameMatches(textCandidates: HTMLElement[]): void {
	for (const el of textCandidates) {
		const txt = (el.textContent || "").trim();

		if (!txt) continue;

		const offlineByName = getOfflineLocationByName(txt);

		if (!offlineByName) continue;

		const svg = findSvgWithLocs();

		if (!svg) continue;

		const child = Array.from(svg.querySelectorAll("[id], [data-name]")).find(
			(candidate) => {
				const id = candidate.getAttribute("id") ?? "";
				const dataName = candidate.getAttribute("data-name") ?? "";

				return (
					id.toLowerCase().includes(txt.toLowerCase()) ||
					dataName.toLowerCase().includes(txt.toLowerCase())
				);
			},
		);

		if (!(child instanceof SVGElement)) continue;

		const { cx, cy } = latLonToSmallMapCoords(
			offlineByName.lat,
			offlineByName.lon,
		);

		child.setAttribute("cx", String(cx));
		child.setAttribute("cy", String(cy));
		child.classList.add("rymmt-small-map-applied");
	}
}

export function applySmallMapCoords(): void {
	try {
		const svg = findSvgWithLocs();
		const locEls = Array.from(document.querySelectorAll('[id^="loc_"]'));

		applyOfflineLocations(locEls, svg);

		const textCandidates = Array.from(
			document.querySelectorAll<HTMLElement>(".show_venue, li, span"),
		).slice(0, 500);

		applyCityNameMatches(textCandidates);
	} catch (error: unknown) {
		if (error instanceof DOMException) {
			console.warn("[map][overlay] DOM error during apply", error.message);
		} else if (error instanceof TypeError) {
			console.warn("[map][overlay] Type error during apply", error.message);
		} else if (error instanceof RangeError) {
			console.warn("[map][overlay] Range error during apply", error.message);
		} else {
			console.warn("[map][overlay] Unexpected error during apply", error);
		}
	}
}

export function clearSmallMapOverlay(): void {
	try {
		const applied = Array.from(
			document.querySelectorAll(".rymmt-small-map-applied"),
		);

		for (const el of applied) {
			if (el instanceof SVGElement) {
				el.removeAttribute("cx");
				el.removeAttribute("cy");
			}

			el.classList.remove("rymmt-small-map-applied");
		}
	} catch (error: unknown) {
		if (error instanceof DOMException) {
			console.warn("[map][overlay] DOM error during cleanup", error.message);
		} else if (error instanceof TypeError) {
			console.warn("[map][overlay] Type error during cleanup", error.message);
		} else {
			console.warn("[map][overlay] Unexpected error during cleanup", error);
		}
	}
}

export default { applySmallMapCoords, clearSmallMapOverlay };
