import { describe, expect, test } from "vitest";

import { markBonusTrack } from "./bonus-track";

describe("markBonusTrack", () => {
	test("rewrites each form of trailing tag", () => {
		expect(markBonusTrack("Song (Bonus Track)")).toBe("Song [bonus track]");
		expect(markBonusTrack("Song [Bonus Track]")).toBe("Song [bonus track]");
		expect(markBonusTrack("Song - Bonus Track")).toBe("Song [bonus track]");
		expect(markBonusTrack("Song Bonus Track")).toBe("Song [bonus track]");
		expect(markBonusTrack("Song ( bonus track ) ")).toBe("Song [bonus track]");
	});

	test("ignores case", () => {
		expect(markBonusTrack("Song (BONUS TRACK)")).toBe("Song [bonus track]");
		expect(markBonusTrack("Song (bonus track)")).toBe("Song [bonus track]");
	});

	test("leaves a title without a trailing tag alone", () => {
		expect(markBonusTrack("Song")).toBe("Song");
		expect(markBonusTrack("Bonus Track Blues")).toBe("Bonus Track Blues");
		expect(markBonusTrack("Rebonus Track")).toBe("Rebonus Track");
	});

	test("keeps a title that is only the tag", () => {
		expect(markBonusTrack("(Bonus Track)")).toBe("[bonus track]");
	});
});
