import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The command tests shell out to the real CLI with shared test-output/
    // directories as their working directory. Running test files in parallel
    // lets one file delete another's cwd mid-run (ENOENT: uv_cwd failures).
    // Run files serially until the tests use isolated per-file temp dirs.
    fileParallelism: false,
  },
});
