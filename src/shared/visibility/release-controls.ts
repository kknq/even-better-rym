import styles from "./release-controls.css?inline";
import type { ReleaseControlLayout } from "./settings";

export const setupReleaseVisibilityLayout = (
	layout: ReleaseControlLayout = "inline",
): void => {
	document.body.classList.add("ebr-release-visibility-enabled");
	document.body.dataset.ebrReleaseControlLayout = layout;
	if (document.getElementById("ebr-release-visibility-styles")) return;

	const style = document.createElement("style");
	style.id = "ebr-release-visibility-styles";
	style.textContent = styles;
	document.documentElement.appendChild(style);
};

export const getReleaseVisibilityControls = (): HTMLElement | null => {
	const existing = document.getElementById("ebr-release-visibility-controls");
	if (existing) return existing;

	const catalog = document.querySelector(".release_my_catalog");
	const anchor = catalog?.closest(".section_my_catalog") ?? catalog;
	const fallback = document.querySelector(
		".page_release_section_reviews, #content",
	);
	if (!anchor && !fallback) return null;

	setupReleaseVisibilityLayout(
		document.body.dataset.ebrReleaseControlLayout === "section"
			? "section"
			: "inline",
	);

	const controls = document.createElement("div");
	controls.id = "ebr-release-visibility-controls";
	if (document.body.dataset.ebrReleaseControlLayout === "inline" && catalog) {
		catalog.classList.add("ebr-release-catalog-inline");
		controls.className = "ebr-release-visibility-inline";
		const nativeControl =
			catalog.querySelector(".my_catalog_rate_tracks") ??
			catalog.querySelector(".my_catalog_review");
		const clear = catalog.querySelector(".clear");
		if (nativeControl) nativeControl.after(controls);
		else if (clear) clear.before(controls);
		else catalog.appendChild(controls);
		return controls;
	}

	const section = document.createElement("section");
	section.className = "ebr-release-visibility";
	section.setAttribute("aria-label", "Content visibility");

	const content = document.createElement("div");
	content.className = "page_section";
	const header = document.createElement("div");
	header.className = "release_page_header";
	const heading = document.createElement("h2");
	heading.textContent = "Content visibility";
	header.appendChild(heading);

	content.append(header, controls);
	section.appendChild(content);
	if (anchor) anchor.after(section);
	else fallback?.prepend(section);

	return controls;
};
