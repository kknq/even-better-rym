import type { Reception } from "./reception";

const createReceptionRow = (
	category: Reception["categories"][number],
	index: number,
): HTMLDivElement => {
	const row = document.createElement("div");
	row.className =
		index === 0
			? "ebr-user-reception-list__item ebr-user-reception-list__item--top"
			: "ebr-user-reception-list__item";

	const name = document.createElement("span");
	name.className = "ebr-user-reception-list__name";
	name.textContent = category.name;
	name.tabIndex = 0;

	const tooltip = document.createElement("span");
	tooltip.id = `ebr-user-reception-tooltip-${index}`;
	tooltip.className = "ebr-user-reception-list__tooltip";
	tooltip.setAttribute("role", "tooltip");
	tooltip.textContent = category.description;
	name.setAttribute("aria-describedby", tooltip.id);

	const percentage = document.createElement("span");
	percentage.className = "ebr-user-reception-list__percentage";
	percentage.textContent = `${category.percentage.toFixed(1)}%`;
	row.append(name, percentage, tooltip);
	return row;
};

export const appendReception = (
	statsContainer: HTMLElement,
	reception: Reception,
): void => {
	const section = document.createElement("section");
	section.className = "ebr-user-reception";
	section.setAttribute("aria-labelledby", "ebr-user-reception-heading");

	const heading = document.createElement("div");
	heading.className = "header";
	heading.id = "ebr-user-reception-heading";
	heading.textContent = "User reception";

	const meter = document.createElement("div");
	meter.className = `ebr-user-reception-meter ebr-user-reception-meter--${reception.level}`;

	const summary = document.createElement("div");
	summary.className = "ebr-user-reception-meter__summary";

	const label = document.createElement("span");
	label.className = "ebr-user-reception-meter__label";
	label.textContent = reception.label;

	const percentage = document.createElement("span");
	percentage.className = "ebr-user-reception-meter__percentage";
	percentage.textContent = `${reception.positivePercentage}% positive`;
	summary.append(label, percentage);

	const track = document.createElement("div");
	track.className = "ebr-user-reception-meter__track";
	track.setAttribute("aria-hidden", "true");

	const fill = document.createElement("div");
	fill.className = "ebr-user-reception-meter__fill";
	fill.style.width = `${reception.positivePercentage}%`;
	track.append(fill);
	meter.append(summary, track);

	const list = document.createElement("div");
	list.className = "ebr-user-reception-list";
	reception.categories.forEach((category, index) => {
		list.append(createReceptionRow(category, index));
	});

	section.append(heading, meter, list);
	const trendHeader = Array.from(
		statsContainer.querySelectorAll<HTMLElement>(".header"),
	).find((header) => header.textContent?.trim() === "Rating trend");
	const trend = trendHeader ?? statsContainer.querySelector("#chart_div2");
	if (trend) trend.before(section);
	else statsContainer.append(section);
};
