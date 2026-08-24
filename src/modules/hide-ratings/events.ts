/**
 * Namespaced custom events used to coordinate the show/hide toggle across
 * every part of the feature (body class, button label, profile observer).
 */

const fitReleaseCharts = (): void => {
	window.requestAnimationFrame(() => {
		window.requestAnimationFrame(() => {
			for (const id of ["chart_div", "chart_div2"]) {
				const container = document.getElementById(id);
				const parent = container?.parentElement;
				const graphic = container?.querySelector<
					SVGSVGElement | HTMLCanvasElement
				>("svg, canvas");
				if (!container || !parent || !graphic) continue;

				const originalWidth =
					Number(graphic.dataset.ebrChartWidth) ||
					graphic.getBoundingClientRect().width;
				const originalHeight =
					Number(graphic.dataset.ebrChartHeight) ||
					graphic.getBoundingClientRect().height;
				const width = Math.floor(parent.getBoundingClientRect().width);
				const height = Math.round((originalHeight * width) / originalWidth);
				if (!width || !height) continue;

				graphic.dataset.ebrChartWidth = String(originalWidth);
				graphic.dataset.ebrChartHeight = String(originalHeight);
				container.style.width = `${width}px`;
				container.style.height = `${height}px`;
				container.style.overflow = "hidden";

				if (graphic instanceof SVGSVGElement) {
					graphic.setAttribute(
						"viewBox",
						`0 0 ${originalWidth} ${originalHeight}`,
					);
					graphic.setAttribute("width", String(width));
					graphic.setAttribute("height", String(height));
				}

				graphic.style.width = `${width}px`;
				graphic.style.height = `${height}px`;
			}
		});
	});
};

export const fireHide = (): void => {
	document.dispatchEvent(new CustomEvent("ebrHideRatings"));
};

export const fireShow = (): void => {
	document.dispatchEvent(new CustomEvent("ebrShowRatings"));
};

/**
 * Keeps `document.body.classList` in sync with the current visibility state.
 * Must be called once after the body element exists.
 */
export const setupBodyListeners = (): void => {
	document.addEventListener("ebrHideRatings", () => {
		document.body.classList.add("ebr-hide-ratings");
	});
	document.addEventListener("ebrShowRatings", () => {
		document.body.classList.remove("ebr-hide-ratings");
		if (!document.querySelector("#chart_div, #chart_div2")) return;

		fitReleaseCharts();
	});
};
