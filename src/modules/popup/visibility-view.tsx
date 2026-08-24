import { useEffect, useState } from "preact/hooks";

import {
	getRatingSettings,
	getReviewSettings,
	type RatingSettings,
	type ReviewSettings,
	reviewVisibilityPages,
	setRatingSettings,
	setReviewSettings,
	visibilityPages,
} from "~/shared/visibility/settings";

import { Toggle } from "./app";
import { styles } from "./styles";

const pageLabels: Record<string, string> = {
	release: "Music release pages",
	film: "Film pages",
	artist: "Artist pages",
	chart: "Chart pages",
	collection: "Collection pages",
	profile: "User profile pages",
	review: "Review pages",
	home: "Home page",
	newMusic: "New music pages",
	genre: "Genre pages",
};

function PageToggles<Page extends string>({
	pages,
	pageTypes,
	onChange,
}: Readonly<{
	pages: Record<Page, boolean>;
	pageTypes: readonly Page[];
	onChange: (page: Page, enabled: boolean) => void;
}>) {
	return (
		<div style={styles.card}>
			<div style={styles.groupHeader}>Pages</div>
			{pageTypes.map((page, index) => (
				<div
					key={page}
					style={{
						...styles.row,
						...(index < pageTypes.length - 1 ? styles.rowDivider : {}),
					}}
				>
					<span style={styles.label}>{pageLabels[page]}</span>
					<Toggle
						checked={pages[page]}
						onChange={() => onChange(page, !pages[page])}
					/>
				</div>
			))}
		</div>
	);
}

export function RatingVisibilityView({
	onSettingsChange,
}: Readonly<{
	onSettingsChange: () => void;
}>) {
	const [settings, setSettings] = useState<RatingSettings | null>(null);

	useEffect(() => {
		void getRatingSettings().then(setSettings);
	}, []);

	const save = (next: RatingSettings) => {
		setSettings(next);
		void setRatingSettings(next);
		onSettingsChange();
	};

	if (!settings) return <div style={styles.loading}>Loading…</div>;

	return (
		<main style={styles.list}>
			<PageToggles
				pages={settings.pages}
				pageTypes={visibilityPages}
				onChange={(page, enabled) =>
					save({ ...settings, pages: { ...settings.pages, [page]: enabled } })
				}
			/>
			<div style={styles.card}>
				<div style={styles.groupHeader}>Release and film ratings</div>
				<label style={styles.selectRow}>
					<span style={styles.label}>Ratings</span>
					<select
						value={settings.ratings}
						onChange={(event) =>
							save({
								...settings,
								ratings: event.currentTarget.value as RatingSettings["ratings"],
							})
						}
						style={styles.select}
					>
						<option value="unrated">Hide only when unrated</option>
						<option value="always">Hide at all times</option>
					</select>
				</label>
				<label style={styles.selectRow}>
					<span style={styles.label}>Rating, review, and wishlist counts</span>
					<select
						value={settings.counts}
						onChange={(event) =>
							save({
								...settings,
								counts: event.currentTarget.value as RatingSettings["counts"],
							})
						}
						style={styles.select}
					>
						<option value="scores">Show all counts</option>
						<option value="scores-and-counts">Hide all counts</option>
					</select>
				</label>
				<label style={{ ...styles.selectRow, ...styles.rowDivider }}>
					<span style={styles.label}>Friends' ratings</span>
					<select
						value={settings.friends}
						onChange={(event) =>
							save({
								...settings,
								friends: event.currentTarget.value as RatingSettings["friends"],
							})
						}
						style={styles.select}
					>
						<option value="always">Show at all times</option>
						<option value="after-release-rated">
							Show after release is rated
						</option>
						<option value="never">Hide at all times</option>
					</select>
				</label>
				{settings.ratings === "unrated" && (
					<label style={styles.selectRow}>
						<span style={styles.label}>Track ratings</span>
						<select
							value={settings.tracks}
							onChange={(event) =>
								save({
									...settings,
									tracks: event.currentTarget.value as RatingSettings["tracks"],
								})
							}
							style={styles.select}
						>
							<option value="after-release-rated">
								Show after release is rated
							</option>
							<option value="after-track-rated">
								Show when tracks are rated
							</option>
						</select>
					</label>
				)}
			</div>
			<ButtonSettings
				buttons={settings.buttons}
				globalButton={settings.globalButton}
				pageControlLabel="Show artist / release / film page controls"
				onChange={(buttons, globalButton) =>
					save({ ...settings, buttons, globalButton })
				}
			/>
		</main>
	);
}

export function ReviewVisibilityView({
	onSettingsChange,
}: Readonly<{
	onSettingsChange: () => void;
}>) {
	const [settings, setSettings] = useState<ReviewSettings | null>(null);

	useEffect(() => {
		void getReviewSettings().then(setSettings);
	}, []);

	const save = (next: ReviewSettings) => {
		setSettings(next);
		void setReviewSettings(next);
		onSettingsChange();
	};

	if (!settings) return <div style={styles.loading}>Loading…</div>;

	return (
		<main style={styles.list}>
			<PageToggles
				pages={settings.pages}
				pageTypes={reviewVisibilityPages}
				onChange={(page, enabled) =>
					save({ ...settings, pages: { ...settings.pages, [page]: enabled } })
				}
			/>
			<div style={styles.card}>
				<div style={styles.groupHeader}>Release and film reviews</div>
				<label style={styles.selectRow}>
					<span style={styles.label}>Reviews</span>
					<select
						value={settings.reviews}
						onChange={(event) =>
							save({
								...settings,
								reviews: event.currentTarget.value as ReviewSettings["reviews"],
							})
						}
						style={styles.select}
					>
						<option value="unrated">Hide only when unrated</option>
						<option value="always">Hide at all times</option>
					</select>
				</label>
				<label style={styles.selectRow}>
					<span style={styles.label}>Friends' reviews</span>
					<select
						value={settings.friends}
						onChange={(event) =>
							save({
								...settings,
								friends: event.currentTarget.value as ReviewSettings["friends"],
							})
						}
						style={styles.select}
					>
						<option value="always">Show at all times</option>
						<option value="after-release-rated">
							Show after release is rated
						</option>
						<option value="never">Hide at all times</option>
					</select>
				</label>
			</div>
			<ButtonSettings
				buttons={settings.buttons}
				globalButton={settings.globalButton}
				pageControlLabel="Show release / film page controls"
				onChange={(buttons, globalButton) =>
					save({ ...settings, buttons, globalButton })
				}
			/>
		</main>
	);
}

function ButtonSettings({
	buttons,
	globalButton,
	pageControlLabel,
	onChange,
}: Readonly<{
	buttons: boolean;
	globalButton: boolean;
	pageControlLabel: string;
	onChange: (buttons: boolean, globalButton: boolean) => void;
}>) {
	return (
		<div style={styles.card}>
			<div style={styles.groupHeader}>Controls</div>
			<div style={styles.row}>
				<span style={styles.label}>{pageControlLabel}</span>
				<Toggle
					checked={buttons}
					onChange={() => onChange(!buttons, globalButton)}
				/>
			</div>
			<div style={{ ...styles.row, ...styles.rowDivider }}>
				<span style={styles.label}>Show global floating control</span>
				<Toggle
					checked={globalButton}
					onChange={() => onChange(buttons, !globalButton)}
				/>
			</div>
		</div>
	);
}
