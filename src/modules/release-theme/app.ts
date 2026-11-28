type RGB = [number, number, number];

const parseColor = (value: string): RGB | undefined => {
	const hexMatch = /^#([0-9a-f]{6})$/i.exec(value);
	if (hexMatch) {
		const hex = hexMatch[1];
		return [
			Number.parseInt(hex.slice(0, 2), 16),
			Number.parseInt(hex.slice(2, 4), 16),
			Number.parseInt(hex.slice(4, 6), 16),
		];
	}

	const rgbMatch =
		/^rgba?\(\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i.exec(
			value,
		);
	if (!rgbMatch) return undefined;
	const channels: RGB = [
		Number(rgbMatch[1]),
		Number(rgbMatch[2]),
		Number(rgbMatch[3]),
	];
	return channels.every((channel) => channel >= 0 && channel <= 255)
		? channels
		: undefined;
};

const toHex = ([red, green, blue]: RGB): string =>
	`#${[red, green, blue]
		.map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
		.join("")}`;

const getRelativeLuminance = ([red, green, blue]: RGB): number => {
	const linearize = (channel: number): number => {
		const value = channel / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	};
	return (
		0.2126 * linearize(red) +
		0.7152 * linearize(green) +
		0.0722 * linearize(blue)
	);
};

const mix = (base: RGB, accent: RGB, amount: number): RGB => [
	Math.round(base[0] * (1 - amount) + accent[0] * amount),
	Math.round(base[1] * (1 - amount) + accent[1] * amount),
	Math.round(base[2] * (1 - amount) + accent[2] * amount),
];

const contrast = (first: RGB, second: RGB): number => {
	const luminances = [
		getRelativeLuminance(first),
		getRelativeLuminance(second),
	];
	return (Math.max(...luminances) + 0.05) / (Math.min(...luminances) + 0.05);
};

const contrastingColor = (color: RGB, backgrounds: RGB[], toward: RGB): RGB => {
	for (let step = 0; step <= 100; step++) {
		const candidate = mix(color, toward, step / 100);
		if (
			backgrounds.every((background) => contrast(candidate, background) >= 4.5)
		) {
			return candidate;
		}
	}
	return toward;
};

export const createReleasePalette = (accent: RGB): Record<string, string> => {
	const black: RGB = [0, 0, 0];
	const white: RGB = [255, 255, 255];
	const lightSurface = white;
	const lightRaised = mix([238, 240, 239], accent, 0.15);
	const lightCanvas = white;
	const lightIssues = mix([250, 250, 250], accent, 0.025);
	const lightReleaseView = mix([242, 242, 242], accent, 0.04);
	const lightReleaseViewHover = mix([234, 234, 234], accent, 0.05);
	const controlBackground = lightRaised;
	const controlHover = mix([235, 238, 237], accent, 0.2);
	const darkSurface = mix([18, 22, 24], accent, 0.16);
	const darkRaised = mix([33, 38, 40], accent, 0.2);
	const darkCanvas = mix([12, 16, 18], accent, 0.12);
	const lightBackgrounds = [
		lightSurface,
		lightRaised,
		lightCanvas,
		lightIssues,
		lightReleaseView,
		lightReleaseViewHover,
	];
	const darkBackgrounds = [darkSurface, darkRaised, darkCanvas];
	const lightInk = mix(black, accent, 0.2);
	const darkInk = mix(white, accent, 0.16);
	const colors: Record<string, RGB> = {
		accent,
		button: contrastingColor(accent, [white], black),
		"control-background": controlBackground,
		"control-hover": controlHover,
		"light-surface": lightSurface,
		"light-raised": lightRaised,
		"light-canvas": lightCanvas,
		"light-issues": lightIssues,
		"light-release-view": lightReleaseView,
		"light-release-view-hover": lightReleaseViewHover,
		"light-ink": lightInk,
		"light-muted": contrastingColor(
			mix(lightInk, controlBackground, 0.4),
			lightBackgrounds,
			black,
		),
		"light-link": contrastingColor(accent, lightBackgrounds, black),
		"dark-surface": darkSurface,
		"dark-raised": darkRaised,
		"dark-canvas": darkCanvas,
		"dark-ink": darkInk,
		"dark-muted": contrastingColor(
			mix(darkInk, darkRaised, 0.3),
			darkBackgrounds,
			white,
		),
		"dark-link": contrastingColor(accent, darkBackgrounds, white),
	};
	return Object.fromEntries(
		Object.entries(colors).map(([key, color]) => [key, toHex(color)]),
	);
};

const getPaletteColor = (doc: Document): RGB | undefined => {
	const cells = doc.querySelectorAll<HTMLTableCellElement>(
		"#page_release .release_page .color_bar td",
	);
	for (const cell of cells) {
		const color = parseColor(cell.style.backgroundColor);
		if (color) return color;
	}
	return undefined;
};

export const applyReleaseTheme = (doc: Document = document): boolean => {
	const color = getPaletteColor(doc);
	if (!color) return false;

	const root = doc.documentElement;
	for (const [key, value] of Object.entries(createReleasePalette(color))) {
		root.style.setProperty(`--ebr-release-theme-${key}`, value);
	}
	root.classList.add("ebr-release-theme");
	return true;
};

export const main = (): void => {
	if (document.documentElement.id !== "page_release") return;

	const observer = new MutationObserver(() => {
		if (applyReleaseTheme()) observer.disconnect();
	});
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["style"],
		childList: true,
		subtree: true,
	});
	if (applyReleaseTheme()) {
		observer.disconnect();
		return;
	}

	if (document.readyState === "complete") observer.disconnect();
	else
		window.addEventListener("load", () => observer.disconnect(), {
			once: true,
		});
};
