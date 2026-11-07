import { useCallback, useEffect, useState } from "preact/hooks";
import {
	getSelectedTypes,
	setSelectedTypes,
} from "~/shared/discography-progress/settings";
import { type ReleaseType, releaseTypes } from "~/shared/release-types";
import { styles } from "./styles";

export function DiscographyProgressView() {
	const [selected, setSelected] = useState<Set<ReleaseType> | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const load = useCallback(async () => {
		setError("");
		try {
			setSelected(await getSelectedTypes());
		} catch (error) {
			console.error("EvenBetterRYM: could not load coverage settings", error);
			setError("Could not load discography settings.");
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const toggle = async (type: ReleaseType) => {
		if (!selected || saving) return;
		const next = new Set(selected);
		if (next.has(type)) next.delete(type);
		else next.add(type);
		setSaving(true);
		setError("");
		try {
			await setSelectedTypes(next);
			setSelected(next);
		} catch (error) {
			console.error("EvenBetterRYM: could not save coverage settings", error);
			setError("Could not save release types. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const loadingContent = error ? (
		<button
			type="button"
			onClick={() => void load()}
			style={styles.resetButton}
		>
			Retry
		</button>
	) : (
		<div style={styles.loading}>Loading...</div>
	);

	return (
		<main lang="en" style={styles.list}>
			{error && <p role="alert">{error}</p>}
			{selected === null ? (
				loadingContent
			) : (
				<>
					<p>
						Choose which release types count toward overall discography
						coverage. Albums, EPs and mixtapes are included by default.
						Individual category bars are always shown. Changes apply to open
						artist pages immediately. Missing releases load automatically only
						for selected types; other categories have a Load coverage button.
					</p>
					<div style={styles.card}>
						<div style={styles.groupHeader}>Overall coverage release types</div>
						{(Object.keys(releaseTypes) as ReleaseType[]).map(
							(type, index, types) => (
								<label
									key={type}
									style={{
										...styles.row,
										...(index < types.length - 1 ? styles.rowDivider : {}),
									}}
								>
									<span style={styles.label}>{releaseTypes[type].label}</span>
									<input
										type="checkbox"
										checked={selected.has(type)}
										disabled={saving}
										onChange={() => void toggle(type)}
									/>
								</label>
							),
						)}
					</div>
				</>
			)}
		</main>
	);
}
