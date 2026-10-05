import { useState } from "preact/hooks";

import { FilterButton } from "./filter-button";
import { parseRatingSelection, ratingModifier } from "./rating";
import { collectionUrl, parseCollectionUrl } from "./url";

const values = Array.from({ length: 10 }, (_, index) => (index + 1) / 2);

export function RatingFilter() {
	const [selection, setSelection] = useState(() =>
		parseRatingSelection(
			parseCollectionUrl(location.href).modifiers.find((modifier) =>
				/^r\d/.test(modifier),
			),
		),
	);
	const [useRange, setUseRange] = useState(
		selection.mode === "range" || selection.mode === "rated",
	);
	const [error, setError] = useState("");

	return (
		<div class="ebr-rating-filter">
			{useRange ? (
				<form
					id="ebr-rating-range"
					class="ebr-rating-filter"
					onSubmit={(event) => {
						event.preventDefault();
						let value: string;
						try {
							value = ratingModifier({ ...selection, mode: "range" });
						} catch (reason) {
							setError(
								reason instanceof Error ? reason.message : String(reason),
							);
							return;
						}
						location.assign(
							collectionUrl(location.href, { family: "rating", value }),
						);
					}}
				>
					{(["from", "to"] as const).map((endpoint) => (
						<label key={endpoint}>
							{endpoint === "from" ? "From" : "To"}
							<select
								aria-label={endpoint === "from" ? "From rating" : "To rating"}
								value={selection[endpoint]}
								onChange={(event) => {
									setSelection({
										...selection,
										[endpoint]: Number(event.currentTarget.value),
									});
									setError("");
								}}
							>
								<option value={0}>Unrated (0.0)</option>
								{values.map((value) => (
									<option key={value} value={value}>
										{value.toFixed(1)}
									</option>
								))}
							</select>
						</label>
					))}
					<button type="submit" class="btn btn_small blue_btn">
						Apply
					</button>
					<button
						type="button"
						class="btn btn_small"
						onClick={() =>
							location.assign(
								collectionUrl(location.href, { family: "rating", value: "" }),
							)
						}
					>
						Clear
					</button>
				</form>
			) : (
				<>
					{values.map((value) => (
						<FilterButton
							key={value}
							name={value.toFixed(1)}
							base="r"
							modifier={`r${value.toFixed(1)}`}
						/>
					))}
					<FilterButton name="Unrated" base="r" modifier="r0.0" />
					<FilterButton name="Rated" base="r" modifier="r0.5-5.0" />
				</>
			)}
			<button
				type="button"
				class="btn btn_small blue_btn"
				aria-expanded={useRange}
				onClick={() => {
					setUseRange(!useRange);
					setError("");
				}}
			>
				{useRange ? "Use Buttons" : "Use Range"}
			</button>
			{error && <span role="alert">{error}</span>}
		</div>
	);
}
