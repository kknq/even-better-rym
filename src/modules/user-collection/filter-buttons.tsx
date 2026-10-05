import { useState } from "preact/hooks";
import {
	type CollectionKind,
	type CollectionView,
	collectionViews,
	isCollectionFilterSupported,
} from "~/shared/collection/options";
import type { CollectionSettings } from "~/shared/collection/settings";
import { Checkbox } from "~/shared/components/checkbox";

import { FilterButton } from "./filter-button";
import { RatingFilter } from "./rating-filter";
import {
	collectionFilterValue,
	collectionUrl,
	parseCollectionUrl,
} from "./url";

export function FilterButtons({
	kind,
	settings,
}: Readonly<{
	kind: CollectionKind;
	settings: CollectionSettings;
}>) {
	return (
		<div
			style={{
				lineHeight: "30px",
				display: "grid",
				gridTemplateColumns: "auto 1fr",
				columnGap: "6px",
				rowGap: "6px",
			}}
		>
			{isCollectionFilterSupported(kind, "views") && settings.filters.views && (
				<>
					<div>Views:</div>
					<ViewButtons settings={settings} />
				</>
			)}
			{settings.filters.status && (
				<>
					<div>Status:</div>
					<MultipleFilter family="status" options={STATUS} />
				</>
			)}

			{settings.filters.rating && (
				<>
					<div>Rating:</div>
					<RatingFilter />
				</>
			)}

			{isCollectionFilterSupported(kind, "type") && settings.filters.type && (
				<>
					<div>Type:</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
						{RELEASE_TYPES.map(([name, modifier]) => (
							<FilterButton
								key={name}
								name={name}
								base="typ"
								modifier={modifier}
							/>
						))}
					</div>
				</>
			)}
			{isCollectionFilterSupported(kind, "format") &&
				settings.filters.format && (
					<>
						<div>Format:</div>
						<MultipleFilter
							family="format"
							options={FORMATS.map((format) => [format, format] as const)}
						/>
					</>
				)}
		</div>
	);
}

function ViewButtons({ settings }: Readonly<{ settings: CollectionSettings }>) {
	const current = parseCollectionUrl(location.href);
	return (
		<div
			class="ebr-collection-views"
			style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}
		>
			{(Object.keys(collectionViews) as CollectionView[]).map((view) => (
				<a
					key={view}
					class="btn"
					aria-current={current.view === view ? "page" : undefined}
					style={{
						background:
							current.view === view ? "var(--gen-blue-lightest)" : undefined,
					}}
					href={collectionUrl(location.href, {
						view,
						columns: view === "default" ? (settings.columns ?? []) : undefined,
					})}
				>
					{collectionViews[view]}
				</a>
			))}
		</div>
	);
}

const RELEASE_TYPES = [
	["Albums", "typs"],
	["EPs", "type"],
	["Singles", "typi"],
	["Music Videos", "typo"],
	["Mixtapes", "typm"],
	["DJ Mixes", "typj"],
	["Compilations", "typc"],
	["Videos", "typd"],
	["Bootlegs", "typb"],
	["Additional Releases", "typx"],
] as const;

const STATUS = [
	["Owned", "o"],
	["Used to Own", "u"],
	["Wishlist", "w"],
	["Not Owned", "n"],
] as const;

const FORMATS = [
	"CD",
	"LP",
	"Cassette",
	"Minidisc",
	"MP3",
	"DVD-A",
	"SACD",
	"Multiple",
	"8-Track",
	"CD-R",
	"Other",
	"DVD",
	"VHS",
];

function MultipleFilter({
	family,
	options,
}: Readonly<{
	family: "status" | "format";
	options: readonly (readonly [string, string])[];
}>) {
	const [selected, setSelected] = useState(() =>
		collectionFilterValue(location.href, family),
	);
	const value = selected.length
		? family === "status"
			? `o${selected.join("")}`
			: `fmt.${selected.join(".")}`
		: "";
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				location.assign(collectionUrl(location.href, { family, value }));
			}}
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				gap: "4px",
			}}
		>
			{options.map(([label, token]) => (
				<label
					key={token}
					class="btn ebr-collection-choice"
					style={{
						background: selected.includes(token)
							? "var(--gen-blue-lightest)"
							: undefined,
					}}
				>
					<Checkbox
						checked={selected.includes(token)}
						onChange={() =>
							setSelected(
								selected.includes(token)
									? selected.filter((item) => item !== token)
									: [...selected, token],
							)
						}
					/>{" "}
					{label}
				</label>
			))}
			<button type="submit" class="btn btn_small blue_btn">
				Apply
			</button>
			<button
				type="button"
				class="btn btn_small"
				onClick={() =>
					location.assign(collectionUrl(location.href, { family, value: "" }))
				}
			>
				Clear
			</button>
		</form>
	);
}
