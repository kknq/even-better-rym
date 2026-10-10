import { describe, expect, test } from "vitest";

import {
	canRedo,
	canUndo,
	createEditHistory,
	recordEdit,
	redoEdit,
	replaceCurrent,
	undoEdit,
} from "./edit-history";

describe("edit history", () => {
	test("starts with nothing to undo or redo", () => {
		const history = createEditHistory("a");

		expect(canUndo(history)).toBe(false);
		expect(canRedo(history)).toBe(false);
		expect(undoEdit(history)).toBe(history);
		expect(redoEdit(history)).toBe(history);
	});

	test("undoes and redoes recorded steps in order", () => {
		const history = recordEdit(recordEdit(createEditHistory("a"), "b"), "c");
		const undone = undoEdit(undoEdit(history));

		expect(undone.current).toBe("a");
		expect(canRedo(undone)).toBe(true);
		expect(redoEdit(undone).current).toBe("b");
		expect(redoEdit(redoEdit(undone))).toEqual(history);
	});

	test("drops undone steps when a new one is recorded", () => {
		const history = recordEdit(
			undoEdit(recordEdit(createEditHistory("a"), "b")),
			"c",
		);

		expect(history).toEqual({ past: ["a"], current: "c", future: [] });
	});

	test("replaces the current snapshot without adding a step", () => {
		const history = replaceCurrent(
			recordEdit(createEditHistory("a"), "b"),
			"B",
		);

		expect(history).toEqual({ past: ["a"], current: "B", future: [] });
	});
});
