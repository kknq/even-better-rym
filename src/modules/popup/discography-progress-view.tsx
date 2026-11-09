import { useCallback, useEffect, useState } from "preact/hooks";
import {
	getHideZeroCoverage,
	getSelectedTypes,
	setHideZeroCoverage,
	setSelectedTypes,
} from "~/shared/discography-progress/settings";
import { type ReleaseType, releaseTypes } from "~/shared/release-types";
import { styles } from "./styles";

export function DiscographyProgressView() {
	const [selected, setSelected] = useState<Set<ReleaseType> | null>(null);
	const [hideZeroCoverage, updateHideZeroCoverage] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const load = useCallback(async () => {
		setError("");
		try {
			const [types, hideZero] = await Promise.all([
				getSelectedTypes(),
				getHideZeroCoverage(),
			]);
			setSelected(types);
			updateHideZeroCoverage(hideZero);
		} catch (error) {
			console.error("EvenBetterRYM: could not load coverage settings", error);
			setError("Could not load discography settings.");
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const saveSetting = async (update: () => Promise<void>, message: string) => {
		if (saving) return;
		setSaving(true);
		setError("");
		try {
			await update();
		} catch (error) {
			console.error("EvenBetterRYM: could not save coverage settings", error);
			setError(message);
		} finally {
			setSaving(false);
		}
	};

	const toggle = async (type: ReleaseType) => {
		if (!selected) return;
		const next = new Set(selected);
		if (next.has(type)) next.delete(type);
		else next.add(type);
		await saveSetting(async () => {
			await setSelectedTypes(next);
			setSelected(next);
		}, "Could not save release types. Please try again.");
	};

	const toggleHideZeroCoverage = async () => {
		const next = !hideZeroCoverage;
		await saveSetting(async () => {
			await setHideZeroCoverage(next);
			updateHideZeroCoverage(next);
		}, "Could not save coverage visibility. Please try again.");
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
						<label style={styles.row}>
							<span style={styles.label}>
								Hide overall discography coverage when it is zero
							</span>
							<input
								type="checkbox"
								checked={hideZeroCoverage}
								disabled={saving}
								onChange={() => void toggleHideZeroCoverage()}
							/>
						</label>
					</div>
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
