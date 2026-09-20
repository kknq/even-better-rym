import { useEffect, useState } from "preact/hooks";
import browser from "webextension-polyfill";

import { getAllPageEnabled, setPageEnabled } from "~/shared/page-settings";
import type { PageKey } from "~/shared/pages";
import { featureGroups, pageHints, pageLabels } from "~/shared/pages";

import { ShortcutView } from "./shortcut-view";
import { styles } from "./styles";
import { RatingVisibilityView, ReviewVisibilityView } from "./visibility-view";
import { VoteVisibilityView } from "./vote-visibility-view";

type FeatureState = Record<PageKey, boolean>;
type View =
	| "features"
	| "chartShortcuts"
	| "hideRatings"
	| "hideReviews"
	| "hideVotes";

const viewTitles: Record<View, string> = {
	features: "EvenBetterRYM",
	chartShortcuts: "Chart Shortcuts",
	hideRatings: "Hide Ratings",
	hideReviews: "Hide Reviews",
	hideVotes: "Hide Votes",
};

const viewSubtitles: Record<View, string> = {
	features: "RateYourMusic Enhancements",
	chartShortcuts: "Customize keyboard shortcuts",
	hideRatings: "Configure visibility",
	hideReviews: "Configure visibility",
	hideVotes: "Configure visibility",
};

export function App() {
	const [view, setView] = useState<View>("features");
	const [features, setFeatures] = useState<FeatureState | null>(null);
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
		() => new Set(),
	);
	const [needsReload, setNeedsReload] = useState(false);

	useEffect(() => {
		void getAllPageEnabled().then(setFeatures);
	}, []);

	const toggle = async (key: PageKey) => {
		if (!features) return;
		const next = !features[key];
		await setPageEnabled(key, next);
		setFeatures((prev) => prev && { ...prev, [key]: next });
		setNeedsReload(true);
	};

	const toggleGroup = (label: string) => {
		setExpandedGroups((current) => {
			const next = new Set(current);
			if (next.has(label)) next.delete(label);
			else next.add(label);
			return next;
		});
	};

	return (
		<div style={styles.root}>
			<header style={styles.header}>
				{view !== "features" ? (
					<button
						type="button"
						onClick={() => setView("features")}
						style={styles.backButton}
						aria-label="Back"
						title="Back"
					>
						←
					</button>
				) : (
					<img
						src={browser.runtime.getURL("icons/sonemic-48.png")}
						width={28}
						height={28}
						alt=""
						style={styles.logo}
					/>
				)}
				<div>
					<div style={styles.title}>{viewTitles[view]}</div>
					<div style={styles.subtitle}>{viewSubtitles[view]}</div>
				</div>
			</header>
			{needsReload && (
				<div style={styles.reloadNotice}>
					<span>
						Reload the current page if this change does not apply immediately.
					</span>
					<button
						type="button"
						onClick={() => setNeedsReload(false)}
						aria-label="Dismiss reload notice"
						style={styles.reloadNoticeDismiss}
					>
						×
					</button>
				</div>
			)}
			<SettingsContent
				view={view}
				features={features}
				expandedGroups={expandedGroups}
				onSettingsChange={() => setNeedsReload(true)}
				onToggleGroup={toggleGroup}
				onToggleFeature={toggle}
				onChangeView={setView}
			/>
		</div>
	);
}

function SettingsContent({
	view,
	features,
	expandedGroups,
	onSettingsChange,
	onToggleGroup,
	onToggleFeature,
	onChangeView,
}: Readonly<{
	view: View;
	features: FeatureState | null;
	expandedGroups: Set<string>;
	onSettingsChange: () => void;
	onToggleGroup: (label: string) => void;
	onToggleFeature: (key: PageKey) => Promise<void>;
	onChangeView: (view: View) => void;
}>) {
	switch (view) {
		case "chartShortcuts":
			return <ShortcutView onSettingsChange={onSettingsChange} />;
		case "hideRatings":
			return <RatingVisibilityView onSettingsChange={onSettingsChange} />;
		case "hideReviews":
			return <ReviewVisibilityView onSettingsChange={onSettingsChange} />;
		case "hideVotes":
			return <VoteVisibilityView onSettingsChange={onSettingsChange} />;
		default:
			return (
				<FeatureList
					features={features}
					expandedGroups={expandedGroups}
					onToggleGroup={onToggleGroup}
					onToggleFeature={onToggleFeature}
					onChangeView={onChangeView}
				/>
			);
	}
}

function FeatureList({
	features,
	expandedGroups,
	onToggleGroup,
	onToggleFeature,
	onChangeView,
}: Readonly<{
	features: FeatureState | null;
	expandedGroups: Set<string>;
	onToggleGroup: (label: string) => void;
	onToggleFeature: (key: PageKey) => Promise<void>;
	onChangeView: (view: View) => void;
}>) {
	if (features === null) {
		return (
			<main style={styles.list}>
				<LoadingIndicator />
			</main>
		);
	}

	return (
		<main style={styles.list}>
			{featureGroups.map(([label, keys]) => {
				const expanded = expandedGroups.has(label);
				return (
					<div key={label} style={styles.card}>
						<button
							type="button"
							aria-expanded={expanded}
							onClick={() => onToggleGroup(label)}
							style={styles.groupHeader}
						>
							<span>{label}</span>
							<span aria-hidden="true">{expanded ? "⌄" : "›"}</span>
						</button>
						{expanded &&
							keys.map((key, i) => (
								<label
									key={key}
									style={{
										...styles.row,
										...(i < keys.length - 1 ? styles.rowDivider : {}),
									}}
								>
									<span style={styles.label}>
										{pageLabels[key]}
										<span class="ebr-hint">{pageHints[key]}</span>
									</span>
									{key === "chartShortcuts" && (
										<button
											type="button"
											onClick={() => onChangeView("chartShortcuts")}
											style={styles.customizeButton}
										>
											Customize shortcuts
										</button>
									)}
									{(key === "hideRatings" ||
										key === "hideReviews" ||
										key === "hideVotes") && (
										<button
											type="button"
											onClick={() => onChangeView(key)}
											style={styles.customizeButton}
										>
											Configure
										</button>
									)}
									<Toggle
										checked={features[key]}
										onChange={() => void onToggleFeature(key)}
									/>
								</label>
							))}
					</div>
				);
			})}
		</main>
	);
}

function LoadingIndicator() {
	return (
		<output style={styles.loading}>
			<span aria-hidden="true">⏳</span>
			<span>Loading settings…</span>
		</output>
	);
}

export function Toggle({
	checked,
	onChange,
}: Readonly<{
	checked: boolean;
	onChange: () => void;
}>) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={onChange}
			style={{
				...styles.toggle,
				background: checked ? "#4286c4" : "#d0d0d0",
			}}
		>
			<span
				style={{
					...styles.thumb,
					transform: checked ? "translateX(18px)" : "translateX(2px)",
				}}
			/>
		</button>
	);
}
