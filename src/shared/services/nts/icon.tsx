import type { SVGAttributes } from "preact";

export default function NTSIcon(props: SVGAttributes<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 425 425"
			xmlns="http://www.w3.org/2000/svg"
			fill="currentColor"
			{...props}
		>
			<rect width="425" height="425" rx="53" />
			<path
				fill="white"
				d="M60 363 123 82h39l-25 240 55-242h23l-64 283h-36l25-249-58 249zM229 80h82l-5 23h-29l-59 260h-26l59-260h-28zM358 155l8-36c3-13 0-18-10-18-11 0-16 7-19 20l-7 30c-3 13-1 23 3 35l21 61c5 14 5 25 2 39l-9 38c-7 28-23 42-49 42-30 0-42-13-35-43l9-36h25l-8 36c-3 15-1 21 10 21 12 0 17-8 21-23l10-39c3-12 0-23-4-36l-20-60c-4-13-6-25-3-39l8-33c6-23 22-35 47-35 28 0 39 12 33 38l-8 38z"
			/>
		</svg>
	);
}
