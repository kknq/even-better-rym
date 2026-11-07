import {
	DiscographyRateLimitError,
	loadSection,
	type Releases,
	readReleases,
	readTotal,
} from "~/shared/artist-discography";
import {
	getSelectedTypes,
	watchSelectedTypes,
} from "~/shared/discography-progress/settings";
import { type ReleaseType, releaseTypes } from "~/shared/release-types";
import { waitForDocumentReady } from "~/shared/utils/dom";

type Section = {
	releases: Releases;
	total: number;
	complete: boolean;
	loading: boolean;
	error: boolean;
	requested: boolean;
};

function createBar(
	label: string,
	releases: Releases,
	total: number,
	activity: "listened to" | "watched" = "listened to",
) {
	const listened = [...releases.values()].filter(Boolean).length;
	const container = document.createElement("div");
	container.className = "ebr-discography-bar";
	const text = document.createElement("span");
	text.textContent = `You have ${activity} ${listened} of ${total}`;
	const progress = document.createElement("progress");
	progress.max = total || 1;
	progress.value = listened;
	progress.setAttribute("aria-label", label);
	progress.setAttribute("aria-valuetext", text.textContent);
	const percentage = document.createElement("span");
	percentage.className = "ebr-discography-percentage";
	percentage.textContent = `${total > 0 ? Math.floor((listened * 100) / total) : 0}%`;
	if (total > 0 && listened === total) {
		const star = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		star.classList.add("ebr-discography-complete");
		star.setAttribute("viewBox", "0 0 24 24");
		star.setAttribute("role", "img");
		star.setAttribute("aria-label", "Complete");
		const shape = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"path",
		);
		shape.setAttribute(
			"d",
			"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z",
		);
		star.append(shape);
		percentage.append(star);
	}
	container.append(text, progress, percentage);
	return container;
}

