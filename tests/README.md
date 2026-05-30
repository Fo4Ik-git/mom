# Tests

Automated tests for the calculator platform: formulas, script DSL, builder logic, admin helpers, access control, API security, and end-to-end builder workflows.

```bash
npm test              # all tests
npm run test:watch    # watch mode
```

## By area

| Command | Folder | Coverage |
|---------|--------|----------|
| `npm run test:formula` | `formula/` | Parse, eval, registry, blocks, completions |
| `npm run test:script` | `script/` | Monolith/project round-trip, `#include`, merge |
| `npm run test:builder` | `calculator/`, `builder/` | Config sync, patterns, fields, workflows |
| `npm run test:admin` | `admin/` | Users list, issues, API error handling |
| `npm run test:access` | `access/` | Keys, dates, expiry, user limits |
| `npm run test:api` | `api/` | Security headers, cron auth, route handlers |

## Layout

```
tests/
├── admin/           Admin panel helpers
├── access/          Access keys, expiry, bans, quotas
├── api/             API security + route handler tests (mocked)
├── auth/            Password hashing, signup URLs
├── builder/         End-to-end builder workflows
├── calculator/      Config sync, patterns, fields (constructor logic)
├── docs/            Documentation collector + i18n
├── formula/         Formula language + block editor tree
├── platform/        Slug, validation messages
├── script/          Calculator script DSL
└── helpers/         Shared fixtures (not test files)
```

## Notes

- **UI components** (`app/components/**`) are covered indirectly via `lib/` unit tests — the builder and admin UIs delegate to these modules.
- **API route tests** mock auth/DB layers; run integration tests against a real DB separately if needed.
- New formula primitives and script entities are picked up automatically when registered — see `formula/code-roundtrip.test.ts` and `docs/`.
