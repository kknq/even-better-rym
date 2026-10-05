import {
	CollectionSettingsControls,
	ColumnManagementControl,
} from "~/shared/collection/controls";
import { PageSizeControl } from "~/shared/collection/page-size-control";
import type { CollectionKind } from "~/shared/collection/settings";
import { useCollectionSettings } from "~/shared/collection/use-settings";

import { styles } from "./styles";

export function CollectionView({
	kind,
	onSettingsChange,
}: Readonly<{
	kind: CollectionKind;
	onSettingsChange: () => void;
}>) {
	const { settings, save, error } = useCollectionSettings(kind);
	if (!settings)
		return <div style={styles.loading}>{error || "Loading..."}</div>;
	return (
		<main style={styles.list}>
			{error && <p role="alert">{error}</p>}
			<p>
				{kind === "music"
					? "Column and page-size changes"
					: "Page-size changes"}{" "}
				are saved for your next navigation. They do not refresh an open
				collection.
				{kind === "music" &&
					" Toggling column management refreshes open music collections immediately."}
			</p>
			<div style={{ ...styles.card, padding: "12px" }}>
				<PageSizeControl
					value={settings.pageSize}
					action="Save"
					onChange={async (pageSize) => {
						await save({ ...settings, pageSize });
						onSettingsChange();
					}}
				/>
			</div>
			{kind === "music" && (
				<div style={{ ...styles.card, padding: "12px" }}>
					<ColumnManagementControl
						settings={settings}
						onChange={(next) => {
							void save(next).then(onSettingsChange).catch(console.error);
						}}
					/>
					<p>
						Disable to remove custom columns from the current URL. Enable to
						apply your saved columns. Your column choices are kept.
					</p>
				</div>
			)}
			{(["filters", "columns"] as const)
				.filter(
					(section) =>
						section !== "columns" ||
						(kind === "music" && settings.columnManagement),
				)
				.map((section) => (
					<div key={section} style={styles.card}>
						<div style={styles.groupHeader}>
							{section === "filters"
								? "Displayed filters"
								: "Displayed columns"}
						</div>
						<div style={{ padding: "12px" }}>
							<CollectionSettingsControls
								kind={kind}
								section={section}
								settings={settings}
								onChange={(next) => {
									void save(next).then(onSettingsChange).catch(console.error);
								}}
							/>
							{section === "columns" && (
								<>
									<button
										type="button"
										style={styles.customizeButton}
										onClick={() => {
											void save({ ...settings, columns: null })
												.then(onSettingsChange)
												.catch(console.error);
										}}
									>
										Restore defaults
									</button>
									<p>Clear saved columns and use RYM's default columns.</p>
								</>
							)}
						</div>
					</div>
				))}
		</main>
	);
}
