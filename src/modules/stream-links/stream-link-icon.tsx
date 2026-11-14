import { useEffect } from "preact/hooks";

import { Failed } from "~/shared/components/failed";
import { Loader } from "~/shared/components/loader";
import type { Searchable, Service } from "~/shared/services/types";
import { isComplete, isFailed, isLoading } from "~/shared/utils/one-shot";

import type { StreamLinkState } from "./stream-link-state";

export function StreamLinkIcon({
	service,
	state,
	color,
}: Readonly<{
	service: Service & Searchable;
	state: StreamLinkState;
	color?: string;
}>) {
	useEffect(() => {
		const style = document.createElement("style");
		style.textContent = hoverCss;
		document.head.appendChild(style);
		return () => style.remove();
	}, []);

	const coloredIconStyle = { ...iconStyle, color: color ?? iconStyle.color };
	const renderIcon = () => {
		if (isComplete(state) && state.data._tag === "exists") {
			return service.icon({ style: { ...coloredIconStyle, ...fullStyle } });
		}
		if (isComplete(state) && state.data._tag === "found") {
			return service.foundIcon({
				style: { ...coloredIconStyle, ...fullStyle },
			});
		}
		return service.notFoundIcon({
			style: { ...coloredIconStyle, ...emptyStyle },
		});
	};

	return (
		<div className="stream-link-icon" style={{ position: "relative" }}>
			{renderIcon()}
			{isLoading(state) && <Loader style={statusIconStyle} />}
			{isFailed(state) && (
				<Failed error={state.error} style={statusIconStyle} />
			)}
		</div>
	);
}

const hoverCss = `.stream-link-icon:hover svg { opacity: 1 !important; }`;

const iconStyle = {
	color: "var(--mono-3)",
	transition: "opacity 0.2s",
};

const fullStyle = {
	opacity: 0.8,
};

const emptyStyle = {
	opacity: 0.15,
};

const statusIconStyle = {
	position: "absolute",
	right: 0,
	bottom: 0,
	width: 16,
	height: 16,
};
