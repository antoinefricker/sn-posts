# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Authentication (Supabase)

Users sign up with **name, club ID, email and password** and sign in with email and password. Auth is handled by Supabase Auth; name and club ID are stored in `public.profiles` (created by a database trigger at sign-up, readable and editable only by its owner via row-level security). Email confirmation is off.

Schema lives in [`supabase/migrations`](supabase/migrations). To run it locally (requires Docker):

```bash
npx supabase start     # starts the local stack and applies migrations
npx supabase status    # shows the API URL and publishable key
cp .env.example .env.local   # then fill in VITE_SUPABASE_ANON_KEY
npm run dev
```

`npx supabase db reset` rebuilds the local database from the migrations; `npx supabase stop` shuts the stack down.

