@AGENTS.md

## Compilation

Always run `npm run typecheck` before signaling completion. The project must compile without errors.

## Storybook

- Components go in `src/components/<name>/<Name>.tsx`
- Stories go in `src/components/<name>/<Name>.stories.tsx`
- Use theme tokens from `src/constants/theme.ts` (colors, spacing, typography)
- RN style arrays: use `condition ? style : undefined` instead of `&&` to avoid TS `false` type issues
