# package.json changes

Do not replace the whole existing `package.json` just for this pack.

Install the test runner with pnpm:

```bash
pnpm add -D vitest
```

Then add these scripts to the existing `scripts` object:

```json
"test": "vitest run",
"test:watch": "vitest"
```

The final scripts section should contain the existing `dev`, `build`, and `start`
commands plus the two test commands above.

Running `pnpm add -D vitest` will also update `pnpm-lock.yaml`; commit that lockfile
change together with the test setup.
