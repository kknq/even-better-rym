import { useEffect, useState } from "preact/hooks";

import {
	getUserPageSettings,
	setUserPageSettings,
	type UserPageSettings,
} from "~/shared/user-page/settings";

import { Toggle } from "./app";
import { styles } from "./styles";

export function UserPageView({
	onSettingsChange,
}: Readonly<{ onSettingsChange: () => void }>) {
	const [settings, setSettings] = useState<UserPageSettings | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		void getUserPageSettings()
			.then(setSettings)
			.catch((error: unknown) => {
				console.error(
					"EvenBetterRYM: could not load user page settings",
					error,
				);
				setError("Could not load settings. Reopen the popup to try again.");
			});
	}, []);

	const toggle = async (key: keyof UserPageSettings): Promise<void> => {
		if (!settings || saving) return;
		const next = { ...settings, [key]: !settings[key] };
		setSaving(true);
		setError(null);
		try {
			await setUserPageSettings(next);
			setSettings(next);
			onSettingsChange();
		} catch (error) {
			console.error("EvenBetterRYM: could not save user page settings", error);
			setError("Could not save settings. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<main style={styles.list}>
			{error && <div role="alert">{error}</div>}
			{!settings && !error && <div style={styles.loading}>Loading...</div>}
			{settings && (
				<div style={styles.card}>
					<div style={styles.groupHeader}>Profile features</div>
					<label style={{ ...styles.row, ...styles.rowDivider }}>
						<span style={styles.label}>
							Follow status
							<span class="ebr-hint">Show whether other users follow you.</span>
						</span>
						<Toggle
							checked={settings.followStatus}
							disabled={saving}
							onChange={() => void toggle("followStatus")}
						/>
					</label>
					<label style={styles.row}>
						<span style={styles.label}>
							Profile edit boxes
							<span class="ebr-hint">
								Edit favorite artists and other comments on your own profile.
							</span>
						</span>
						<Toggle
							checked={settings.editBoxes}
							disabled={saving}
							onChange={() => void toggle("editBoxes")}
						/>
					</label>
				</div>
			)}
		</main>
	);
}
