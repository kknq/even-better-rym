import { useEffect, useState } from "preact/hooks";

import type { ChartShortcutActionId } from "~/shared/chart-shortcuts/actions";
import {
	CHART_SHORTCUT_ACTIONS,
	CHART_SHORTCUT_GROUP_LABELS,
} from "~/shared/chart-shortcuts/actions";
import type { ChartShortcutBindings } from "~/shared/chart-shortcuts/binding";
import {
	findComboConflict,
	formatCombo,
} from "~/shared/chart-shortcuts/binding";
import {
	defaultBindings,
	getChartShortcutBindings,
	setChartShortcutBindings,
} from "~/shared/chart-shortcuts/settings";
import { groupBy } from "~/shared/utils/array";

import { ShortcutRecorder } from "./shortcut-recorder";
import { styles } from "./styles";

const groups = groupBy(CHART_SHORTCUT_ACTIONS, (action) => action.group);

function labelFor(actionId: ChartShortcutActionId): string {
	return (
		CHART_SHORTCUT_ACTIONS.find((action) => action.id === actionId)?.label ??
		actionId
	);
}

export function ShortcutView({
	onSettingsChange,
}: Readonly<{
	onSettingsChange: () => void;
}>) {
	const [bindings, setBindings] = useState<ChartShortcutBindings | null>(null);

	useEffect(() => {
		void getChartShortcutBindings().then(setBindings);
	}, []);

	const save = async (next: ChartShortcutBindings) => {
		setBindings(next);
		await setChartShortcutBindings(next);
		onSettingsChange();
	};

	const removeCombo = (actionId: ChartShortcutActionId, combo: string) => {
		if (!bindings) return;
		void save({
			...bindings,
			[actionId]: bindings[actionId].filter((existing) => existing !== combo),
		});
	};

	const addCombo = (
		actionId: ChartShortcutActionId,
		combo: string,
	): string | null => {
		if (!bindings) return "Not ready yet";

		if (bindings[actionId].includes(combo)) {
			return "Already added to this shortcut";
		}

		const conflict = findComboConflict(bindings, combo, actionId);
		if (conflict) {
			return `Already used by "${labelFor(conflict)}"`;
		}

		void save({ ...bindings, [actionId]: [...bindings[actionId], combo] });
		return null;
	};

	const resetAll = () => {
		void save(defaultBindings());
	};

	if (!bindings) {
		return <div style={styles.loading}>Loading…</div>;
	}

	return (
		<main style={styles.list}>
			{groups.map(([group, actions]) => (
				<div key={group} style={styles.card}>
					<div style={styles.groupHeader}>
						{CHART_SHORTCUT_GROUP_LABELS[group]}
					</div>
					{actions.map((action, i) => (
						<div
							key={action.id}
							style={{
								...styles.shortcutRow,
								...(i < actions.length - 1 ? styles.rowDivider : {}),
							}}
						>
							<span style={styles.shortcutLabel}>{action.label}</span>
							<div style={styles.comboRow}>
								{bindings[action.id].map((combo) => (
									<span key={combo} style={styles.chip}>
										{formatCombo(combo)}
										<button
											type="button"
											aria-label={`Remove ${formatCombo(combo)}`}
											onClick={() => removeCombo(action.id, combo)}
											style={styles.chipRemove}
										>
											×
										</button>
									</span>
								))}
								<ShortcutRecorder
									onCapture={(combo) => addCombo(action.id, combo)}
								/>
							</div>
						</div>
					))}
				</div>
			))}

			<div style={styles.resetRow}>
				<button type="button" onClick={resetAll} style={styles.resetButton}>
					Reset all to defaults
				</button>
			</div>
		</main>
	);
}
