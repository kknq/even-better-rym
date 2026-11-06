import { waitForDocumentReady } from "~/shared/utils/dom";
import { getCurrentUsername, normalizeUsername } from "~/shared/utils/user";

import { cacheFollowers, getFollowers, parseFollowers } from "./followers";

type StatusTarget = { username: string; status: HTMLSpanElement };

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
): Promise<void> => {
	try {
		const followers = new Set(await loadFollowers());
		for (const { username, status } of targets) {
			const followsYou = followers.has(normalizeUsername(username));
			status.textContent = followsYou ? "follows you" : "does not follow you";
			status.style.color = followsYou
				? "var(--gen-bg-darkgreen, #2a6b2a)"
				: "#a34f4f";
			status.title =
				"Based on your followers list, cached for up to one minute.";
		}
	} catch (error) {
		console.error("EvenBetterRYM: could not load follow status", error);
		for (const { status } of targets) {
			status.textContent = "follow status unavailable";
			status.title =
				"Could not load your followers. Reload the page to try again.";
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

export const main = async (): Promise<void> => {
	await waitForDocumentReady();
	if (location.pathname.startsWith("/friends/")) {
		await addFriendListFollowStatus();
	} else {
		await addFollowStatus();
	}
};
