// A tiny bounded-concurrency task runner used to stay polite to Universalis
// (SPEC §3: limit in-flight requests, small delay between them).

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run `tasks` with at most `concurrency` in flight, waiting `delayMs` between successive
 * task *starts*. Resolves with results in the original task order. `onProgress` fires as
 * each task settles. Rejects if any task throws (after in-flight tasks settle).
 */
export async function runPool<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
  delayMs: number,
  onProgress?: (done: number, total: number) => void,
): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= tasks.length) return;
      if (delayMs > 0 && i > 0) await sleep(delayMs);
      results[i] = await tasks[i]();
      onProgress?.(++done, tasks.length);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}
