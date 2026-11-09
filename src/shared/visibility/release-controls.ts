import styles from "./release-controls.css?inline";

export const setupReleaseVisibilityLayout = (): void => {
	document.body.classList.add("ebr-release-visibility-enabled");
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

	setupReleaseVisibilityLayout();

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

	const controls = document.createElement("div");
	controls.id = "ebr-release-visibility-controls";
	content.append(header, controls);
	section.appendChild(content);
	if (anchor) anchor.after(section);
	else fallback?.prepend(section);

	return controls;
};
