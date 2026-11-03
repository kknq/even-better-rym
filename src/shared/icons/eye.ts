export const eyeIcon = (hidden: boolean): SVGSVGElement => {
	const namespace = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(namespace, "svg");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("aria-hidden", "true");
	const path = document.createElementNS(namespace, "path");
	path.setAttribute(
		"d",
		hidden
			? "M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.8 10.8 0 0 1 12 5c5.2 0 8.7 4.3 9.7 7-0.4 1.1-1.2 2.5-2.5 3.7M6.1 6.1C4.2 7.5 3 9.7 2.3 12c1 2.7 4.5 7 9.7 7 1.1 0 2.1-.2 3-.5"
			: "M2.3 12C3.3 9.3 6.8 5 12 5s8.7 4.3 9.7 7c-1 2.7-4.5 7-9.7 7S3.3 14.7 2.3 12Z",
	);
	svg.append(path);
	if (!hidden) {
		const circle = document.createElementNS(namespace, "circle");
		circle.setAttribute("cx", "12");
		circle.setAttribute("cy", "12");
		circle.setAttribute("r", "3");
		svg.append(circle);
	}
	return svg;
};
