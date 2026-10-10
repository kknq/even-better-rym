import { describe, expect, test } from "vitest";

import { createSerialQueue } from "./serial-queue";
import { sleep } from "./sleep";

describe("createSerialQueue", () => {
	test("runs each task after the previous one finishes", async () => {
		const enqueue = createSerialQueue();
		const events: string[] = [];
		const task = (name: string, ms: number) => async () => {
			events.push(`start ${name}`);
			await sleep(ms);
			events.push(`end ${name}`);
		};

		void enqueue(task("slow", 20));
		await enqueue(task("fast", 0));

		expect(events).toEqual([
			"start slow",
			"end slow",
			"start fast",
			"end fast",
		]);
	});

	test("still runs a task queued after one that failed", async () => {
		const enqueue = createSerialQueue();
		const failing = enqueue(() => Promise.reject(new Error("failed")));
		let ran = false;

		await expect(failing).rejects.toThrow("failed");
		await enqueue(() => {
			ran = true;
			return Promise.resolve();
		});

		expect(ran).toBe(true);
	});
});
