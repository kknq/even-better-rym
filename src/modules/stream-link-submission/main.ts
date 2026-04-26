import { runPage } from "~/shared/page-settings";

import { injectStreamLinkConverter } from "./app";

await runPage("streamLinkSubmission", async () => {
	await injectStreamLinkConverter();
});
