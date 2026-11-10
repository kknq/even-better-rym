import { waitForDocumentReady } from "~/shared/utils/dom";
import { getCurrentUsername, normalizeUsername } from "~/shared/utils/user";

import { cacheFollowers, getFollowers, parseFollowers } from "./followers";

type StatusTarget = {
	username: string;
	status: HTMLSpanElement;
	icon?: boolean;
};

const FOLLOWER_COLOR = "var(--gen-bg-darkgreen, #2a6b2a)";
const NON_FOLLOWER_COLOR = "#a34f4f";

const followerLabels = ["follows you", "does not follow you"] as const;
const followingLabels = ["you follow them", "you do not follow them"] as const;

const createLegend = (labels: readonly [string, string]): HTMLElement => {
	const legend = document.createElement("aside");
	legend.className = "ebr-follow-status-legend";
	legend.setAttribute("aria-label", "Follow status legend");
	for (const [index, label] of labels.entries()) {
		const item = document.createElement("span");
		const icon = document.createElement("span");
		icon.textContent = index === 0 ? "\u2713" : "\u2717";
		icon.style.color = index === 0 ? FOLLOWER_COLOR : NON_FOLLOWER_COLOR;
		icon.setAttribute("aria-hidden", "true");
		item.append(icon, ` ${label}`);
		legend.append(item);
	}
	return legend;
};

const createStatus = (): HTMLSpanElement => {
	const status = document.createElement("span");
	status.setAttribute("role", "status");
	status.setAttribute("aria-busy", "true");
	status.textContent = "checking follow status...";
	return status;
};

const updateStatuses = async (
	targets: StatusTarget[],
	loadFollowers: () => Promise<string[]>,
	labels: readonly [string, string] = followerLabels,
	source = "Based on your followers list, cached for up to one minute.",
): Promise<void> => {
	try {
		const followers = new Set(await loadFollowers());
		for (const { username, status, icon } of targets) {
			const followsYou = followers.has(normalizeUsername(username));
			const label = followsYou ? labels[0] : labels[1];
			status.textContent = icon ? (followsYou ? "\u2713" : "\u2717") : label;
			status.style.color = followsYou ? FOLLOWER_COLOR : NON_FOLLOWER_COLOR;
			if (icon) status.setAttribute("aria-label", label);
			status.title = `${label}. ${source}`;
		}
	} catch (error) {
		console.error("EvenBetterRYM: could not load follow status", error);
		for (const { status, icon } of targets) {
			status.textContent = icon ? "?" : "follow status unavailable";
			if (icon) status.setAttribute("aria-label", "follow status unavailable");
			status.title =
				labels === followerLabels
					? "Could not load your followers. Reload the page to try again."
					: "Could not read the users you follow. Reload the page to try again.";
		}
	} finally {
		for (const { status } of targets) {
			status.setAttribute("aria-busy", "false");
		}
	}
};

export const addFollowStatus = async (): Promise<void> => {
	const username = getCurrentUsername();
	const profileUsername = /^\/~([^/]+)\/?$/.exec(location.pathname)?.[1];
	if (
		!username ||
		!profileUsername ||
		normalizeUsername(username) === normalizeUsername(profileUsername) ||
		document.querySelector(".ebr-follow-status")
	) {
		return;
	}

	const table = document.querySelector<HTMLTableElement>(
		".profilehii table.mbgen",
	);
	if (!table) return;

	const row = table.insertRow(-1);
	row.className = "ebr-follow-status";
	const cell = row.insertCell();
	cell.colSpan = 5;
	const status = createStatus();
	cell.append(status);
	await updateStatuses([{ username: profileUsername, status }], () =>
		getFollowers(username),
	);
};

