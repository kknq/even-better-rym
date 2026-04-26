import type { SVGAttributes } from "preact";

import CheckIcon from "../icons/check";

export function Complete({
	className,
	...properties
}: Omit<SVGAttributes<SVGSVGElement>, "className"> & {
	className?: string;
}) {
	return (
		<CheckIcon
			className={className}
			style={{
				color: "var(--gen-bg-darkgreen)",
			}}
			{...properties}
		/>
	);
}
