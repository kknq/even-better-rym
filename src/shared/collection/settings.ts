import * as storage from "~/shared/utils/storage";

import {
	type CollectionColumn,
	type CollectionFilter,
	type CollectionKind,
	collectionColumns,
} from "./options";

export {
	type CollectionColumn,
	type CollectionFilter,
	type CollectionKind,
	collectionColumns,
	collectionFilters,
} from "./options";
export type CollectionSettings = {
	filters: Record<CollectionFilter, boolean>;
	columns: CollectionColumn[] | null;
	columnManagement: boolean;
	pageSize: number | null;
};
type CollectionSettingsOverrides = Omit<
	Partial<CollectionSettings>,
	"filters"
> & {
	filters?: Partial<CollectionSettings["filters"]>;
};

export const collectionSettingsKey = (kind: CollectionKind) =>
	`brym.collection.${kind}`;

export function defaultCollectionColumns(
	kind: CollectionKind,
): CollectionColumn[] {
	return ["aat", "r", "ts", kind === "film" ? "f" : "al", "o", "g"];
}

export function mergeCollectionSettings(
	settings?: CollectionSettingsOverrides,
	kind: CollectionKind = "music",
): CollectionSettings {
	return {
		filters: {
			search: true,
			status: true,
			rating: true,
			type: true,
			format: false,
			views: false,
			...settings?.filters,
		},
		columns:
			kind === "film"
				? null
				: (settings?.columns?.filter((column) => column in collectionColumns) ??
					null),
		columnManagement: kind === "music" && (settings?.columnManagement ?? true),
		pageSize: isCollectionPageSize(settings?.pageSize)
			? settings.pageSize
			: null,
	};
}

export function isCollectionPageSize(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export async function getCollectionSettings(kind: CollectionKind) {
	return mergeCollectionSettings(
		await storage.get<CollectionSettingsOverrides>(collectionSettingsKey(kind)),
		kind,
	);
}

export function setCollectionSettings(
	kind: CollectionKind,
	settings: CollectionSettings,
) {
	return storage.set(
		collectionSettingsKey(kind),
		mergeCollectionSettings(settings, kind),
	);
}
