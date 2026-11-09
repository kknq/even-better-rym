type InlineNoticeOptions = {
	className: string;
	message: string;
	// onClick may return an error, shown below the notice instead of acting.
	action: { value: string; title: string; onClick: () => string | undefined };
	place: (notice: HTMLElement) => void;
	margin: string;
};

// Shows a compact light red notice with its message and button on one line,
// and any error from the button in bright red below it, returning a function
// that removes them.
export const showInlineNotice = ({
	className,
	message,
	action,
	place,
	margin,
}: InlineNoticeOptions): (() => void) => {
	const container = document.createElement("div");
	container.className = className;
	container.style.margin = margin;
	const box = document.createElement("div");
	Object.assign(box.style, {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: "4px 8px",
		width: "fit-content",
		maxWidth: "100%",
		boxSizing: "border-box",
		padding: "3px 4px 3px 8px",
		background: "#fff0f0",
		border: "1px solid #e5a0a0",
		borderRadius: "3px",
		fontSize: "0.9em",
		overflowWrap: "anywhere",
	});
	const text = document.createElement("span");
	// Only the text is red: RYM's button hover color falls back to the
	// inherited one.
	text.style.color = "#8a1c1c";
	text.textContent = message;
	const button = document.createElement("input");
	button.type = "button";
	button.className = "btn btn_small";
	button.value = action.value;
	button.title = action.title;
	button.style.flexShrink = "0";
	const error = document.createElement("div");
	error.className = "ebr-inline-notice-error";
	error.setAttribute("role", "alert");
	Object.assign(error.style, {
		marginTop: "4px",
		color: "#e00000",
		fontSize: "0.9em",
		fontWeight: "700",
		overflowWrap: "anywhere",
	});
	error.hidden = true;
	button.addEventListener("click", () => {
		const message = action.onClick();
		error.textContent = message ?? "";
		error.hidden = message === undefined;
	});
	box.append(text, button);
	container.append(box, error);
	place(container);
	return () => container.remove();
};