export const addFriendListFollowStatus = async (): Promise<void> => {
	const username = getCurrentUsername();
	const owner = /^\/friends\/([^/]+)\/?$/.exec(location.pathname)?.[1];
	if (
		!username ||
		!owner ||
		normalizeUsername(owner) !== normalizeUsername(username)
	) {
		return;
	}

	const following = [...document.querySelectorAll(".bubble_content")].find(
		(content) =>
			content.querySelector(".ookiig")?.textContent?.trim() ===
			"Users you follow",
	);
	if (!following) return;

	const followersHeading = [
		...document.querySelectorAll(".bubble_header"),
	].find((heading) => heading.textContent?.trim() === "Followers");
	const followersSection = followersHeading?.nextElementSibling;
	if (followersSection?.classList.contains("bubble_content")) {
		const outgoingTargets: StatusTarget[] = [];
		for (const link of followersSection.querySelectorAll<HTMLAnchorElement>(
			":scope > a.user",
		)) {
			if (
				link.nextElementSibling?.classList.contains("ebr-follow-status-icon")
			) {
				continue;
			}
			const url = new URL(link.getAttribute("href") ?? "", location.origin);
			const name = /^\/~([^/]+)\/?$/.exec(url.pathname)?.[1];
			if (!name || url.origin !== location.origin) continue;

			const status = createStatus();
			status.className = "ebr-follow-status-icon";
			status.textContent = "...";
			status.setAttribute("aria-label", "checking follow status");
			link.after(status);
			outgoingTargets.push({ username: name, status, icon: true });
		}
		if (outgoingTargets.length > 0) {
			if (!followersSection.querySelector(".ebr-follow-status-legend")) {
				const legend = createLegend(followingLabels);
				legend.classList.add("ebr-follow-status-followers-legend");
				followersSection.prepend(legend);
			}
			await updateStatuses(
				outgoingTargets,
				() => {
					const names: string[] = [];
					for (const link of following.querySelectorAll<HTMLAnchorElement>(
						".or_card_frame .card_link > a.user",
					)) {
						const url = new URL(
							link.getAttribute("href") ?? "",
							location.origin,
						);
						const name = /^\/~([^/]+)\/?$/.exec(url.pathname)?.[1];
						if (!name || url.origin !== location.origin) {
							throw new Error("Invalid profile link in the users you follow");
						}
						names.push(normalizeUsername(name));
					}
					return Promise.resolve(names);
				},
				followingLabels,
				"Based on the users you follow displayed on this page.",
			);
		}
	}

	const targets: StatusTarget[] = [];
	for (const link of following.querySelectorAll<HTMLAnchorElement>(
		".or_card_frame .card_link > a.user",
	)) {
		const container = link.parentElement;
		if (!container || container.querySelector(".ebr-follow-status")) continue;
		const url = new URL(link.getAttribute("href") ?? "", location.origin);
		const name = /^\/~([^/]+)\/?$/.exec(url.pathname)?.[1];
		if (!name || url.origin !== location.origin) continue;

		const status = createStatus();
		status.className = "ebr-follow-status";
		status.style.display = "block";
		status.style.fontSize = "0.85em";
		container.append(status);
		targets.push({ username: name, status });
	}
	if (targets.length === 0) return;

	await updateStatuses(targets, async () => {
		const followers = parseFollowers(document, username);
		await cacheFollowers(username, followers);
		return followers;
	});
};

export const addAccountFriendsFollowStatus = async (): Promise<void> => {
	if (!/^\/account\/friends\/?$/.test(location.pathname)) return;
	const username = getCurrentUsername();
	if (!username) return;

	const targets: StatusTarget[] = [];
	for (const heading of document.querySelectorAll(".bubble_header")) {
		const title = heading.textContent?.trim().toLowerCase();
		const section = heading.nextElementSibling;
		if (!section?.classList.contains("bubble_content")) continue;
		const selector =
			title === "recently updated"
				? ":scope > table.mbgen > tbody > tr > td > a.user"
				: title === "online status"
					? ":scope > a.user"
					: null;
		if (!selector) continue;

		for (const link of section.querySelectorAll<HTMLAnchorElement>(selector)) {
			if (
				link.nextElementSibling?.classList.contains("ebr-follow-status-icon")
			) {
				continue;
			}
			const url = new URL(link.getAttribute("href") ?? "", location.origin);
			const name = /^\/~([^/]+)\/?$/.exec(url.pathname)?.[1];
			if (!name || url.origin !== location.origin) continue;

			const status = createStatus();
			status.className = "ebr-follow-status-icon";
			status.textContent = "...";
			status.setAttribute("aria-label", "checking follow status");
			link.after(status);
			targets.push({ username: name, status, icon: true });
		}
	}
	if (targets.length === 0) return;

	const frame = document
		.querySelector("#page_breadcrumb > #ui_breadcrumb_item_page_breadcrumb")
		?.closest(".ui_breadcrumb_frame");
	if (frame && !frame.querySelector(".ebr-follow-status-legend")) {
		frame.classList.add("ebr-follow-status-heading");
		frame.append(createLegend(followerLabels));
	}

	await updateStatuses(targets, () => getFollowers(username));
};

export const main = async (): Promise<void> => {
	await waitForDocumentReady();
	if (/^\/account\/friends\/?$/.test(location.pathname)) {
		await addAccountFriendsFollowStatus();
	} else if (location.pathname.startsWith("/friends/")) {
		await addFriendListFollowStatus();
	} else {
		await addFollowStatus();
	}
};
