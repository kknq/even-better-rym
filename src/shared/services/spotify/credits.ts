import { fetch } from "~/shared/utils/fetch";
import { normalizeCreditRole } from "../credit-roles";
import type { TrackCredit } from "../types";

const CREDITS_ENDPOINT = "https://api-partner.spotify.com/pathfinder/v2/query";
const CREDITS_QUERY_HASH =
	"f135fb9be58a72d041ab5d214d817021a272405d883860468e2627afb01a3ca9";
const PAGE_SIZE = 100;

type AnonymousSession = {
	token: string;
	expiresAt: number;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

async function requestAnonymousSession(id: string): Promise<AnonymousSession> {
	const html = await fetch({
		url: `https://open.spotify.com/embed/track/${id}`,
		credentials: "omit",
	});
	const document_ = new DOMParser().parseFromString(html, "text/html");
	const script = document_.querySelector("script#__NEXT_DATA__");
	if (!script?.textContent)
		throw new Error("Spotify anonymous credits session is unavailable");
	const data: unknown = JSON.parse(script.textContent);
	if (
		!isObject(data) ||
		!isObject(data.props) ||
		!isObject(data.props.pageProps) ||
		!isObject(data.props.pageProps.state) ||
		!isObject(data.props.pageProps.state.settings) ||
		!isObject(data.props.pageProps.state.settings.session)
	) {
		throw new Error("Invalid Spotify anonymous credits session");
	}
	const session = data.props.pageProps.state.settings.session;
	if (
		session.isAnonymous !== true ||
		typeof session.accessToken !== "string" ||
		!session.accessToken.trim() ||
		typeof session.accessTokenExpirationTimestampMs !== "number" ||
		!Number.isFinite(session.accessTokenExpirationTimestampMs) ||
		session.accessTokenExpirationTimestampMs <= Date.now()
	) {
		throw new Error("Invalid or expired Spotify anonymous credits session");
	}
	return {
		token: session.accessToken,
		expiresAt: session.accessTokenExpirationTimestampMs,
	};
}

function readCreditPage(value: unknown): {
	credits: TrackCredit[];
	items: unknown[];
} {
	if (!isObject(value))
		throw new Error("Invalid Spotify song credits response");
	if (
		value.errors !== undefined &&
		(!Array.isArray(value.errors) || value.errors.length > 0)
	) {
		throw new Error("Spotify song credits query failed");
	}
	const track = isObject(value.data) ? value.data.trackUnion : undefined;
	if (
		!isObject(track) ||
		track.__typename !== "Track" ||
		typeof track.name !== "string" ||
		!track.name.trim() ||
		!isObject(track.creditsTrait) ||
		!isObject(track.creditsTrait.contributors) ||
		!Array.isArray(track.creditsTrait.contributors.items)
	) {
		throw new Error("Spotify song credits are unavailable");
	}
	const items: unknown[] = track.creditsTrait.contributors.items;
	const credits: TrackCredit[] = [];
	for (const item of items) {
		if (
			!isObject(item) ||
			typeof item.name !== "string" ||
			!item.name.trim() ||
			typeof item.role !== "string" ||
			!item.role.trim()
		) {
			throw new Error("Invalid Spotify song credit contributor");
		}
		if (item.role.trim().toLowerCase() === "main artist") continue;
		credits.push({
			name: item.name.trim(),
			role: normalizeCreditRole(item.role),
		});
	}
	return { credits, items };
}

export function createSongCreditsResolver(
	isActive: () => boolean = () => true,
): (url: string) => Promise<TrackCredit[]> {
	let session: AnonymousSession | undefined;
	let pendingSession: Promise<AnonymousSession> | undefined;
	const getSession = async (id: string): Promise<AnonymousSession> => {
		if (session && session.expiresAt > Date.now()) return session;
		pendingSession ??= requestAnonymousSession(id);
		session = await pendingSession;
		pendingSession = undefined;
		return session;
	};
	const checkActive = () => {
		if (!isActive()) throw new Error("Spotify credits loading was cancelled");
	};
	return async (url) => {
		const parsed = new URL(url);
		const match = /^\/track\/([a-zA-Z0-9]{22})\/?$/.exec(parsed.pathname);
		const id = match?.[1];
		if (
			parsed.origin !== "https://open.spotify.com" ||
			parsed.username ||
			parsed.password ||
			!id
		) {
			throw new Error("Unsupported Spotify song credits URL");
		}
		checkActive();
		const credits: TrackCredit[] = [];
		const seenPages = new Set<string>();
		for (let offset = 0; ; offset += PAGE_SIZE) {
			checkActive();
			const currentSession = await getSession(id);
			checkActive();
			const response: unknown = JSON.parse(
				await fetch({
					url: CREDITS_ENDPOINT,
					method: "POST",
					credentials: "omit",
					headers: {
						Authorization: `Bearer ${currentSession.token}`,
						"Content-Type": "application/json",
						"Accept-Language": "en-US,en;q=0.9",
						"app-platform": "WebPlayer",
					},
					body: JSON.stringify({
						operationName: "queryTrackCreditsGroupedModal",
						variables: {
							trackUri: `spotify:track:${id}`,
							contributorsLimit: PAGE_SIZE,
							contributorsOffset: offset,
						},
						extensions: {
							persistedQuery: { version: 1, sha256Hash: CREDITS_QUERY_HASH },
						},
					}),
				}),
			);
			const page = readCreditPage(response);
			const fingerprint = JSON.stringify(page.items);
			if (seenPages.has(fingerprint))
				throw new Error("Spotify song credits pagination did not advance");
			seenPages.add(fingerprint);
			credits.push(...page.credits);
			if (page.items.length < PAGE_SIZE) return credits;
		}
	};
}
