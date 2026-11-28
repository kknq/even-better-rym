import { useEffect, useState } from "preact/hooks";
import {
	getExtensiveLogging,
	setExtensiveLogging,
} from "~/shared/debug-settings";
import { Toggle } from "./app";
import { styles } from "./styles";

export function DebugOptions() {
	const [enabled, setEnabled] = useState<boolean | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const load = async () => {
		setError("");
		try {
			setEnabled(await getExtensiveLogging());
		} catch (error) {
			console.error("EvenBetterRYM: could not load debug settings", error);
			setError("Could not load debug settings.");
		}
	};

	useEffect(() => {
		void load();
	}, []);

	const toggle = async () => {
		if (enabled === null || saving) return;
		setSaving(true);
		setError("");
		try {
			await setExtensiveLogging(!enabled);
			setEnabled(!enabled);
		} catch (error) {
			console.error("EvenBetterRYM: could not save debug settings", error);
			setError("Could not save debug settings.");
		} finally {
			setSaving(false);
		}
	};

	const loadingContent = error ? (
		<button type="button" onClick={() => void load()}>
			Retry
		</button>
	) : (
		<div style={styles.loading}>Loading settings...</div>
	);

	return (
		<>
			{error && <p role="alert">{error}</p>}
			{enabled === null ? (
				loadingContent
			) : (
				<label style={styles.row}>
					<span id="extensive-logging-label" style={styles.label}>
						Extensive logging{" "}
						<span class="ebr-hint">
							Save Spotify failure diagnostics and enable additional console
							logging.
						</span>
					</span>
					<Toggle
						checked={enabled}
						disabled={saving}
						labelledBy="extensive-logging-label"
						onChange={() => void toggle()}
					/>
				</label>
			)}
		</>
	);
}
