import assert from "node:assert/strict";
import { test } from "node:test";

import { SerializedEditQueue } from "./use-my-lists";

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

  queue.enqueue("list|corn", () => {
    started.push(1);
    return first.promise;
  }, (value) => committed.push(value), (error) => assert.fail(String(error)));
  const flushing = queue.flush();
  await Promise.resolve();
  assert.deepEqual(started, [1]);

  queue.enqueue("list|corn", () => {
    started.push(2);
    secondStarted.resolve();
    return second.promise;
  }, (value) => committed.push(value), (error) => assert.fail(String(error)));
  const latestFlush = queue.flush();
  await Promise.resolve();
  assert.deepEqual(started, [1], "the newer write must wait for the in-flight write");

  first.resolve(310);
  await first.promise;
  await secondStarted.promise;
  assert.deepEqual(started, [1, 2]);
  assert.deepEqual(committed, [], "an older response must not update the UI");

  second.resolve(325);
  await Promise.all([flushing, latestFlush]);
  assert.deepEqual(committed, [325]);
});
