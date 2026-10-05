import { useEffect, useState } from "preact/hooks";

import { isCollectionPageSize } from "./settings";

const presets = [10, 25, 50, 100, 200];

export function PageSizeControl({
	value,
	onChange,
	action = "Apply",
}: Readonly<{
	value: number | null;
	onChange: (value: number | null) => Promise<void>;
	action?: string;
}>) {
	const [choice, setChoice] = useState("");
	const [custom, setCustom] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	useEffect(() => {
		setChoice(
			value === null || value === 25
				? ""
				: presets.includes(value)
					? String(value)
					: "custom",
		);
		setCustom(value === null ? "" : String(value));
	}, [value]);

	return (
		<form
			class="ebr-collection-page-size"
			onSubmit={(event) => {
				event.preventDefault();
				const next =
					choice === "" ? 25 : Number(choice === "custom" ? custom : choice);
				if (!isCollectionPageSize(next)) {
					setError("Enter a positive whole number.");
					return;
				}
				setError("");
				setSaving(true);
				void onChange(next)
					.catch((reason: unknown) => {
						setError(`Could not save items per page: ${String(reason)}`);
					})
					.finally(() => setSaving(false));
			}}
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "flex-end",
				flexWrap: "wrap",
				gap: "6px",
				margin: 0,
				lineHeight: "normal",
			}}
		>
			<label
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					margin: 0,
					fontWeight: "normal",
				}}
			>
				Items per page:{" "}
				<select
					aria-label="Items per page"
					value={choice}
					onChange={(event) => setChoice(event.currentTarget.value)}
				>
					<option value="">Default (25)</option>
					{presets
						.filter((size) => size !== 25)
						.map((size) => (
							<option key={size} value={size}>
								{size}
							</option>
						))}
					<option value="custom">Custom...</option>
				</select>
			</label>
			{choice === "custom" && (
				<input
					type="number"
					aria-label="Custom items per page"
					min="1"
					step="1"
					required
					value={custom}
					onInput={(event) => setCustom(event.currentTarget.value)}
					style={{ width: "7em" }}
				/>
			)}
			<button type="submit" class="btn btn_small" disabled={saving}>
				{action}
			</button>
			{error && <span role="alert">{error}</span>}
		</form>
	);
}
