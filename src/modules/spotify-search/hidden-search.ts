import {
	type FrameRequest,
	isSearchResult,
	type SearchCategory,
	type SearchInput,
	type SearchResult,
} from "./messages";

const searchFrame = (
	data: SearchInput,
	category: SearchCategory,
): Promise<SearchResult> =>
	new Promise((resolve) => {
		const frame = document.createElement("iframe");
		const id = crypto.randomUUID();
		// Keep a normal layout viewport without allowing popups or top navigation.
		frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
		frame.style.cssText = "width:1280px;height:900px;border:0";
		frame.src = `https://open.spotify.com/search/${encodeURIComponent(`${data.artist} ${data.title}`)}/${category}`;
		const finish = (result: SearchResult) => {
			clearTimeout(timeout);
			window.removeEventListener("message", onMessage);
			frame.remove();
			resolve(result);
		};
		const onMessage = (event: MessageEvent<unknown>) => {
			if (
				event.source !== frame.contentWindow ||
				event.origin !== "https://open.spotify.com" ||
				typeof event.data !== "object" ||
				event.data === null ||
				!("type" in event.data)
			)
				return;
			if (event.data.type === "ebr-spotify-ready") {
				frame.contentWindow?.postMessage(
					{
						type: "ebr-spotify-read",
						id,
						category,
						data,
					} satisfies FrameRequest,
					"https://open.spotify.com",
				);
			} else if (
				event.data.type === "ebr-spotify-result" &&
				"id" in event.data &&
				event.data.id === id
			) {
				finish(
					"result" in event.data && isSearchResult(event.data.result)
						? event.data.result
						: { status: "error", message: "Invalid Spotify search response" },
				);
			}
		};
		const timeout = setTimeout(
			() =>
				finish({
					status: "error",
					message: "Spotify background search did not respond",
				}),
			30_000,
		);
		frame.onerror = () =>
			finish({ status: "error", message: "Spotify search frame did not load" });
		window.addEventListener("message", onMessage);
		document.body.append(frame);
	});

export const searchHiddenSpotify = async (
	data: SearchInput,
): Promise<SearchResult> => {
	const categories: SearchCategory[] =
		data.releaseType === "music video"
			? ["tracks"]
			: data.releaseType === "single"
				? ["albums", "tracks"]
				: ["albums"];
	for (const category of categories) {
		let result = await searchFrame(data, category);
		if (
			result.status === "error" &&
			result.message === "Spotify search page failed to render"
		)
			result = await searchFrame(data, category);
		if (result.status !== "not-found") return result;
	}
	return { status: "not-found" };
};
