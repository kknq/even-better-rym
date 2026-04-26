import { runPage } from "~/shared/page-settings";

import addDescriptorDropdown from "./use-cases/add-descriptor-dropdown";
import fixPaginationParameters from "./use-cases/fix-pagination-parameters";

async function main() {
	await Promise.all([fixPaginationParameters(), addDescriptorDropdown()]);
}

await runPage("voteHistoryDescriptors", async () => {
	await main();
});
