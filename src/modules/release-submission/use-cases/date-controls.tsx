import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";

import type { ReleaseDate, ResolveData } from "~/shared/services/types";
import { datesEqual, dateToString } from "~/shared/utils/datetime";
import { waitForElement } from "~/shared/utils/dom";

import type { FillData } from "../dom";
import { fillDate } from "../utils/fillers";

export default async function injectDateControls() {
	const yearInput = await waitForElement("#year");

	const releaseDateContainer = document.createElement("span");
	yearInput.after(releaseDateContainer);
	render(<DateButton />, releaseDateContainer);

	const recordingYearInput = await waitForElement("#rec_to_year");
	const recordingDateContainer = document.createElement("div");
	recordingYearInput.after(recordingDateContainer);
	render(
		<div style={{ marginTop: 4, textAlign: "right" }}>
			<ClearButton
				selectIds={[
					"rec_from_month",
					"rec_from_day",
					"rec_from_year",
					"rec_to_month",
					"rec_to_day",
					"rec_to_year",
				]}
			/>
		</div>,
		recordingDateContainer,
	);
}

function DateButton() {
	const filledDate = useFilledDate();
	const [date, setDate] = useState<ReleaseDate>();
	const [publishDate, setPublishDate] = useState<ReleaseDate>();

	useEffect(() => {
		const listener = (e: CustomEvent<ResolveData>) => {
			const data = e.detail;
			setDate(data.date);
			setPublishDate(data.publishDate);
		};

		document.addEventListener("importEvent", listener);
		return () => document.removeEventListener("importEvent", listener);
	}, []);

	return (
		<span style={{ marginLeft: 4 }}>
			<ClearButton selectIds={["month", "day", "year"]} />
			{date && (!filledDate || !datesEqual(date, filledDate)) && (
				<input
					type="button"
					className="btn"
					value={`+ Release Date: ${dateToString(date)}`}
					onClick={() => fillDate(date)}
					style={{ fontSize: "14px !important" }}
				/>
			)}
			{publishDate && (!filledDate || !datesEqual(publishDate, filledDate)) && (
				<input
					type="button"
					className="btn"
					value={`+ Publish Date: ${dateToString(publishDate)}`}
					onClick={() => fillDate(publishDate)}
					style={{ fontSize: "14px !important" }}
				/>
			)}
		</span>
	);
}

function ClearButton({ selectIds }: { selectIds: string[] }) {
	const clearDates = useCallback(() => {
		for (const id of selectIds) {
			const select = document.getElementById(id) as HTMLSelectElement | null;
			if (!select) continue;

			select.selectedIndex = 0;
			select.dispatchEvent(new Event("change", { bubbles: true }));
		}
	}, [selectIds]);

	return (
		<input
			type="button"
			className="btn blue_btn"
			value="Clear"
			onClick={clearDates}
			style={{ fontSize: "14px !important" }}
		/>
	);
}

function useFilledDate() {
	const [filledDate, setFilledDate] = useState<ReleaseDate>();

	const readMonth = useCallback((el?: HTMLSelectElement) => {
		const monthEl =
			el ?? (document.getElementById("month") as HTMLSelectElement);
		if (!monthEl) return;

		const val = Number.parseInt(monthEl.value, 10);
		setFilledDate((d) => ({ ...d, month: val === 0 ? undefined : val }));
	}, []);

	const readDay = useCallback((el?: HTMLSelectElement) => {
		const dayEl = el ?? (document.getElementById("day") as HTMLSelectElement);
		if (!dayEl) return;

		const val = Number.parseInt(dayEl.value, 10);
		setFilledDate((d) => ({ ...d, day: val === 0 ? undefined : val }));
	}, []);

	const readYear = useCallback((el?: HTMLSelectElement) => {
		const yearEl = el ?? (document.getElementById("year") as HTMLSelectElement);
		if (!yearEl) return;

		const val = Number.parseInt(yearEl.value, 10);
		setFilledDate((d) => ({ ...d, year: val === 0 ? undefined : val }));
	}, []);

	// update filled date upon autofill
	useEffect(() => {
		const listener = (e: CustomEvent<FillData>) => {
			if (e.detail.filledField === "date") {
				readMonth();
				readDay();
				readYear();
			}
		};

		document.addEventListener("fillEvent", listener);
		return () => document.removeEventListener("fillEvent", listener);
	}, [readDay, readMonth, readYear]);

	// update filled date upon user edit
	useEffect(() => {
		const monthEl = document.getElementById("month") as HTMLSelectElement;
		if (!monthEl) return;

		const listener = (e: Event) => readMonth(e.target as HTMLSelectElement);

		monthEl.addEventListener("change", listener);
		return () => monthEl.removeEventListener("change", listener);
	}, [readMonth]);

	useEffect(() => {
		const dayEl = document.getElementById("day") as HTMLSelectElement;
		if (!dayEl) return;

		const listener = (e: Event) => readDay(e.target as HTMLSelectElement);

		dayEl.addEventListener("change", listener);
		return () => dayEl.removeEventListener("change", listener);
	}, [readDay]);

	useEffect(() => {
		const yearEl = document.getElementById("year") as HTMLSelectElement;
		if (!yearEl) return;

		const listener = (e: Event) => readYear(e.target as HTMLSelectElement);

		yearEl.addEventListener("change", listener);
		return () => yearEl.removeEventListener("change", listener);
	}, [readYear]);

	return filledDate;
}
