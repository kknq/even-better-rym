import { describe, expect, test, vi } from "vitest";

import { convertAppleMusicDuration } from "./convert";
import { getTrackArtists } from "./track-artists";

describe("convertAppleMusicDuration", () => {
	test.each([
		["PT3M14S", "3:14"],
		["PT3M", "3:00"],
		["PT14S", "0:14"],
	])("converts %s to %s", (input, output) => {
		expect(convertAppleMusicDuration(input)).toEqual(output);
	});
});

describe("getTrackArtists", () => {
	test("reads artists regardless of key order, whitespace or string punctuation", () => {
		const script = JSON.stringify(
			{
				items: [
					{
						subtitleLinks: [
							{ title: 'Odd } Name "quoted"' },
							{ title: "Simon & Garfunkel" },
						],
						trackNumber: 1,
					},
					{
						trackNumber: 2,
						subtitleLinks: [{ title: "Artist B" }],
					},
				],
			},
			null,
			2,
		);
		expect([...getTrackArtists(script)]).toEqual([
			[1, ['Odd } Name "quoted"', "Simon & Garfunkel"]],
			[2, ["Artist B"]],
		]);
	});

	test("uses album order across disc sections, retaining tracks without artists", () => {
		// Shape of the public serialized-server-data sections on Apple Music.
		const script = JSON.stringify({
			data: [
				{
					data: {
						sections: [
							{
								items: [
									{
										id: "track-lockup - album - 11",
										discNumber: 1,
										trackNumber: 1,
										subtitleLinks: [{ title: "A" }],
									},
									{
										id: "track-lockup - album - 12",
										discNumber: 1,
										trackNumber: 2,
										subtitleLinks: null,
									},
								],
							},
							{
								items: [
									{
										id: "track-lockup - album - 21",
										discNumber: 2,
										trackNumber: 1,
										subtitleLinks: [{ title: "B" }],
									},
									{
										id: "track-lockup - album - 22",
										discNumber: 2,
										trackNumber: 2,
										subtitleLinks: [{ title: "C" }],
									},
								],
							},
						],
					},
				},
			],
		});
		expect([...getTrackArtists(script)]).toEqual([
			[1, ["A"]],
			[3, ["B"]],
			[4, ["C"]],
		]);
	});

	test("does not mistake recommendations or invalid titles for track artists", () => {
		const script = JSON.stringify({
			items: [{ trackNumber: 1, subtitleLinks: [{ title: 42 }, null, {}] }],
			recommendations: { subtitleLinks: [{ title: "2020" }] },
		});
		expect(getTrackArtists(script).size).toBe(0);
		expect(getTrackArtists(undefined).size).toBe(0);
	});

	test("reports malformed optional metadata without preventing an import", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		try {
			expect(getTrackArtists('{"trackNumber":1,').size).toBe(0);
			expect(warn).toHaveBeenCalledOnce();
		} finally {
			warn.mockRestore();
		}
	});
});
