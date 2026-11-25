import { waitForDocumentReady } from "~/shared/utils/dom";
import { type Filter, getFilter, setFilter, watchFilters } from "./settings";

const filters: Record<Filter, { label: string; className: string }> = {
	soundtracks: { label: "Hide soundtracks", className: "ebr-hide-soundtracks" },
	remixes: { label: "Hide remixes", className: "ebr-hide-remixes" },
	archival: { label: "Hide archival releases", className: "ebr-hide-archival" },
};

function classifyReleases(root: Element): Set<Filter> {
	const present = new Set<Filter>();
	for (const release of root.querySelectorAll(".disco_release")) {
		const tags = [...release.querySelectorAll(".disco_mainline .subtext")]
			.flatMap((element) => {
				const text = (element.textContent ?? "").trim();
				if (!text.startsWith("[") || text.indexOf("]", 1) !== text.length - 1) {
					return [];
				}
				return text
					.slice(1, -1)
					.split(",")
					.map((tag) => tag.trim());
			})
			.map((tag) => tag.toLowerCase());
		const matches: Record<Filter, boolean> = {
			soundtracks: tags.some(
				(tag) => /\bsoundtrack\b/.test(tag) || tag === "film score",
			),
			remixes: tags.includes("remixes"),
			archival: tags.includes("archival"),
		};
		for (const filter of Object.keys(matches) as Filter[]) {
			release.classList.toggle(`ebr-discography-${filter}`, matches[filter]);
			if (matches[filter]) present.add(filter);
		}
	}
	return present;
}

export async function main(): Promise<void> {
	await waitForDocumentReady();
	const root = document.getElementById("discography");
	if (!root || document.querySelector(".ebr-discography-filters")) return;

	const controls = document.createElement("div");
	controls.className = "ebr-discography-filters";
	const inputs = new Map<Filter, HTMLInputElement>();
	const labels = new Map<Filter, HTMLLabelElement>();
	const changedDuringLoad = new Set<Filter>();
	let loading = true;
	function apply(filter: Filter, enabled: boolean) {
		const input = inputs.get(filter);
		if (input) input.checked = enabled;
		root?.classList.toggle(filters[filter].className, enabled);
	}
	const stopWatching = watchFilters((filter, enabled) => {
		if (loading) changedDuringLoad.add(filter);
		apply(filter, enabled);
	});

	for (const filter of Object.keys(filters) as Filter[]) {
		const label = document.createElement("label");
		labels.set(filter, label);
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		inputs.set(filter, checkbox);
		async function saveChange() {
			const enabled = checkbox.checked;
			apply(filter, enabled);
			checkbox.disabled = true;
			try {
				await setFilter(filter, enabled);
			} catch (error) {
				console.error(
					"EvenBetterRYM: could not save discography filter",
					error,
				);
				apply(filter, !enabled);
			} finally {
				checkbox.disabled = false;
			}
		}
		checkbox.addEventListener("change", () => {
			void saveChange();
		});
		label.append(checkbox, document.createTextNode(filters[filter].label));
		controls.append(label);
	}
	try {
		const saved = await Promise.all(
			(Object.keys(filters) as Filter[]).map(async (filter) => ({
				filter,
				enabled: await getFilter(filter),
			})),
		);
		for (const { filter, enabled } of saved) {
			if (!changedDuringLoad.has(filter)) apply(filter, enabled);
		}
	} catch (error) {
		stopWatching();
		console.error("EvenBetterRYM: could not load discography filters", error);
		return;
	}
	loading = false;
	function refresh() {
		if (!root) return;
		const present = classifyReleases(root);
		for (const [filter, label] of labels) label.hidden = !present.has(filter);
		controls.hidden = present.size === 0;
	}
	refresh();
	const toolbar = root.parentElement?.querySelector(".disco_toolbar");
	if (toolbar) toolbar.after(controls);
	else root.before(controls);

	new MutationObserver(refresh).observe(root, {
		childList: true,
		characterData: true,
		subtree: true,
	});
}
