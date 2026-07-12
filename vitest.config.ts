import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test files run in parallel. This is safe because every test file that
    // touches the filesystem owns a unique directory (test-output/<slug> or
    // an os.tmpdir() mkdtemp) and only ever deletes its own directory. When
    // adding a new command test, follow that convention - never write to or
    // remove the shared test-output root.
    coverage: {
      provider: 'v8',
      include: ['src/**'],
    },
  },
});
