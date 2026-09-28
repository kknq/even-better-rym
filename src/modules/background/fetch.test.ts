import { afterEach, describe, expect, test, vi } from "vitest";

import { backgroundFetch } from "./fetch";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("backgroundFetch", () => {
	test("returns a failure response when the network request rejects", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

		await expect(
			backgroundFetch({
				id: "request-1",
				type: "fetch",
				data: { url: "https://api.discogs.com/releases/1" },
			}),
		).resolves.toMatchObject({
			id: "request-1",
			type: "fetch",
			data: {
				status: 0,
				error: "offline",
			},
		});
	});
});
