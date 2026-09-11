export type ReleaseIssue = {
	catalogNumber: string;
	country: string;
	format: string;
	label: string;
	year: number | undefined;
};

const getYear = (element: Element): number | undefined => {
	const match = element.getAttribute("title")?.match(/\b(18|19|20)\d{2}\b/);
	return match ? Number(match[0]) : undefined;
};

const readIssue = (element: Element): ReleaseIssue | undefined => {
	const labelElement = element.querySelector<HTMLElement>(".issue_label");
	const labelText = labelElement?.getAttribute("title") ?? "";
	const separator = labelText.lastIndexOf("/");
	const catalogNumber =
		separator < 0 ? "" : labelText.slice(separator + 1).trim();
	if (!catalogNumber || catalogNumber.toLowerCase() === "n/a") return undefined;

	return {
		catalogNumber,
		country:
			element.querySelector<HTMLElement>(".ui_flag")?.getAttribute("title") ??
			"",
		format:
			element
				.querySelector<HTMLElement>(".issue_formats")
				?.getAttribute("title") ?? "",
		label: separator < 0 ? "" : labelText.slice(0, separator).trim(),
		year: getYear(element.querySelector(".issue_year") ?? element),
	};
};

export const findReleaseIssue = (): ReleaseIssue | undefined => {
	const issues = Array.from(
		document.querySelectorAll<HTMLElement>(".issue_info:not(.release_view)"),
	);
	const currentPath = `${location.pathname.replace(/\/+$/, "")}/`;
	const current =
		issues.find((issue) => issue.classList.contains("current")) ??
		issues.find((issue) =>
			Array.from(issue.querySelectorAll<HTMLAnchorElement>("a[href]")).some(
				(anchor) =>
					new URL(anchor.href, location.href).pathname === currentPath,
			),
		);
	const primary = issues.find((issue) =>
		issue.querySelector(".primary_indicator"),
	);
	return readIssue(current ?? primary ?? issues[0] ?? document.body);
};
