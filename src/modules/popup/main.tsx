import { render } from "preact";

import "~/shared/components/checkbox.css";

import { App } from "./app";

const root = document.getElementById("app");
if (root) render(<App />, root);
