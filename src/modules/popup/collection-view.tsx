import { CollectionSettingsControls } from "~/shared/collection/controls";
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
			{(["filters", "columns"] as const)
				.filter((section) => kind === "music" || section !== "columns")
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
						</div>
					</div>
				))}
		</main>
	);
}
