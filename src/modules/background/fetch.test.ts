import { afterEach, describe, expect, test, vi } from "vitest";

import { backgroundFetch } from "./fetch";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("backgroundFetch", () => {
	test("forwards POST bodies without putting them in the URL", async () => {
		const fetch = vi.fn().mockResolvedValue(
			new Response('{"access_token":"test-token"}', {
				status: 200,
				statusText: "OK",
			}),
		);
		vi.stubGlobal("fetch", fetch);

		await expect(
			backgroundFetch({
				id: "request-1",
				type: "fetch",
				data: {
					url: "https://accounts.spotify.com/api/token",
					method: "POST",
					body: "grant_type=client_credentials",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
				},
			}),
		).resolves.toEqual({
			id: "request-1",
			type: "fetch",
			data: {
				body: '{"access_token":"test-token"}',
				status: 200,
				statusText: "OK",
			},
		});
		expect(fetch).toHaveBeenCalledWith(
			"https://accounts.spotify.com/api/token",
			{
				method: "POST",
				body: "grant_type=client_credentials",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				credentials: undefined,
			},
		);
	});

	test("preserves query parameters and credentials for GET requests", async () => {
		const fetch = vi.fn().mockResolvedValue(new Response("album"));
		vi.stubGlobal("fetch", fetch);

		const response = await backgroundFetch({
			id: "request-1",
			type: "fetch",
			data: {
				url: "https://example.com/search?existing=value",
				urlParameters: { q: "Björk & friends" },
				credentials: "omit",
			},
		});

		expect(fetch).toHaveBeenCalledWith(
			"https://example.com/search?existing=value&q=Bj%C3%B6rk+%26+friends",
			{
				method: "GET",
				body: undefined,
				headers: undefined,
				credentials: "omit",
			},
		);
		expect(response.data.error).toBeUndefined();
		expect(response.data.body).toBe("album");
	});

	test.each([
		undefined,
		null,
	])("omits %s query parameters without dropping empty strings or credentials", async (missing) => {
		const fetch = vi
			.fn()
			.mockImplementation(() => Promise.resolve(new Response("{}")));
		vi.stubGlobal("fetch", fetch);

		await backgroundFetch({
			id: "request-1",
			type: "fetch",
			data: {
				url: "https://api.discogs.com/releases/1",
				urlParameters: {
					key: missing,
					secret: missing,
					empty: "",
				},
			},
		});

		expect(fetch.mock.calls[0]?.[0]).toBe(
			"https://api.discogs.com/releases/1?empty=",
		);

		await backgroundFetch({
			id: "request-2",
			type: "fetch",
			data: {
				url: "https://api.discogs.com/releases/1",
				urlParameters: { key: "test-key", secret: "test-secret" },
			},
		});

		expect(fetch.mock.calls[1]?.[0]).toBe(
			"https://api.discogs.com/releases/1?key=test-key&secret=test-secret",
		);
	});

	test.each([
		400, 401, 403, 404, 429, 500, 503,
	])("reports HTTP %s without including the response body in the error", async (status) => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response("private response details", {
					status,
					statusText: "Request failed",
				}),
			),
		);

		await expect(
			backgroundFetch({
				id: "request-1",
				type: "fetch",
				data: { url: "https://example.com" },
			}),
		).resolves.toEqual({
			id: "request-1",
			type: "fetch",
			data: {
				body: "private response details",
				status,
				statusText: "Request failed",
				error: `HTTP ${status}: Request failed`,
			},
		});
	});

	test("reports the status when the server omits the reason phrase", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("", { status: 429 })),
		);

		const response = await backgroundFetch({
			id: "request-1",
			type: "fetch",
			data: { url: "https://example.com" },
		});

		expect(response.data.error).toBe("HTTP 429");
	});

	test("accepts a successful empty response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
		);

		const response = await backgroundFetch({
			id: "request-1",
			type: "fetch",
			data: { url: "https://example.com" },
		});

		expect(response.data.status).toBe(204);
		expect(response.data.body).toBe("");
		expect(response.data.error).toBeUndefined();
	});

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
