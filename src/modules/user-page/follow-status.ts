import { getCurrentUsername, normalizeUsername } from "~/shared/utils/user";

import { getFollowers } from "./followers";

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
	const status = document.createElement("span");
	status.setAttribute("role", "status");
	cell.append(status);
	status.setAttribute("aria-busy", "true");
	status.textContent = "checking follow status...";
	try {
		const followers = await getFollowers(username);
		const followsYou = followers.includes(normalizeUsername(profileUsername));
		status.textContent = followsYou ? "follows you" : "does not follow you";
		status.style.color = followsYou
			? "var(--gen-bg-darkgreen, #2a6b2a)"
			: "#a34f4f";
		status.title = "Based on your followers list, cached for up to one minute.";
	} catch (error) {
		console.error("EvenBetterRYM: could not load follow status", error);
		status.textContent = "follow status unavailable";
		status.title =
			"Could not load your followers. Reload the page to try again.";
	} finally {
		status.setAttribute("aria-busy", "false");
	}
};
