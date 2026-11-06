import { runModule } from "~/shared/page-settings";

import { main } from "./app";

await runModule("followStatus", () => main().catch(console.error));
