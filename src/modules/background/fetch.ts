import type { FetchRequest, FetchResponse } from "~/shared/utils/messaging";

export const backgroundFetch = async ({
	id,
	data: { url, method = "GET", urlParameters = {}, headers, credentials },
}: FetchRequest): Promise<FetchResponse> => {
	const urlObject = new URL(url);
	if (urlParameters) {
		for (const [key, value] of Object.entries(urlParameters))
			urlObject.searchParams.append(key, value);
	}

	try {
		const response = await fetch(urlObject.toString(), {
			method,
			headers,
			credentials,
		});
		const responseBody = await response.text();

		return {
			id,
			type: "fetch",
			data: {
				body: responseBody,
				status: response.status,
				statusText: response.statusText,
			},
		};
	} catch (error) {
		return {
			id,
			type: "fetch",
			data: {
				body: "",
				status: 0,
				statusText: "Network error",
				error:
					error instanceof Error ? error.message : "The fetch request failed.",
			},
		};
	}
};
