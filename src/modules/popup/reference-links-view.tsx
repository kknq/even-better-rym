import { useEffect, useState } from "preact/hooks";

import {
	defaultReferenceLinkSettings,
	getReferenceLinkSettings,
	type ReferenceLinkSettings,
	setReferenceLinkSettings,
} from "~/shared/reference-links/settings";

import { styles } from "./styles";

export function ReferenceLinksView({
	onSettingsChange,
}: Readonly<{
	onSettingsChange: () => void;
}>) {
	const [settings, setSettings] = useState<ReferenceLinkSettings | null>(null);

	useEffect(() => {
		void getReferenceLinkSettings().then(setSettings);
	}, []);

	const updateColor = async (
		key: keyof ReferenceLinkSettings,
		color: string,
	) => {
		if (!settings) return;
		const next = { ...settings, [key]: color };
		await setReferenceLinkSettings(next);
		setSettings(next);
		onSettingsChange();
	};

	if (!settings) return <div style={styles.loading}>Loading…</div>;

	return (
		<main style={styles.list}>
			<div style={styles.card}>
				<div style={styles.groupHeader}>Button color</div>
				<label style={styles.row}>
					<span style={styles.label}>WhoSampled and Wikipedia buttons</span>
					<input
						type="color"
						aria-label="Reference link button color"
						value={settings.buttonColor}
						onChange={(event) =>
							void updateColor("buttonColor", event.currentTarget.value)
						}
						style={styles.colorInput}
					/>
				</label>
				<div style={styles.resetRow}>
					<button
						type="button"
						onClick={() => {
							void setReferenceLinkSettings(defaultReferenceLinkSettings).then(
								() => {
									setSettings(defaultReferenceLinkSettings);
									onSettingsChange();
								},
							);
						}}
						style={styles.resetButton}
					>
						Reset button color
					</button>
				</div>
			</div>
		</main>
	);
}
