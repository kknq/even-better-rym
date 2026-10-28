import { afterEach, describe, expect, test, vi } from "vitest";

import { backgroundFetch } from "~/modules/background/fetch";
import { fetch } from "./fetch";
import { sendBackgroundMessage } from "./messaging";

vi.mock("./messaging", () => ({ sendBackgroundMessage: vi.fn() }));

afterEach(() => {
	vi.unstubAllGlobals();
	vi.resetAllMocks();
});

describe("fetch", () => {
	test("passes successful response bodies through unchanged", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("album")));
		vi.mocked(sendBackgroundMessage).mockResolvedValue(
			await backgroundFetch({
				id: "request-1",
				type: "fetch",
				data: { url: "https://example.com" },
			}),
		);

		await expect(fetch({ url: "https://example.com" })).resolves.toBe("album");
	});

	test("throws background HTTP failures instead of returning their bodies", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response("private response details", {
					status: 403,
					statusText: "Forbidden",
				}),
			),
		);
		vi.mocked(sendBackgroundMessage).mockResolvedValue(
			await backgroundFetch({
				id: "request-1",
				type: "fetch",
				data: { url: "https://example.com" },
			}),
		);

		await expect(fetch({ url: "https://example.com" })).rejects.toThrow(
			"HTTP 403: Forbidden",
		);
	});
});
