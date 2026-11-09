import { useEffect } from "preact/hooks";

import { SEARCHABLES } from "~/shared/services";
import type { StreamLinkSettings } from "~/shared/stream-links/settings";

import { StreamLink } from "./stream-link";
import { usePageData } from "./use-page-data";

export function StreamLinks({
	settings,
}: Readonly<{ settings: StreamLinkSettings }>) {
	const pageData = usePageData();

	useEffect(() => {
		const style = document.createElement("style");
		style.textContent = `
      #media_link_button_container_top {
        display: none;
      }
    `;
		document.head.appendChild(style);

		return () => {
			style.remove();
		};
	}, []);

	return (
		<div
			style={{
				display: "flex",
				gap: 4,
				alignItems: "center",
				justifyContent: "center",
				marginTop: "1.5em",
			}}
		>
			{SEARCHABLES.map((service) => (
				<StreamLink
					key={service.id}
					service={service}
					pageData={pageData}
					color={
						settings.useServiceColors ? settings.colors[service.id] : undefined
					}
				/>
			))}
		</div>
	);
}
