import {
	type CollectionColumn,
	type CollectionKind,
	type CollectionView,
	collectionColumns,
	isNamedCollectionView,
} from "~/shared/collection/options";
import type { CollectionSettings } from "~/shared/collection/settings";

export function splitCollectionModifiers(modifiers: string) {
	return modifiers.split(/\s*(?:,|%2c)\s*/i).filter(Boolean);
}

export function parseCollectionUrl(href: string) {
	const url = new URL(href);
	const parts = url.pathname.split("/");
	const index = parts.findIndex((part) => /^(?:film_)?collection$/i.test(part));
	if (index === -1) throw new Error("Not a collection URL");
	const tokens = splitCollectionModifiers(parts[index + 2] ?? "");
	const columns: CollectionColumn[] = [];
	const kind: CollectionKind =
		parts[index].toLowerCase() === "film_collection" ? "film" : "music";
	if (tokens[0] === "d.rp") {
		tokens.shift();
		while (tokens[0] && tokens[0] in collectionColumns) {
			columns.push(tokens.shift() as CollectionColumn);
		}
	}
	return {
		url,
		kind,
		base: parts.slice(0, index + 2).join("/"),
		modifiers: tokens,
		columns,
		view: tokens.find(isNamedCollectionView) ?? "default",
		tail: parts.slice(index + 3).filter(Boolean),
		user: decodeURIComponent(parts[index + 1]),
	};
}

export function collectionUrl(
	href: string,
	changes: {
		family?: "status" | "format" | "rating" | "type" | "pageSize";
		value?: string;
		columns?: CollectionColumn[];
		search?: { type: string; query: string };
		preservePage?: boolean;
		view?: CollectionView;
	},
) {
	const current = parseCollectionUrl(href);
	const patterns = {
		status: /^o[owun]+$/,
		format: /^fmt\./,
		rating: /^r\d/,
		type: /^typ/,
		pageSize: /^n\d+$/,
	};
	const modifiers = current.modifiers.filter(
		(modifier) =>
			(!changes.family || !patterns[changes.family].test(modifier)) &&
			!isNamedCollectionView(modifier),
	);
	if (changes.family && changes.value) modifiers.push(changes.value);
	const view = changes.view ?? current.view;
	const columns =
		current.kind === "music" && view === "default"
			? (changes.columns ?? current.columns)
			: [];
	const hasSearch = current.modifiers.some((modifier) =>
		/^(?:strm_|stag$)/.test(modifier),
	);
	let tail = [...current.tail];
	if (
		!changes.preservePage &&
		tail.length > (hasSearch ? 1 : 0) &&
		/^\d+$/.test(tail[tail.length - 1])
	) {
		tail.pop();
	}
	if (changes.search) {
		const { type, query } = changes.search;
		for (let i = modifiers.length - 1; i >= 0; i--) {
			if (/^(?:strm_|stag$)/.test(modifiers[i])) modifiers.splice(i, 1);
		}
		tail = [];
		if (query.trim()) {
			modifiers.push(type === "g" ? "stag" : `strm_${type}`);
			tail = [encodeURIComponent(query.trim()).replace(/%20/g, "+")];
		}
		// RYM tag views cannot be combined with other view options.
		if (type === "g" && query.trim()) {
			return `${current.base}/stag/${tail[0]}/${current.url.search}${current.url.hash}`;
		}
	}
	const search = modifiers.filter((modifier) =>
		/^(?:strm_|stag$)/.test(modifier),
	);
	const tokens = [
		...(view === "default" ? [] : [view]),
		...(columns.length ? ["d.rp", ...columns] : []),
		...modifiers.filter((modifier) => !search.includes(modifier)),
		...search,
	];
	const path = [
		current.base,
		...(tokens.length ? [tokens.join(",")] : []),
		...tail,
	].join("/");
	return `${path}/${current.url.search}${current.url.hash}`;
}

export function savedCollectionUrl(href: string, settings: CollectionSettings) {
	const current = parseCollectionUrl(href);
	if (current.modifiers.includes("stag")) return null;
	const columnsChanged =
		current.kind === "film"
			? current.columns.length > 0
			: Boolean(
					current.view === "default" &&
						settings.columns?.length &&
						settings.columns.join(",") !== current.columns.join(","),
				);
	const pageSizeChanged =
		settings.pageSize !== null &&
		!current.modifiers.includes(`n${settings.pageSize}`);
	if (!columnsChanged && !pageSizeChanged) return null;
	return collectionUrl(href, {
		columns: columnsChanged
			? current.kind === "film"
				? []
				: (settings.columns ?? undefined)
			: undefined,
		family: pageSizeChanged ? "pageSize" : undefined,
		value: pageSizeChanged ? `n${settings.pageSize}` : undefined,
		preservePage: !pageSizeChanged,
	});
}

export function collectionFilterValue(
	href: string,
	family: "status" | "format",
) {
	const { modifiers } = parseCollectionUrl(href);
	const value = modifiers.find((modifier) =>
		family === "status"
			? /^o[owun]+$/.test(modifier)
			: modifier.startsWith("fmt."),
	);
	return family === "status"
		? (value?.slice(1).split("") ?? [])
		: (value?.slice(4).split(".") ?? []);
}
