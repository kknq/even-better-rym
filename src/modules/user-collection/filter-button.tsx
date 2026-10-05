import type { FunctionComponent } from "preact";
import { useMemo } from "preact/hooks";

import { collectionUrl, parseCollectionUrl } from "./url";

export { splitCollectionModifiers } from "./url";
export const FilterButton: FunctionComponent<{
	name: string;
	base: string;
	modifier: string;
}> = ({ name, base, modifier }) => {
	const url = useMemo(() => makeUrl(base, modifier), [base, modifier]);
	const applied = filterApplied(modifier) ? "background: var(--mono-7)" : "";
	return (
		<a className="btn" style={applied} href={url}>
			{name.toLowerCase()}
		</a>
	);
};

function makeUrl(base: string, modifier: string) {
	return collectionUrl(globalThis.location.href, {
		family: base === "typ" ? "type" : "rating",
		value: filterApplied(modifier) ? "" : modifier,
	});
}

function filterApplied(modifier: string) {
	return parseCollectionUrl(globalThis.location.href).modifiers.includes(
		modifier,
	);
}
