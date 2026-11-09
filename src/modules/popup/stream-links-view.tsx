import { useEffect, useState } from "preact/hooks";

import { SEARCHABLES } from "~/shared/services";
import {
	defaultStreamLinkColors,
	getStreamLinkSettings,
	type StreamLinkSettings,
	setStreamLinkSettings,
} from "~/shared/stream-links/settings";

import { styles } from "./styles";

export function StreamLinksView({
	onSettingsChange,
}: Readonly<{ onSettingsChange: () => void }>) {
	const [settings, setSettings] = useState<StreamLinkSettings | null>(null);

	useEffect(() => {
		void getStreamLinkSettings().then(setSettings);
	}, []);

	const update = async (next: StreamLinkSettings) => {
		await setStreamLinkSettings(next);
		setSettings(next);
		onSettingsChange();
	};

	if (!settings) return <div style={styles.loading}>Loading...</div>;

	return (
		<main style={styles.list}>
			<div style={styles.card}>
				<div style={styles.groupHeader}>Icon colors</div>
				<label style={styles.row}>
					<span style={styles.label}>Use service branding colors</span>
					<input
						type="checkbox"
						checked={settings.useServiceColors}
						onChange={(event) =>
							void update({
								...settings,
								useServiceColors: event.currentTarget.checked,
							})
						}
					/>
				</label>
				{settings.useServiceColors && (
					<>
						{SEARCHABLES.map((service) => (
							<label key={service.id} style={styles.row}>
								<span style={styles.label}>{service.name}</span>
								<input
									type="color"
									aria-label={`${service.name} icon color`}
									value={settings.colors[service.id]}
									onChange={(event) =>
										void update({
											...settings,
											colors: {
												...settings.colors,
												[service.id]: event.currentTarget.value,
											},
										})
									}
									style={styles.colorInput}
								/>
							</label>
						))}
						<div style={styles.resetRow}>
							<button
								type="button"
								onClick={() =>
									void update({
										...settings,
										colors: { ...defaultStreamLinkColors },
									})
								}
								style={styles.resetButton}
							>
								Reset to branding colors
							</button>
						</div>
					</>
				)}
			</div>
		</main>
	);
}
