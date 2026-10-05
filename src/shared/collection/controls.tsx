import { isCollectionFilterSupported } from "./options";
import {
	type CollectionKind,
	type CollectionSettings,
	collectionColumns,
	collectionFilters,
	defaultCollectionColumns,
} from "./settings";

export function CollectionSettingsControls({
	kind,
	settings,
	section,
	onChange,
}: Readonly<{
	kind: CollectionKind;
	settings: CollectionSettings;
	section: "filters" | "columns";
	onChange: (settings: CollectionSettings) => void;
}>) {
	if (section === "filters") {
		return (
			<div style={{ display: "grid", gap: "8px" }}>
				{Object.entries(collectionFilters).map(([key, label]) => {
					const filter = key as keyof typeof collectionFilters;
					if (!isCollectionFilterSupported(kind, filter)) return null;
					return (
						<label
							key={filter}
							style={{ display: "flex", alignItems: "center", gap: "7px" }}
						>
							<Checkbox
								checked={settings.filters[filter]}
								onChange={() =>
									onChange({
										...settings,
										filters: {
											...settings.filters,
											[filter]: !settings.filters[filter],
										},
									})
								}
							/>{" "}
							{label}
						</label>
					);
				})}
			</div>
		);
	}

	if (kind === "film") return null;

	const selected = settings.columns ?? defaultCollectionColumns(kind);
	const available = Object.keys(collectionColumns).filter(
		(key) => !selected.includes(key as keyof typeof collectionColumns),
	) as (keyof typeof collectionColumns)[];
	return (
		<div style={{ display: "grid", gap: "8px" }}>
			{[...selected, ...available].map((column) => {
				const index = selected.indexOf(column);
				const move = (offset: number) => {
					const columns = [...selected];
					columns.splice(index, 1);
					columns.splice(index + offset, 0, column);
					onChange({ ...settings, columns });
				};
				return (
					<div
						key={column}
						style={{ display: "flex", alignItems: "center", gap: "6px" }}
					>
						<label
							style={{
								flex: 1,
								display: "flex",
								alignItems: "center",
								gap: "7px",
							}}
						>
							<Checkbox
								checked={index !== -1}
								disabled={index !== -1 && selected.length === 1}
								onChange={() =>
									onChange({
										...settings,
										columns:
											index === -1
												? [...selected, column]
												: selected.filter((value) => value !== column),
									})
								}
							/>{" "}
							{collectionColumns[column]}
						</label>
						{index !== -1 && (
							<>
								<button
									type="button"
									style={arrowStyle(index === 0)}
									disabled={index === 0}
									onClick={() => move(-1)}
									aria-label={`Move ${collectionColumns[column]} up`}
								>
									<span aria-hidden="true">↑</span>
								</button>
								<button
									type="button"
									style={arrowStyle(index === selected.length - 1)}
									disabled={index === selected.length - 1}
									onClick={() => move(1)}
									aria-label={`Move ${collectionColumns[column]} down`}
								>
									<span aria-hidden="true">↓</span>
								</button>
							</>
						)}
					</div>
				);
			})}
		</div>
	);
}

const arrowStyle = (disabled: boolean) => ({
	border: 0,
	borderRadius: "3px",
	background: "transparent",
	color: disabled ? "var(--mono-a, #aaa)" : "var(--gen-blue-med, #2865a8)",
	fontSize: "20px",
	lineHeight: "24px",
	width: "26px",
	padding: 0,
	cursor: disabled ? "default" : "pointer",
});

import { Checkbox } from "~/shared/components/checkbox";
