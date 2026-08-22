# packages/config — shared build config

> Filled in **S00**. Base configs extended by every workspace so tooling stays
> consistent across `apps/*` and `packages/*`.

Contains: `tsconfig.base.json` (strict TS), a shared ESLint config, and a shared
Prettier config. Each app/package extends these rather than redefining rules.
