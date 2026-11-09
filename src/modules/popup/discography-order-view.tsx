import { useCallback, useEffect, useState } from "preact/hooks";
import {
	defaultSectionOrder,
	getSectionOrder,
	isDefaultSectionOrder,
	resetSectionOrder,
	setSectionOrder,
} from "~/shared/discography-order/settings";
import { type ReleaseType, releaseTypes } from "~/shared/release-types";
import { styles } from "./styles";

const moveButtonStyle = {
	...styles.customizeButton,
	minWidth: 28,
	padding: "2px 6px",
};

const dragHandleStyle = {
	color: "#999",
	cursor: "grab",
	fontSize: 14,
	lineHeight: 1,
};

const dropIndicator = "2px solid #4286c4";

export function DiscographyOrderView() {
	const [order, setOrder] = useState<ReleaseType[] | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [dropIndex, setDropIndex] = useState<number | null>(null);

	const load = useCallback(async () => {
		setError("");
		try {
			setOrder(await getSectionOrder());
		} catch (error) {
			console.error("EvenBetterRYM: could not load section order", error);
			setError("Could not load discography section order.");
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const save = async (next: ReleaseType[], update: () => Promise<void>) => {
		if (saving) return;
		setSaving(true);
		setError("");
		try {
			await update();
			setOrder(next);
		} catch (error) {
			console.error("EvenBetterRYM: could not save section order", error);
			setError("Could not save section order. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const moveTo = (from: number, to: number) => {
		if (!order || from === to) return;
		const next = [...order];
		next.splice(to, 0, ...next.splice(from, 1));
		void save(next, () => setSectionOrder(next));
	};

	const endDrag = () => {
		setDragIndex(null);
		setDropIndex(null);
	};

	const isDefault = order === null || isDefaultSectionOrder(order);

	if (order === null) {
		return (
			<main lang="en" style={styles.list}>
				{error && <p role="alert">{error}</p>}
				{error ? (
					<button
						type="button"
						onClick={() => void load()}
						style={styles.resetButton}
					>
						Retry
					</button>
				) : (
					<div style={styles.loading}>Loading...</div>
				)}
			</main>
		);
	}

	return (
		<main lang="en" style={styles.list}>
			{error && <p role="alert">{error}</p>}
			<p>
				Drag sections or use the arrows to arrange the discography on artist
				pages. Changes apply to open artist pages immediately. Sections an
				artist does not have are skipped. A custom order enables reordering
				automatically; RYM's default order disables it.
			</p>
			<ol style={{ ...styles.card, listStyle: "none", margin: 0, padding: 0 }}>
				{order.map((type, index) => {
					const label = releaseTypes[type].label;
					const isDropTarget =
						dragIndex !== null && dropIndex === index && dragIndex !== index;
					return (
						<li
							key={type}
							draggable={!saving}
							onDragStart={(event) => {
								setDragIndex(index);
								if (event.dataTransfer) {
									event.dataTransfer.effectAllowed = "move";
									// Firefox only starts a drag when data is set.
									event.dataTransfer.setData("text/plain", type);
								}
							}}
							onDragOver={(event) => {
								if (dragIndex === null) return;
								event.preventDefault();
								if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
								setDropIndex(index);
							}}
							onDrop={(event) => {
								event.preventDefault();
								if (dragIndex !== null) moveTo(dragIndex, index);
								endDrag();
							}}
							onDragEnd={endDrag}
							style={{
								...styles.row,
								cursor: saving ? "default" : "grab",
								...(index < order.length - 1 ? styles.rowDivider : {}),
								...(dragIndex === index ? { opacity: 0.4 } : {}),
								...(isDropTarget
									? dragIndex < index
										? { borderBottom: dropIndicator }
										: { borderTop: dropIndicator }
									: {}),
							}}
						>
							<span aria-hidden="true" style={dragHandleStyle}>
								⠿
							</span>
							<span style={styles.label}>{label}</span>
							<span style={{ display: "flex", gap: 4 }}>
								<button
									type="button"
									aria-label={`Move ${label} up`}
									title="Move up"
									disabled={saving || index === 0}
									onClick={() => moveTo(index, index - 1)}
									style={moveButtonStyle}
								>
									↑
								</button>
								<button
									type="button"
									aria-label={`Move ${label} down`}
									title="Move down"
									disabled={saving || index === order.length - 1}
									onClick={() => moveTo(index, index + 1)}
									style={moveButtonStyle}
								>
									↓
								</button>
							</span>
						</li>
					);
				})}
			</ol>
			<button
				type="button"
				disabled={saving || isDefault}
				onClick={() =>
					void save([...defaultSectionOrder], () => resetSectionOrder())
				}
				style={{ ...styles.resetButton, marginTop: 8 }}
			>
				Reset to RYM order
			</button>
		</main>
	);
}
