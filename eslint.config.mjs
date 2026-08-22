import base from '@dayflow/config/eslint';

/**
 * Root ESLint flat config. Runs across the whole monorepo via `npm run lint`.
 * Shared rules live in `packages/config/eslint.base.mjs`.
 */
export default [...base];
