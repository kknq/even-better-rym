import { TIDAL_ALBUM_REGEX } from "~/shared/services/tidal/regex";

export function enableTidalLinkConversion(
	input: HTMLInputElement,
	anchor: HTMLElement = input,
) {
	const notice = document.createElement("div");
	notice.setAttribute("role", "status");
	Object.assign(notice.style, {
		marginTop: "4px",
		fontSize: "0.85em",
		color: "#4286c4",
		overflowWrap: "anywhere",
		maxWidth: "600px",
	});
	anchor.after(notice);

	const getAlbumId = () => TIDAL_ALBUM_REGEX.exec(input.value.trim())?.[1];
	const updateNotice = () => {
		const id = getAlbumId();
		notice.hidden = !id;
		notice.textContent = id
			? `This link will be converted to https://tidal.com/album/${id} so RYM can handle it properly.`
			: "";
	};
	const convert = () => {
		const id = getAlbumId();
		if (!id) return;
		input.value = `https://tidal.com/album/${id}`;
		input.dispatchEvent(new Event("input", { bubbles: true }));
		notice.hidden = false;
		notice.textContent = `This link was converted to https://tidal.com/album/${id} so RYM can handle it properly.`;
	};

	input.addEventListener("input", updateNotice);
	input.addEventListener("blur", convert);
	input.form?.addEventListener("submit", convert, true);
	input.form
		?.querySelector("#submit_btn")
		?.addEventListener("click", convert, true);
	updateNotice();
}
