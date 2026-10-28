import { afterEach, describe, expect, test, vi } from "vitest";

import { fetch } from "~/shared/utils/fetch";

vi.mock("~/shared/utils/fetch", () => ({ fetch: vi.fn() }));

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetAllMocks();
});

describe("Spotify authentication", () => {
	test("sends the client credentials grant as a form-encoded body", async () => {
		vi.stubEnv("VITE_SPOTIFY_ID", "test-client");
		vi.stubEnv("VITE_SPOTIFY_SECRET", "test-secret");
		vi.resetModules();
		const { requestToken } = await import("./auth");
		const token = {
			access_token: "test-token",
			expires_in: 3600,
			token_type: "Bearer",
		};
		vi.mocked(fetch).mockResolvedValue(JSON.stringify(token));

		await expect(requestToken()).resolves.toEqual(token);
		expect(fetch).toHaveBeenCalledWith({
			method: "POST",
			url: "https://accounts.spotify.com/api/token",
			body: "grant_type=client_credentials",
			headers: {
				Authorization: `Basic ${btoa("test-client:test-secret")}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
		});
	});
});
