import { Runner, RunnerOptions } from './Runner';

export async function main<T = void>(cwd: string, options?: RunnerOptions): Promise<T> {
  const runner = new Runner(cwd, options);
  try {
    await runner.init();
  } catch (e) {
    e.message = `[tegg/standalone] bootstrap tegg failed: ${e.message}`;
    throw e;
  }
  try {
    return await runner.run<T>();
  } finally {
    runner.destroy().catch(e => {
      e.message = `[tegg/standalone] destroy tegg failed: ${e.message}`;
      console.warn(e);
    });
  }
}
