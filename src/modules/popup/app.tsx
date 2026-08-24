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
					<div style={styles.title}>
						{view === "chartShortcuts"
							? "Chart Shortcuts"
							: view === "hideRatings"
								? "Hide Ratings"
								: view === "hideReviews"
									? "Hide Reviews"
									: view === "hideVotes"
										? "Hide Votes"
										: "EvenBetterRYM"}
					</div>
					<div style={styles.subtitle}>
						{view === "chartShortcuts"
							? "Customize keyboard shortcuts"
							: view === "features"
								? "RateYourMusic Enhancements"
								: "Configure visibility"}
					</div>
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

			{view === "chartShortcuts" ? (
				<ShortcutView onSettingsChange={() => setNeedsReload(true)} />
			) : view === "hideRatings" ? (
				<RatingVisibilityView onSettingsChange={() => setNeedsReload(true)} />
			) : view === "hideReviews" ? (
				<ReviewVisibilityView onSettingsChange={() => setNeedsReload(true)} />
			) : view === "hideVotes" ? (
				<VoteVisibilityView onSettingsChange={() => setNeedsReload(true)} />
			) : (
				<main style={styles.list}>
					{features === null ? (
						<LoadingIndicator />
					) : (
						featureGroups.map(([label, keys]) => {
							const expanded = expandedGroups.has(label);
							return (
								<div key={label} style={styles.card}>
									<button
										type="button"
										aria-expanded={expanded}
										onClick={() =>
											setExpandedGroups((current) => {
												const next = new Set(current);
												if (next.has(label)) next.delete(label);
												else next.add(label);
												return next;
											})
										}
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
														onClick={() => setView("chartShortcuts")}
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
														onClick={() => setView(key)}
														style={styles.customizeButton}
													>
														Configure
													</button>
												)}
												<Toggle
													checked={features[key]}
													onChange={() => void toggle(key)}
												/>
											</label>
										))}
								</div>
							);
						})
					)}
				</main>
			)}
		</div>
	);
}

function LoadingIndicator() {
	return (
		<div style={styles.loading} role="status">
			<span aria-hidden="true">⏳</span>
			<span>Loading settings…</span>
		</div>
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
