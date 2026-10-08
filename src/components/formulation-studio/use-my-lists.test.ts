import assert from "node:assert/strict";
import { test } from "node:test";

import { priceEditState, SerializedEditQueue } from "./use-my-lists";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test("price writes are serialized and only the newest revision is reconciled", async () => {
  const queue = new SerializedEditQueue<number>(60_000);
  const first = deferred<number>();
  const second = deferred<number>();
  const secondStarted = deferred<void>();
  const started: number[] = [];
  const committed: number[] = [];
  const persisted: number[] = [];

  queue.enqueue("list|corn", () => {
    started.push(1);
    return first.promise;
  }, (value) => committed.push(value), (error) => assert.fail(String(error)), (value) => persisted.push(value));
  const flushing = queue.flush();
  await Promise.resolve();
  assert.deepEqual(started, [1]);

  queue.enqueue("list|corn", () => {
    started.push(2);
    secondStarted.resolve();
    return second.promise;
  }, (value) => committed.push(value), (error) => assert.fail(String(error)), (value) => persisted.push(value));
  const latestFlush = queue.flush();
  await Promise.resolve();
  assert.deepEqual(started, [1], "the newer write must wait for the in-flight write");

  first.resolve(310);
  await first.promise;
  await secondStarted.promise;
  assert.deepEqual(started, [1, 2]);
  assert.deepEqual(committed, [], "an older response must not update the UI");
  assert.deepEqual(persisted, [310], "the value actually stored by an older request must still be reconciled");

  second.resolve(325);
  await Promise.all([flushing, latestFlush]);
  assert.deepEqual(committed, [325]);
  assert.deepEqual(persisted, [310, 325]);
});

test("an invalid draft remains distinct while an in-flight write is reconciled", async () => {
  const queue = new SerializedEditQueue<number>(60_000);
  const request = deferred<number>();
  const committed: number[] = [];
  const persisted: number[] = [];
  queue.enqueue("list|corn", () => request.promise, (value) => committed.push(value), (error) => assert.fail(String(error)), (value) => persisted.push(value));
  const flushing = queue.flush();
  await Promise.resolve();

  queue.invalidate("list|corn");
  request.resolve(320);
  await flushing;

  assert.deepEqual(committed, [], "the invalid newer draft must not be replaced by the old response");
  assert.deepEqual(persisted, [320], "the successful database write must update the last stored value");
  assert.deepEqual(priceEditState({ text: "-5", status: "invalid" }, persisted[0]), {
    label: "Invalid price · $320/t saved",
    color: "#a63d2a",
    dot: true,
  });
  assert.deepEqual(priceEditState({ text: "340", status: "pending" }, persisted[0]), {
    label: "Saving… · $320/t saved",
    color: "#8a5f18",
    dot: true,
  });
});
