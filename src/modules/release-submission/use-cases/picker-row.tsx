import type { ComponentChildren } from "preact";

export const NOT_INHERITED = "";

// How settled an artist's choice is: still to choose, chosen, or left out.
export type ChoiceTone = "pending" | "chosen" | "off";

// Returns a choice's tone: pending until one is made.
export const getChoiceTone = (
	choice: { kind: string } | undefined,
): ChoiceTone => {
	if (choice === undefined) {
		return "pending";
	}
	return choice.kind === "skipped" ? "off" : "chosen";
};

const TONE_COLORS: Record<ChoiceTone, { color: string; background: string }> = {
	pending: {
		color: "var(--gen-text-red, #a33)",
		background: "var(--mono-f, #fff)",
	},
	chosen: {
		color: "var(--gen-bg-darkgreen, #2a6b2a)",
		background: "var(--mono-f, #fff)",
	},
	off: { color: "var(--mono-6, #666)", background: "transparent" },
};

const CELL_STYLE = { padding: "3px 6px", verticalAlign: "middle" };

type PickerPanelProps = {
	id?: string;
	title: string;
	hint: string;
	footer?: ComponentChildren;
	headers?: string[];
	children: ComponentChildren;
};

// Renders a picker as a RYM-styled box: a title, a line explaining it, a
// row per artist and optional controls below.
export function PickerPanel({
	id,
	title,
	hint,
	footer,
	headers,
	children,
}: Readonly<PickerPanelProps>) {
	return (
		<div
			id={id}
			style={{
				margin: "1em 0",
				padding: "8px 10px",
				background: "var(--mono-f8)",
				border: "1px solid var(--mono-c)",
				borderRadius: "3px",
			}}
		>
			<div style={{ fontWeight: 700 }}>{title}</div>
			<div style={{ color: "var(--mono-6)", margin: "2px 0 6px" }}>{hint}</div>
			<div style={{ overflowX: "auto" }}>
				<table style={{ borderCollapse: "collapse" }}>
					{headers !== undefined && (
						<thead>
							<tr>
								{headers.map((header) => (
									<th key={header} style={{ ...CELL_STYLE, textAlign: "left" }}>
										{header}
									</th>
								))}
							</tr>
						</thead>
					)}
					<tbody>{children}</tbody>
				</table>
			</div>
			{footer !== undefined && (
				<div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
					{footer}
				</div>
			)}
		</div>
	);
}

type PickerRowProps = {
	name: string;
	status: string;
	tone: ChoiceTone;
	active: boolean;
	children: ComponentChildren;
	cells?: ComponentChildren;
	error?: string;
};

// Renders one artist's row: its name, a badge with its status and its
// controls. The row being searched for is highlighted.
export function PickerRow({
	name,
	status,
	tone,
	active,
	children,
	cells,
	error,
}: Readonly<PickerRowProps>) {
	const colors = TONE_COLORS[tone];
	return (
		<tr
			style={{
				background: active ? "var(--mono-e, #e8eef7)" : "transparent",
				borderTop: "1px solid var(--mono-e, #e5e5e5)",
			}}
		>
			<td style={{ ...CELL_STYLE, fontWeight: 700, whiteSpace: "nowrap" }}>
				{name}
			</td>
			{cells}
			<td style={CELL_STYLE}>
				<span
					style={{
						display: "inline-block",
						padding: "1px 6px",
						borderRadius: "3px",
						border: `1px solid ${colors.color}`,
						color: colors.color,
						background: colors.background,
						fontSize: "0.9em",
						fontStyle: tone === "off" ? "italic" : "normal",
						whiteSpace: "nowrap",
					}}
				>
					{active ? "Choose an artist from the results" : status}
				</span>
			</td>
			<td style={{ ...CELL_STYLE, whiteSpace: "nowrap" }}>
				<div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
					{children}
					<span
						style={{
							width: "1em",
							flexShrink: 0,
							textAlign: "center",
							fontWeight: 700,
							color: "var(--gen-text-red, #a33)",
							cursor: "help",
						}}
					>
						{error && (
							<span role="alert" aria-label={error} title={error}>
								&times;
							</span>
						)}
					</span>
				</div>
			</td>
		</tr>
	);
}

type PickerButtonProps = {
	value: string;
	title: string;
	onClick: () => void;
	primary?: boolean;
	disabled?: boolean;
	width?: string;
};

// Renders a small RYM-styled button, blue for the main action, with a
// tooltip saying what it does.
export function PickerButton({
	value,
	title,
	onClick,
	primary = false,
	disabled = false,
	width,
}: Readonly<PickerButtonProps>) {
	return (
		<input
			type="button"
			className={primary ? "btn blue_btn btn_small" : "btn btn_small"}
			value={value}
			title={title}
			disabled={disabled}
			style={{ width, flexShrink: 0 }}
			onClick={onClick}
		/>
	);
}

type SearchButtonProps = {
	active: boolean;
	hasLink: boolean;
	disabled?: boolean;
	title: string;
	cancelTitle?: string;
	onSearch: () => void;
	onCancel: () => void;
};

// Searches RYM for the artist or cancels the pending selection.
export function SearchButton({
	active,
	hasLink,
	disabled = false,
	title,
	cancelTitle = "Close the artist search without choosing",
	onSearch,
	onCancel,
}: Readonly<SearchButtonProps>) {
	return active ? (
		<PickerButton
			value="Cancel selection"
			disabled={disabled}
			width="12em"
			title={cancelTitle}
			onClick={onCancel}
		/>
	) : (
		<PickerButton
			value={hasLink ? "Replace artist link" : "Find on RYM"}
			disabled={disabled}
			width="12em"
			title={title}
			primary
			onClick={onSearch}
		/>
	);
}

type InheritOption = {
	value: string;
	label: string;
};

type InheritSelectProps = {
	placeholder: string;
	title: string;
	inherited: string;
	options: InheritOption[];
	onSelect: (value: string) => void;
};

// Renders a dropdown for taking one of the options' links, or for turning
// that off again.
export function InheritSelect({
	placeholder,
	title,
	inherited,
	options,
	onSelect,
}: Readonly<InheritSelectProps>) {
	return (
		<select
			value={inherited}
			title={title}
			onChange={(event) => onSelect((event.target as HTMLSelectElement).value)}
		>
			<option value={NOT_INHERITED}>{placeholder}</option>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	);
}
