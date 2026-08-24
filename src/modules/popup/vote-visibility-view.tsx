import { useEffect, useState } from "preact/hooks";

import {
	getVoteVisibilitySettings,
	setVoteVisibilitySettings,
	type VoteVisibilitySettings,
} from "~/shared/hide-votes/settings";

import { Toggle } from "./app";
import { styles } from "./styles";

export function VoteVisibilityView({
	onSettingsChange,
}: Readonly<{
	onSettingsChange: () => void;
}>) {
	const [settings, setSettings] = useState<VoteVisibilitySettings | null>(null);

	useEffect(() => {
		void getVoteVisibilitySettings().then(setSettings);
	}, []);

	const save = (next: VoteVisibilitySettings) => {
		setSettings(next);
		void setVoteVisibilitySettings(next);
		onSettingsChange();
	};

	if (!settings) return <div style={styles.loading}>Loading…</div>;

	return (
		<main style={styles.list}>
			<div style={styles.card}>
				<div style={styles.groupHeader}>Default visibility</div>
				<div style={{ ...styles.row, ...styles.rowDivider }}>
					<span style={styles.label}>Hide genre votes by default</span>
					<Toggle
						checked={settings.genres}
						onChange={() => save({ ...settings, genres: !settings.genres })}
					/>
				</div>
				<div style={styles.row}>
					<span style={styles.label}>Hide descriptor votes by default</span>
					<Toggle
						checked={settings.descriptors}
						onChange={() =>
							save({ ...settings, descriptors: !settings.descriptors })
						}
					/>
				</div>
			</div>
		</main>
	);
}
