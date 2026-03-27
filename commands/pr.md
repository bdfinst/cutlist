# Pre-PR Quality Gate

Run all quality checks and create a pull request.

## Steps

1. **Type check**: `npm run check`
2. **Unit tests**: `npm test`
3. **Build**: `npm run build`
4. If all pass, create PR with structured summary using `gh pr create`.
5. If any fail, report failures and stop.
