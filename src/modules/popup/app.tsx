import { useEffect, useState } from "preact/hooks";
import browser from "webextension-polyfill";

import { getPageEnabled, setPageEnabled } from "~/shared/page-settings";
import type { PageKey } from "~/shared/pages";
import { pageGroupLabels, pageHints, pageLabels, pages } from "~/shared/pages";

import { ShortcutView } from "./shortcut-view";
import { styles } from "./styles";

type FeatureState = Record<PageKey, boolean>;
type View = "features" | "chartShortcuts";

function buildGroups(): [string, PageKey[]][] {
	const map = new Map<string, PageKey[]>();
	for (const key of Object.keys(pages) as PageKey[]) {
		const path = pages[key];
		if (!map.has(path)) map.set(path, []);
		map.get(path)!.push(key);
	}
	return [...map.entries()];
}

const groups = buildGroups();

export function App() {
	const [view, setView] = useState<View>("features");
	const [features, setFeatures] = useState<FeatureState | null>(null);

	useEffect(() => {
		const keys = Object.keys(pages) as PageKey[];
		void Promise.all(
			keys.map(async (key) => {
				const enabled = await getPageEnabled(key);
				return [key, enabled] as const;
			}),
		).then((entries) => {
			setFeatures(Object.fromEntries(entries) as FeatureState);
		});
	}, []);

	const toggle = async (key: PageKey) => {
		if (!features) return;
		const next = !features[key];
		await setPageEnabled(key, next);
		setFeatures((prev) => prev && { ...prev, [key]: next });
	};

	return (
		<div style={styles.root}>
			<header style={styles.header}>
				{view === "chartShortcuts" ? (
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
						{view === "chartShortcuts" ? "Chart Shortcuts" : "EvenBetterRYM"}
					</div>
					<div style={styles.subtitle}>
						{view === "chartShortcuts"
							? "Customize keyboard shortcuts"
							: "RateYourMusic Enhancements"}
					</div>
				</div>
			</header>

			{view === "chartShortcuts" ? (
				<ShortcutView />
			) : (
				<main style={styles.list}>
					{features === null ? (
						<div style={styles.loading}>Loading…</div>
					) : (
						groups.map(([path, keys]) => {
							const isGroup = keys.length > 1;
							return (
								<div key={path} style={isGroup ? styles.card : styles.cardFlat}>
									{isGroup && (
										<div style={styles.groupHeader}>
											{pageGroupLabels[path] ?? path}
										</div>
									)}
									{keys.map((key, i) => (
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

function Toggle({
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
