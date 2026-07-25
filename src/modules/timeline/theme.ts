import { getEffectiveBackgroundColor, isDarkPage } from "~/shared/utils/theme";

// Apply CSS vars to panel so its UI harmonizes with page theme
export function applyRymThemeVars(
	panelEl: HTMLElement,
	headerEl: HTMLElement | null,
): void {
	const backgroundColor = getEffectiveBackgroundColor(headerEl ?? panelEl);
	const isDark = isDarkPage(headerEl ?? panelEl);

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
		panelEl.style.setProperty(
			"--rymmt-marker-border",
			"rgba(255,255,255,0.32)",
		);
		panelEl.style.setProperty("--rymmt-album-color", "#94a3b8"); // slate-400
		panelEl.style.setProperty("--rymmt-live-color", "#fbbf24"); // amber-400
		panelEl.style.setProperty("--rymmt-ep-color", "#2dd4bf"); // teal-400
		panelEl.style.setProperty("--rymmt-single-color", "#fb923c"); // orange-400
		panelEl.style.setProperty("--rymmt-additional-color", "#c4b5fd"); // violet-300
		panelEl.style.setProperty("--rymmt-show-color", "#38bdf8"); // sky-400
		panelEl.style.setProperty("--rymmt-link-color", "#60a5fa"); // blue-400 for dark mode
		panelEl.style.setProperty("--rymmt-link-hover-color", "#93c5fd");
		panelEl.style.setProperty("--rymmt-row-alt-bg", "rgb(21, 30, 46)"); // dark alternating row
	} else {
		panelEl.style.setProperty("--rymmt-track-border", "rgba(0,0,0,0.35)");
		panelEl.style.setProperty("--rymmt-panel-border", "rgba(0,0,0,0.35)");
		panelEl.style.setProperty("--rymmt-muted-text", "rgba(0,0,0,0.65)");
		panelEl.style.setProperty("--rymmt-tick-color", "rgba(0,0,0,0.18)");
		panelEl.style.setProperty("--rymmt-tick-major-color", "rgba(0,0,0,0.30)");
		panelEl.style.setProperty("--rymmt-marker-halo", "rgba(255,255,255,0.55)");
		panelEl.style.setProperty("--rymmt-bar-outline", "rgba(0,0,0,0.35)");
		panelEl.style.setProperty("--rymmt-marker-border", "rgba(0,0,0,0.60)");
		panelEl.style.setProperty("--rymmt-album-color", "#334155"); // slate-700
		panelEl.style.setProperty("--rymmt-live-color", "#92400e"); // amber-800
		panelEl.style.setProperty("--rymmt-ep-color", "#0f766e"); // teal-700
		panelEl.style.setProperty("--rymmt-single-color", "#c2410c"); // orange-700
		panelEl.style.setProperty("--rymmt-additional-color", "#6d28d9"); // violet-700
		panelEl.style.setProperty("--rymmt-show-color", "#0c4a6e"); // sky-950
		panelEl.style.setProperty("--rymmt-link-color", "#0645ad"); // blue-700 for light mode
		panelEl.style.setProperty("--rymmt-link-hover-color", "#0b539c");
		panelEl.style.setProperty("--rymmt-row-alt-bg", "rgb(217, 219, 220)"); // light alternating row
	}

	panelEl.dataset.rymmtIsDark = isDark ? "1" : "0";
}
