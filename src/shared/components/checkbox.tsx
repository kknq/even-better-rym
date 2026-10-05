import type { JSX } from "preact";

export function Checkbox(
	props: Readonly<
		Pick<
			JSX.InputHTMLAttributes<HTMLInputElement>,
			"checked" | "disabled" | "onChange" | "aria-label"
		>
	>,
) {
	return <input {...props} type="checkbox" class="ebr-checkbox" />;
}