export async function main(): Promise<void> {
	await waitForDocumentReady();
	const element = document.querySelector<HTMLElement>("#discography");
	if (!element || document.querySelector(".ebr-discography-overall")) return;
	const root = element;
	let selected = await getSelectedTypes();
	const sections = new Map<ReleaseType, Section>();
	const overall = document.createElement("section");
	overall.className = "ebr-discography-overall";
	overall.setAttribute("aria-label", "Discography coverage");
	const heading = document.createElement("strong");
	heading.textContent = "Overall discography coverage";
	const summary = document.createElement("div");
	const notice = document.createElement("div");
	notice.setAttribute("role", "status");
	overall.append(heading, summary, notice);
	root.before(overall);
	let rateLimit: DiscographyRateLimitError | null = null;
	let cooldownTimer: ReturnType<typeof setTimeout> | undefined;

	function requestLoad(section: Section) {
		if (rateLimit && Date.now() < rateLimit.retryAt) return;
		if (rateLimit) {
			rateLimit = null;
			for (const section of sections.values()) section.error = false;
		}
		section.error = false;
		section.requested = true;
		render();
		void loadMissing();
	}

	function shouldLoad(type: ReleaseType, section: Section): boolean {
		return (
			!section.complete &&
			!section.loading &&
			!section.error &&
			(selected.has(type) || section.requested)
		);
	}

	const observer = new MutationObserver(refresh);
	function observe() {
		observer.observe(root, {
			childList: true,
			characterData: true,
			subtree: true,
		});
	}

	function statusText(type: ReleaseType, section: Section): string {
		if (rateLimit) return "Paused: RYM rate limit. ";
		if (section.error) return "Full coverage unavailable. ";
		if (section.loading) return "Loading full coverage...";
		if (selected.has(type) || section.requested) {
			return "Waiting to load full coverage...";
		}
		return "Full coverage not loaded. ";
	}

	function createStatus(type: ReleaseType, section: Section) {
		const status = document.createElement("span");
		status.className = "ebr-discography-status";
		status.textContent = statusText(type, section);
		if (
			!section.loading &&
			(rateLimit || section.error || !selected.has(type))
		) {
			const retry = document.createElement("button");
			retry.type = "button";
			retry.className = "ebr-discography-load";
			retry.textContent =
				rateLimit || section.error ? "Retry" : "Load coverage";
			retry.disabled = !!rateLimit && Date.now() < rateLimit.retryAt;
			retry.addEventListener("click", () => {
				requestLoad(section);
			});
			status.append(retry);
		}
		return status;
	}

	function renderCategory(type: ReleaseType, section: Section) {
		const showing = root.querySelector(`#disco_header_showing_${type}`);
		const header = showing?.closest(".disco_header_top");
		const bar = createBar(
			releaseTypes[type].label,
			section.releases,
			section.total,
			type === "d" || type === "o" ? "watched" : "listened to",
		);
		bar.classList.add("ebr-discography-category");
		if (!section.complete) bar.replaceChildren(createStatus(type, section));
		header?.classList.add("ebr-discography-heading");
		header?.append(bar);
	}

	function summaryText(incomplete: boolean): string | null {
		if (selected.size === 0) {
			return "Select release types in the extension popup to calculate coverage.";
		}
		if (!incomplete) return null;
		if (rateLimit) return "Full discography coverage is paused.";
		if (
			[...sections].some(
				([type, section]) => selected.has(type) && section.error,
			)
		) {
			return "Full coverage unavailable. Retry the affected categories below.";
		}
		return "Loading full discography coverage...";
	}

	function render() {
		observer.disconnect();
		root.querySelectorAll(".ebr-discography-category").forEach((el) => {
			el.remove();
		});
		const combined: Releases = new Map();
		let incomplete = false;
		for (const [type, section] of sections) {
			renderCategory(type, section);
			if (!selected.has(type)) continue;
			incomplete ||= !section.complete;
			for (const [id, listened] of section.releases) {
				combined.set(id, (combined.get(id) ?? false) || listened);
			}
		}
		notice.textContent = rateLimit?.message ?? "";
		summary.replaceChildren();
		const text = summaryText(incomplete);
		if (text) {
			summary.textContent = text;
		} else {
			// A release can appear in more than one category.
			summary.append(
				createBar("Overall discography coverage", combined, combined.size),
			);
		}
		observe();
	}

	async function loadCoverage(type: ReleaseType, section: Section) {
		const releases = readReleases(await loadSection(type));
		if (releases.size < section.total) {
			throw new Error(`Incomplete ${releaseTypes[type].label} response`);
		}
		// Prefer any edits made on the page while the request was in flight.
		const container = root.querySelector(`#disco_type_${type}`);
		if (container) {
			for (const [id, listened] of readReleases(container)) {
				releases.set(id, listened);
			}
		}
		section.releases = releases;
		section.total = releases.size;
		section.complete = true;
	}

	function handleLoadError(error: unknown, section: Section) {
		console.error("EvenBetterRYM: could not load discography coverage", error);
		section.error = true;
		if (error instanceof DiscographyRateLimitError) {
			rateLimit = error;
			clearTimeout(cooldownTimer);
			cooldownTimer = setTimeout(
				render,
				Math.max(0, error.retryAt - Date.now()),
			);
		}
	}

	let loading = false;
	async function loadMissing() {
		if (loading || rateLimit) return;
		const next = [...sections].find(([type, section]) =>
			shouldLoad(type, section),
		);
		if (!next) return;
		const [type, section] = next;
		loading = true;
		section.loading = true;
		render();
		try {
			await loadCoverage(type, section);
		} catch (error) {
			handleLoadError(error, section);
		} finally {
			loading = false;
			section.loading = false;
			render();
		}
		void loadMissing();
	}

	function refresh() {
		for (const type of Object.keys(releaseTypes) as ReleaseType[]) {
			const container = root.querySelector(`#disco_type_${type}`);
			if (!container) continue;
			const releases = readReleases(container);
			const total = readTotal(root, type);
			if (total === null) continue;
			let section = sections.get(type);
			if (!section) {
				section = {
					releases,
					total,
					complete: releases.size >= total,
					loading: false,
					error: false,
					requested: false,
				};
				sections.set(type, section);
			} else {
				for (const [id, listened] of releases) {
					section.releases.set(id, listened);
				}
				section.total = Math.max(section.total, total, section.releases.size);
				section.complete = section.releases.size >= section.total;
			}
		}
		render();
		void loadMissing();
	}
	refresh();
	watchSelectedTypes((next) => {
		selected = next;
		render();
		void loadMissing();
	});
}
