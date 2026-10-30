import { fetch } from "~/shared/utils/fetch";

export async function createAlbumLoader(
	id: string,
): Promise<(offset: number) => Promise<unknown>> {
	const html = await fetch({
		url: `https://open.qobuz.com/album/${id}`,
		credentials: "omit",
	});
	const document_ = new DOMParser().parseFromString(html, "text/html");
	const scripts = [
		...document_.querySelectorAll<HTMLScriptElement>("script[src]"),
	];
	const script = scripts
		.map(
			(element) =>
				new URL(element.getAttribute("src") ?? "", "https://open.qobuz.com"),
		)
		.find(
			(url) =>
				url.origin === "https://open.qobuz.com" &&
				!url.username &&
				!url.password &&
				/^\/resources\/[^/]+\/js\/main\.js$/.test(url.pathname),
		);
	if (!script) throw new Error("Could not find Qobuz public metadata client");
	const source = await fetch({ url: script.href, credentials: "omit" });
	const appId = /(?:\bapp_id|["']app_id["'])\s*:\s*["'](\d+)["']/.exec(
		source,
	)?.[1];
	if (!appId)
		throw new Error("Could not initialize Qobuz public metadata client");
	return async (offset) => {
		const response = await fetch({
			url: "https://www.qobuz.com/api.json/0.2/album/get",
			urlParameters: {
				app_id: appId,
				album_id: id,
				limit: "100",
				offset: String(offset),
			},
			credentials: "omit",
		});
		const data: unknown = JSON.parse(response);
		return data;
	};
}
