import { describe, expect, test } from "vitest";

import {
	createEditHistory,
	recordEdit,
	redoEdit,
	undoEdit,
} from "./edit-history";
import type { TrackArtistChoices } from "./track-artist-choices";
import {
	applyChoices,
	createPickerState,
	getWrittenLabels,
	isSamePickerState,
	reapplyReleaseLabels,
	recordUserChange,
	resetTrack,
} from "./tracklist-picker-state";

const session = {
	tracks: [
		{ position: "1", artists: ["A"] },
		{ position: "2", artists: ["B"] },
	],
	names: ["A", "B"],
};
const text = "1|First|\n2|Second|";
const choices: TrackArtistChoices = new Map([
	["A", { kind: "linked", token: "[Artist1]" }],
	["B", { kind: "following", releaseName: "B" }],
]);

describe("applyChoices", () => {
	test("leaves the tracklist alone while an artist has no label", () => {
		const state = createPickerState(text, choices);

		expect(applyChoices(state, session, new Map())).toBe(state);
	});

	test("writes every artist's label once all have one", () => {
		const state = applyChoices(
			createPickerState(text, choices),
			session,
			new Map([["B", "[Artist2]"]]),
		);

		expect(state.text).toBe("1|[Artist1] - First|\n2|[Artist2] - Second|");
		expect(state.appliedPlan.get("2#1")).toEqual(["[Artist2]"]);
	});

	test("removes an explicitly added artist while other artists remain undecided", () => {
		const added = applyChoices(
			createPickerState(
				text,
				new Map([["A", { kind: "linked", token: "[Artist1]" }]]),
			),
			session,
			new Map(),
			true,
		);
		expect(added.text).toBe("1|[Artist1] - First|\n2|Second|");
		const removed = applyChoices(
			{ ...added, choices: new Map([["A", { kind: "skipped" }]]) },
			session,
			new Map(),
		);
		expect(removed.text).toBe(text);
		expect(removed.choices.has("B")).toBe(false);
		const readded = applyChoices(
			{ ...removed, choices: added.choices },
			session,
			new Map(),
		);
		expect(readded.text).toBe(added.text);
	});

	test("keeps manual title edits when excluding an artist after a partial addition", () => {
		const added = applyChoices(
			createPickerState(
				text,
				new Map([["A", { kind: "linked", token: "[Artist1]" }]]),
			),
			session,
			new Map(),
			true,
		);
		const edited = {
			...added,
			text: added.text.replace("First", "First (manual edit)"),
			choices: new Map<string, { kind: "skipped" }>([
				["A", { kind: "skipped" }],
			]),
		};
		const removed = applyChoices(edited, session, new Map());
		expect(removed.text).toBe("1|[Artist1] - First (manual edit)|\n2|Second|");
		expect(resetTrack(removed, "1#1").text).toBe(text);
	});

	test("follows a changed release label but keeps an edited track", () => {
		const first = applyChoices(
			createPickerState(text, choices),
			session,
			new Map([["B", "[Artist2]"]]),
		);
		const edited = {
			...first,
			text: first.text.replace("[Artist1] - First", "Typed"),
		};
		const state = applyChoices(edited, session, new Map([["B", "[Artist3]"]]));

		expect(state.text).toBe("1|Typed|\n2|[Artist3] - Second|");
	});
});

describe("getWrittenLabels", () => {
	test("waits for a followed release artist until the first write", () => {
		const state = createPickerState(text, choices);

		expect(getWrittenLabels(state, new Map()).has("B")).toBe(false);
	});

	test("writes a follower by name once its release artist loses its pick", () => {
		const applied = applyChoices(
			createPickerState(text, choices),
			session,
			new Map([["B", "[Artist2]"]]),
		);

		expect(applyChoices(applied, session, new Map()).text).toBe(
			"1|[Artist1] - First|\n2|B - Second|",
		);
	});
});

describe("resetTrack", () => {
	test("resets a track typed over before the first write to its imported title", () => {
		const typed = {
			...createPickerState(text, choices),
			text: "1|Gibberish|\n2|Second|",
		};
		const applied = applyChoices(typed, session, new Map([["B", "[Artist2]"]]));

		expect(applied.text).toBe("1|Gibberish|\n2|[Artist2] - Second|");
		expect(resetTrack(applied, "1#1").text).toBe(
			"1|[Artist1] - First|\n2|[Artist2] - Second|",
		);
	});

	test("gives an edited track the last applied title", () => {
		const applied = applyChoices(
			createPickerState(text, choices),
			session,
			new Map([["B", "[Artist2]"]]),
		);
		const edited = { ...applied, text: "1|Typed|\n2|[Artist2] - Second|" };

		expect(resetTrack(edited, "1#1").text).toBe(applied.text);
	});
});

describe("isSamePickerState", () => {
	test("compares text, choices and tether by value", () => {
		const state = createPickerState(text, choices);
		const reordered = createPickerState(text, new Map([...choices].reverse()));

		expect(isSamePickerState(state, reordered)).toBe(true);
		expect(isSamePickerState(state, { ...state, text: "1|Other|" })).toBe(
			false,
		);
		expect(
			isSamePickerState(state, {
				...state,
				choices: new Map([["A", { kind: "skipped" }]]),
			}),
		).toBe(false);
	});
});

describe("recordUserChange", () => {
	test("adds a step only when something changed", () => {
		const history = createEditHistory(createPickerState(text, choices));

		expect(recordUserChange(history, { ...history.current })).toBe(history);
		expect(
			recordUserChange(history, { ...history.current, text: "1|Typed|" }).past,
		).toEqual([history.current]);
	});
});

describe("reapplyReleaseLabels", () => {
	test("preserves partial additions and removals through undo, redo and release-link changes", () => {
		const initial = createEditHistory(createPickerState(text, new Map()));
		const added = recordUserChange(
			initial,
			applyChoices(
				{
					...initial.current,
					choices: new Map([["A", { kind: "following", releaseName: "A" }]]),
				},
				session,
				new Map([["A", "[Artist1]"]]),
				true,
			),
		);
		const removed = recordUserChange(
			added,
			applyChoices(
				{ ...added.current, choices: new Map([["A", { kind: "skipped" }]]) },
				session,
				new Map([["A", "[Artist1]"]]),
			),
		);
		expect(removed.current.text).toBe(text);
		const newLabels = new Map([["A", "[Artist2]"]]);
		const undone = reapplyReleaseLabels(undoEdit(removed), session, newLabels);
		expect(undone.current.text).toBe("1|[Artist2] - First|\n2|Second|");
		const redone = reapplyReleaseLabels(redoEdit(undone), session, newLabels);
		expect(redone.current.text).toBe(text);
	});

	test("keeps automatic updates when the user's typing is undone", () => {
		const applied = reapplyReleaseLabels(
			createEditHistory(createPickerState(text, choices)),
			session,
			new Map([["B", "[Artist2]"]]),
		);
		const typed = recordEdit(applied, {
			...applied.current,
			text: "1|Typed|\n2|[Artist2] - Second|",
		});
		const newLabels = new Map([["B", "[Artist3]"]]);
		const updated = reapplyReleaseLabels(typed, session, newLabels);

		expect(updated.current.text).toBe("1|Typed|\n2|[Artist3] - Second|");
		expect(updated.past).toHaveLength(1);

		const undone = reapplyReleaseLabels(undoEdit(updated), session, newLabels);

		expect(undone.current.text).toBe(
			"1|[Artist1] - First|\n2|[Artist3] - Second|",
		);
		expect(undone.future[0].text).toBe("1|Typed|\n2|[Artist3] - Second|");
	});
});
