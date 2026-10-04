import { runModule } from "~/shared/page-settings";

import { injectStreamLinkConverter } from "./app";

await runModule("streamLinkSubmission", async () => {
	await injectStreamLinkConverter();
});
