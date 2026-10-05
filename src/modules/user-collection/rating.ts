export type RatingSelection = {
	mode: "all" | "single" | "range" | "rated" | "unrated";
	from: number;
	to: number;
};

export function ratingModifier(selection: RatingSelection) {
	if (selection.mode === "all") return "";
	if (selection.mode === "unrated") return "r0.0";
	if (selection.mode === "rated") return "r0.5-5.0";
	const minimum = selection.mode === "range" ? 0 : 0.5;
	const valid = (value: number) =>
		value >= minimum && value <= 5 && Number.isInteger(value * 2);
	if (
		!valid(selection.from) ||
		(selection.mode === "range" && !valid(selection.to))
	) {
		throw new Error(
			`Choose ratings from ${minimum.toFixed(1)} to 5.0 in half-star steps.`,
		);
	}
	if (selection.mode === "single") return `r${selection.from.toFixed(1)}`;
	if (selection.from > selection.to) {
		throw new Error("The From rating must not exceed the To rating.");
	}
	return selection.from === selection.to
		? `r${selection.from.toFixed(1)}`
		: `r${selection.from.toFixed(1)}-${selection.to.toFixed(1)}`;
}

export function parseRatingSelection(modifier?: string): RatingSelection {
	const defaults = { from: 0.5, to: 5 };
	if (!modifier) return { ...defaults, mode: "all" };
	if (modifier === "r0.0" || modifier === "r0")
		return { ...defaults, mode: "unrated" };
	if (modifier === "r0.5-5.0") return { ...defaults, mode: "rated" };
	const match = /^r(\d(?:\.\d)?)(?:-(\d(?:\.\d)?))?$/.exec(modifier);
	if (!match) throw new Error(`Unsupported rating filter: ${modifier}`);
	const selection: RatingSelection = {
		mode: match[2] ? "range" : "single",
		from: Number(match[1]),
		to: Number(match[2] ?? match[1]),
	};
	ratingModifier(selection);
	return selection;
}
