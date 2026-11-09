import { type ReleaseType, releaseTypes } from "~/shared/release-types";

export const sectionOrderKey = "discography-order.types";

// Matches the order RYM uses for artist discography sections.
export const defaultSectionOrder = Object.keys(releaseTypes) as ReleaseType[];

export function isDefaultSectionOrder(order: readonly ReleaseType[]): boolean {
	return (
		order.length === defaultSectionOrder.length &&
		order.every((type, index) => type === defaultSectionOrder[index])
	);
}

export function parseSectionOrder(stored: unknown): ReleaseType[] {
	const order = Array.isArray(stored)
		? stored.filter(
				(type, index): type is ReleaseType =>
					typeof type === "string" &&
					type in releaseTypes &&
					stored.indexOf(type) === index,
			)
		: [];
	// Types missing from a saved order follow their default predecessor.
	defaultSectionOrder.forEach((type, index) => {
		if (order.includes(type)) return;
		const previous = index > 0 ? defaultSectionOrder[index - 1] : undefined;
		order.splice(previous ? order.indexOf(previous) + 1 : 0, 0, type);
	});
	return order;
}
