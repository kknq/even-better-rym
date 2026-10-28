import type { SVGAttributes } from "preact";

export default function MixcloudIcon(props: SVGAttributes<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 554 554"
			xmlns="http://www.w3.org/2000/svg"
			fill="currentColor"
			{...props}
		>
			<rect width="554" height="554" rx="69" />
			<path
				fill="none"
				stroke="white"
				strokeWidth="26"
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M198 260c-11-11-24-16-39-16-32 0-58 26-58 58 0 30 24 54 56 54h178c26 0 46-21 46-46 0-25-19-44-44-44M159 244c9-40 43-70 86-70 51 0 91 41 91 92 0 9-1 18-5 27m79-29c19 29 19 65 0 94m37-115c28 42 28 94 0 136"
			/>
		</svg>
	);
}
