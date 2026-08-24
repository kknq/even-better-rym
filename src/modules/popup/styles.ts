import type { CSSProperties } from "preact";

export const styles = {
	root: {
		width: 340,
		fontFamily:
			'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		fontSize: 13,
		color: "#1a1a1a",
		background: "#f2f2f2",
	} satisfies CSSProperties,

	header: {
		display: "flex",
		alignItems: "center",
		gap: 10,
		padding: "14px 16px",
		background: "#1c1c1c",
		color: "#fff",
	} satisfies CSSProperties,

	logo: {
		borderRadius: 6,
		flexShrink: 0,
	} satisfies CSSProperties,

	title: {
		fontWeight: 700,
		fontSize: 14,
		color: "#fff",
		lineHeight: 1.3,
	} satisfies CSSProperties,

	subtitle: {
		fontSize: 11,
		color: "#888",
		lineHeight: 1.3,
	} satisfies CSSProperties,

	reloadNotice: {
		position: "fixed",
		right: 10,
		bottom: 10,
		left: 10,
		zIndex: 10,
		display: "flex",
		alignItems: "center",
		gap: 8,
		padding: "8px 10px",
		background: "#fff7db",
		border: "1px solid #ead38a",
		borderRadius: 6,
		boxShadow: "0 2px 8px rgba(0, 0, 0, 0.18)",
		color: "#625016",
		fontSize: 11,
		lineHeight: 1.35,
	} satisfies CSSProperties,

	reloadNoticeDismiss: {
		flexShrink: 0,
		border: 0,
		background: "transparent",
		color: "#625016",
		cursor: "pointer",
		fontSize: 16,
		lineHeight: 1,
		padding: 0,
	} satisfies CSSProperties,

	list: {
		display: "flex",
		flexDirection: "column",
		gap: 1,
		padding: "10px 10px",
	} satisfies CSSProperties,

	card: {
		background: "#fff",
		borderRadius: 8,
		overflow: "hidden",
		boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
	} satisfies CSSProperties,

	cardFlat: {
		background: "#fff",
		borderRadius: 8,
		overflow: "hidden",
		boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
	} satisfies CSSProperties,

	groupHeader: {
		padding: "7px 12px 6px",
		fontSize: 10,
		fontWeight: 700,
		textTransform: "uppercase" as const,
		letterSpacing: "0.08em",
		color: "#4286c4",
		background: "#f0f6fc",
		borderBottom: "1px solid #d8eaf7",
	} satisfies CSSProperties,

	row: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
		padding: "10px 12px",
		cursor: "pointer",
		userSelect: "none" as const,
	} satisfies CSSProperties,

	selectRow: {
		display: "flex",
		flexDirection: "column",
		gap: 6,
		padding: "10px 12px",
	} satisfies CSSProperties,

	select: {
		width: "100%",
		padding: "6px 8px",
		border: "1px solid #d0d0d0",
		borderRadius: 4,
		background: "#fff",
		color: "#2a2a2a",
		fontSize: 12,
	} satisfies CSSProperties,

	rowDivider: {
		borderBottom: "1px solid #f0f0f0",
	} satisfies CSSProperties,

	label: {
		flex: 1,
		paddingRight: 12,
		lineHeight: 1.45,
		color: "#2a2a2a",
	} satisfies CSSProperties,

	loading: {
		padding: "20px 16px",
		color: "#999",
		textAlign: "center" as const,
	} satisfies CSSProperties,

	toggle: {
		position: "relative",
		flexShrink: 0,
		width: 40,
		height: 22,
		border: "none",
		borderRadius: 11,
		cursor: "pointer",
		padding: 0,
		transition: "background 0.2s",
	} satisfies CSSProperties,

	thumb: {
		position: "absolute",
		top: 2,
		left: 0,
		width: 18,
		height: 18,
		borderRadius: "50%",
		background: "#fff",
		boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
		transition: "transform 0.2s",
		display: "block",
	} satisfies CSSProperties,

	customizeButton: {
		flexShrink: 0,
		fontSize: 11,
		padding: "4px 8px",
		border: "1px solid #d0d0d0",
		borderRadius: 4,
		background: "#fff",
		color: "#4286c4",
		cursor: "pointer",
	} satisfies CSSProperties,

	backButton: {
		flexShrink: 0,
		border: "none",
		background: "transparent",
		color: "#fff",
		fontSize: 13,
		cursor: "pointer",
		padding: 0,
	} satisfies CSSProperties,

	shortcutRow: {
		display: "flex",
		flexDirection: "column",
		gap: 6,
		padding: "10px 12px",
	} satisfies CSSProperties,

	shortcutLabel: {
		color: "#2a2a2a",
		lineHeight: 1.3,
	} satisfies CSSProperties,

	comboRow: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: 6,
	} satisfies CSSProperties,

	chip: {
		display: "inline-flex",
		alignItems: "center",
		gap: 4,
		fontSize: 11,
		fontFamily:
			'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		background: "#f0f6fc",
		color: "#2a2a2a",
		border: "1px solid #d8eaf7",
		borderRadius: 4,
		padding: "3px 6px",
	} satisfies CSSProperties,

	chipRemove: {
		border: "none",
		background: "transparent",
		color: "#999",
		cursor: "pointer",
		fontSize: 12,
		lineHeight: 1,
		padding: 0,
	} satisfies CSSProperties,

	comboError: {
		// flexBasis 100% forces this onto its own line within comboRow's
		// flex-wrap layout, so long messages wrap within the popup's width
		// instead of being clipped by a sibling chip's fixed width.
		flexBasis: "100%",
		fontSize: 11,
		color: "#c0392b",
		wordBreak: "break-word",
	} satisfies CSSProperties,

	resetRow: {
		padding: "10px 12px",
	} satisfies CSSProperties,

	resetButton: {
		width: "100%",
		fontSize: 12,
		padding: "8px 0",
		border: "1px solid #d0d0d0",
		borderRadius: 6,
		background: "#fff",
		color: "#c0392b",
		cursor: "pointer",
	} satisfies CSSProperties,

	addButton: {
		width: 22,
		height: 22,
		borderRadius: 4,
		border: "1px solid #d0d0d0",
		background: "#fff",
		cursor: "pointer",
		fontSize: 13,
		lineHeight: 1,
		color: "#4286c4",
	} satisfies CSSProperties,

	recorderInput: {
		width: 170,
		fontSize: 11,
		padding: "3px 6px",
		border: "1px solid #4286c4",
		borderRadius: 4,
		outline: "none",
		background: "#fff",
	} satisfies CSSProperties,
};
