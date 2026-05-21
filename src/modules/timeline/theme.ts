import type { RGB } from "./types";

function isTransparent(color: string): boolean {
	if (!color) return true;
	return color === "transparent" || color === "rgba(0, 0, 0, 0)";
}

// Walk up DOM to find first non-transparent background color
function getEffectiveBackgroundColor(el: HTMLElement | null): string {
	let current: HTMLElement | null = el;
	for (let i = 0; i < 25 && current; i++) {
		const backgroundColor =
			globalThis.getComputedStyle(current).backgroundColor;
		if (!isTransparent(backgroundColor)) return backgroundColor;
		current = current.parentElement;
	}
	return (
		globalThis.getComputedStyle(document.body).backgroundColor ||
		"rgb(255,255,255)"
	);
}

function parseRgb(rgb: string): RGB {
	const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(rgb || "");
	if (!m) return { r: 255, g: 255, b: 255 };
	return { r: +m[1], g: +m[2], b: +m[3] };
}

// Relative luminance for contrast decisions
function luminance({ r, g, b }: RGB): number {
	const srgb = [r, g, b].map((v: number) => {
		v /= 255;
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

// Apply CSS vars to panel so its UI harmonizes with page theme
export function applyRymThemeVars(
	panelEl: HTMLElement,
	headerEl: HTMLElement | null,
): void {
	const backgroundColor = getEffectiveBackgroundColor(headerEl ?? panelEl);
	const rgb = parseRgb(backgroundColor);
	const isDark = luminance(rgb) < 0.35;

	const bodyColor =
		globalThis.getComputedStyle(document.body).color || "rgb(220,220,220)";
	const hdrColor = headerEl
		? globalThis.getComputedStyle(headerEl).color
		: bodyColor;

	panelEl.style.setProperty("--rymmt-panel-bg", backgroundColor);
	panelEl.style.setProperty("--rymmt-track-bg", backgroundColor);
	panelEl.style.setProperty("--rymmt-panel-text", hdrColor);
	panelEl.style.setProperty("--rymmt-track-border", "rgba(255,255,255,0.55)");
	panelEl.style.setProperty("--rymmt-panel-border", "rgba(255,255,255,0.45)");
	panelEl.style.setProperty("--rymmt-muted-text", "rgba(255,255,255,0.85)");

	if (isDark) {
		panelEl.style.setProperty("--rymmt-tick-color", "rgba(255,255,255,0.25)");
		panelEl.style.setProperty(
			"--rymmt-tick-major-color",
			"rgba(255,255,255,0.45)",
		);
		panelEl.style.setProperty("--rymmt-marker-halo", "rgba(0,0,0,0.55)");
		panelEl.style.setProperty("--rymmt-bar-outline", "rgba(0,0,0,0.45)");
		panelEl.style.setProperty("--rymmt-album-color", "#ffffff");
		panelEl.style.setProperty("--rymmt-live-color", "#bdbdbd");
	} else {
		panelEl.style.setProperty("--rymmt-track-border", "rgba(0,0,0,0.35)");
		panelEl.style.setProperty("--rymmt-panel-border", "rgba(0,0,0,0.35)");
		panelEl.style.setProperty("--rymmt-muted-text", "rgba(0,0,0,0.65)");
		panelEl.style.setProperty("--rymmt-tick-color", "rgba(0,0,0,0.18)");
		panelEl.style.setProperty("--rymmt-tick-major-color", "rgba(0,0,0,0.30)");
		panelEl.style.setProperty("--rymmt-marker-halo", "rgba(255,255,255,0.55)");
		panelEl.style.setProperty("--rymmt-bar-outline", "rgba(0,0,0,0.35)");
		panelEl.style.setProperty("--rymmt-album-color", "#000000");
		panelEl.style.setProperty("--rymmt-live-color", "#666666");
	}

	panelEl.dataset.rymmtIsDark = isDark ? "1" : "0";
}
