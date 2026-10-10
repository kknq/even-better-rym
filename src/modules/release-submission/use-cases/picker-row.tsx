import type { ComponentChildren } from "preact";

export const NOT_INHERITED = "";

type PickerRowProps = {
	name: string;
	status: string;
	active: boolean;
	children: ComponentChildren;
};

// Renders one artist's row: its name, status and controls.
export function PickerRow({
	name,
	status,
	active,
	children,
}: Readonly<PickerRowProps>) {
	return (
		<div style={{ fontWeight: active ? 700 : "normal" }}>
			{name}: {status} {children}
		</div>
	);
}

type PickerButtonProps = {
	value: string;
	onClick: () => void;
	disabled?: boolean;
};

// Renders a small RYM-styled button.
export function PickerButton({
	value,
	onClick,
	disabled = false,
}: Readonly<PickerButtonProps>) {
	return (
		<input
			type="button"
			className="btn btn_small"
			value={value}
			disabled={disabled}
			onClick={onClick}
		/>
	);
}

type InheritOption = {
	value: string;
	label: string;
};

type InheritSelectProps = {
	inherited: string;
	options: InheritOption[];
	onSelect: (value: string) => void;
};

// Renders a dropdown for inheriting one of the options, or for turning
// inheriting off again.
export function InheritSelect({
	inherited,
	options,
	onSelect,
}: Readonly<InheritSelectProps>) {
	return (
		<select
			value={inherited}
			onChange={(event) => onSelect((event.target as HTMLSelectElement).value)}
		>
			<option value={NOT_INHERITED}>Don't inherit</option>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	);
}
