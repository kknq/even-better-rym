import { waitForDocumentReady } from "~/shared/utils/dom";

const loaderSelector = ".comments_load";

const waitForUpdate = (
	list: HTMLElement,
	ready: () => boolean,
	signal: AbortSignal,
): Promise<void> =>
	new Promise((resolve, reject) => {
		const finish = (error?: Error) => {
			observer.disconnect();
			clearTimeout(timeout);
			signal.removeEventListener("abort", abort);
			if (error) reject(error);
			else resolve();
		};
		const check = () => {
			if (ready()) finish();
		};
		const abort = () => finish(new Error("Comment loading was cancelled."));
		const observer = new MutationObserver(check);
		const timeout = setTimeout(
			() =>
				finish(
					new Error("RYM did not finish loading comments. Try again later."),
				),
			30_000,
		);
		observer.observe(list, {
			childList: true,
			subtree: true,
			attributes: true,
		});
		signal.addEventListener("abort", abort, { once: true });
		check();
	});

export const main = async (): Promise<void> => {
	await waitForDocumentReady();
	for (const section of document.querySelectorAll<HTMLElement>(
		".section_comments",
	)) {
		const list = section.querySelector<HTMLElement>(".comments_list");
		const heading = section.querySelector(".release_page_header");
		if (
			!list ||
			!heading ||
			!list.querySelector(loaderSelector) ||
			section.querySelector(".ebr-load-all-comments")
		) {
			continue;
		}

		const button = document.createElement("button");
		button.type = "button";
		button.className = "btn flat_btn btn_small ebr-load-all-comments";
		button.textContent = "Load all comments";
		const status = document.createElement("span");
		status.setAttribute("role", "status");
		heading.classList.add("ebr-comments-header");
		status.className = "ebr-comments-status";
		button.title =
			"Loads comments in batches with a random 750-850 ms pause between requests.";
		heading.append(button, status);

		let running = false;
		let stopRequested = false;
		let wakePause: (() => void) | undefined;
		let clickingLoader = false;
		// Keep manual clicks from starting a second request during bulk loading.
		list.addEventListener(
			"click",
			(event) => {
				if (
					running &&
					!clickingLoader &&
					event.target instanceof Element &&
					event.target.closest(loaderSelector)
				) {
					event.preventDefault();
					event.stopImmediatePropagation();
				}
			},
			true,
		);

		const loadAll = async () => {
			if (running) return;
			running = true;
			stopRequested = false;
			button.textContent = "Stop loading";
			list.setAttribute("aria-busy", "true");
			const progress = () => {
				status.textContent = `Loading comments... ${list.querySelectorAll(".comment").length} loaded`;
			};
			progress();
			const controller = new AbortController();
			let restoreLoader: (() => void) | undefined;
			try {
				if (list.querySelector(loaderSelector)?.classList.contains("loading")) {
					throw new Error(
						"Comments are already loading. Wait before trying again.",
					);
				}
				while (list.isConnected) {
					const loader = list.querySelector<HTMLElement>(loaderSelector);
					if (!loader) break;
					if (
						!/^comments_load_offset_\d+$/.test(loader.id) ||
						!loader.getAttribute("onclick")
					) {
						throw new Error("Could not recognize RYM's comment loader.");
					}
					const originalText = loader.textContent;
					restoreLoader = () => {
						if (loader.isConnected) {
							loader.classList.remove("loading");
							loader.textContent = originalText;
						}
					};
					const loaded = waitForUpdate(
						list,
						() => {
							const next = list.querySelector<HTMLElement>(loaderSelector);
							return (
								!next ||
								(next.id !== loader.id && !next.classList.contains("loading"))
							);
						},
						controller.signal,
					);
					try {
						clickingLoader = true;
						loader.click();
					} finally {
						clickingLoader = false;
					}
					await loaded;
					if (stopRequested) break;
					progress();
					if (list.querySelector(loaderSelector)) {
						await new Promise<void>((resolve) => {
							const timeout = setTimeout(
								() => {
									wakePause = undefined;
									resolve();
								},
								750 + Math.floor(Math.random() * 101),
							);
							wakePause = () => {
								clearTimeout(timeout);
								wakePause = undefined;
								resolve();
							};
						});
					}
					if (stopRequested) break;
				}
				if (!list.isConnected) throw new Error("The comment box was removed.");
				const count = list.querySelectorAll(".comment").length;
				if (stopRequested && list.querySelector(loaderSelector)) {
					button.textContent = "Load all comments";
					button.disabled = false;
					status.textContent = `Stopped. ${count} comments loaded.`;
				} else {
					button.textContent = "All comments loaded";
					button.disabled = true;
					status.textContent = `${count} comments`;
				}
			} catch (error) {
				console.error("EvenBetterRYM: could not load all comments", error);
				status.textContent =
					error instanceof Error
						? error.message
						: "Could not load all comments.";
				button.disabled = false;
				button.textContent = "Load all comments";
			} finally {
				controller.abort();
				restoreLoader?.();
				running = false;
				list.removeAttribute("aria-busy");
			}
		};
		button.addEventListener("click", () => {
			if (running) {
				stopRequested = true;
				button.textContent = "Stopping...";
				button.disabled = true;
				status.textContent = "Stopping after the current request, if any...";
				wakePause?.();
				return;
			}
			void loadAll();
		});
	}
};
