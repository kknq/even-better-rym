interface RGB {
	r: number;
	g: number;
	b: number;
}

function isTransparent(color: string): boolean {
	if (!color) return true;
	return color === "transparent" || color === "rgba(0, 0, 0, 0)";
}

/** Walk up DOM to find first non-transparent background color */
export function getEffectiveBackgroundColor(el: HTMLElement | null): string {
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

export function parseRgb(rgb: string): RGB {
	const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(rgb || "");
	if (!m) return { r: 255, g: 255, b: 255 };
	return {
		r: Number.parseInt(m[1], 10),
		g: Number.parseInt(m[2], 10),
		b: Number.parseInt(m[3], 10),
	};
}

/** Relative luminance for contrast decisions */
function luminance({ r, g, b }: RGB): number {
	const srgb = [r, g, b].map((v: number) => {
		const norm = v / 255;
		return norm <= 0.03928 ? norm / 12.92 : ((norm + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/** Returns true if the page background near `el` is dark. */
export function isDarkPage(el: HTMLElement | null): boolean {
	const backgroundColor = getEffectiveBackgroundColor(el);
	return luminance(parseRgb(backgroundColor)) < 0.35;
}
