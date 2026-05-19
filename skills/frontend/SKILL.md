---
name: frontend
description: Frontend conventions for the AI Skills Portal — folder layout, theming, design tokens, form patterns, routing, and API access. Use this skill any time you're adding a page, component, or styling decision in `frontend/`.
---

# Frontend conventions

## Folder layout

```
frontend/src/
├── main.jsx              Root render — wires ThemeProvider + Router + AuthProvider
├── App.jsx               Route table
├── index.css             Tailwind base + small set of @layer components
├── lib/
│   └── api.js            fetch wrapper — single point that adds the JWT
├── context/
│   ├── ThemeContext.jsx  Light/dark, persisted to localStorage
│   └── AuthContext.jsx   User, token, register/login/logout/updateProfile
├── components/
│   ├── Layout.jsx        Header, nav, footer, container
│   ├── ThemeToggle.jsx   Sun/moon button
│   ├── ProtectedRoute.jsx
│   └── FormField.jsx     Label + input/select + hint/error
└── pages/
    ├── Register.jsx
    ├── Login.jsx
    ├── Profile.jsx
    └── Dashboard.jsx
```

Rule of thumb:
- **Reusable visual primitive** → `components/`
- **Route-level screen** → `pages/`
- **Cross-cutting state** → `context/`
- **Side-effecty helpers** (fetch, formatting, parsing) → `lib/`

## Theming

- Tailwind `darkMode: 'class'` — toggling adds/removes `dark` on `<html>`.
- Initial theme set by inline script in `index.html` **before** React mounts, to avoid a flash of light mode.
- Choice persisted in `localStorage` (`theme` key).
- New components must support both modes. Use the existing component classes (`.card`, `.field`, `.btn-primary`, etc.) wherever possible.

## Design tokens

Defined in `tailwind.config.js`:
- `colors.brand.50–900` — the primary palette. Use `brand-600` for primary actions, `brand-50`/`brand-900` for subtle accents.
- `fontFamily.sans` — Inter, loaded from Google Fonts in `index.html`.
- `shadow.soft` — the only custom shadow.

Slate is the neutral. Use `slate-50/100/200/.../900/950` paired with `dark:slate-*` counterparts.

## Component classes (in `index.css`)

| Class | Use |
|---|---|
| `.card` | Default container |
| `.label`, `.field`, `.field-error` | Form primitives |
| `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-outline` | Buttons |

Reach for these before writing new Tailwind chains. Add new component classes here only when a pattern repeats 3+ times.

## Forms

- Use `<FormField>` for label + input + error + hint — gives consistent spacing and dark-mode support out of the box.
- Validate on submit; clear a field's error when the user edits it.
- Server-side errors come back as `error.fields` from `lib/api.js` — splat them into local `errors` state.

## Routing

- All routes registered in `App.jsx`.
- Public: `/login`, `/register`.
- Protected (wrap with `<ProtectedRoute>`): `/dashboard`, `/profile`.
- `<HomeRedirect>` at `/` routes signed-in users to `/dashboard`, others to `/login`.

## API access

Only via `lib/api.js`. Don't call `fetch` directly from a component.

```js
import { api } from '../lib/api.js';

const data = await api.get('/api/users/me');
await api.patch('/api/users/me', { first_name: 'Ravi' });
```

Errors thrown by the wrapper have `.status` and `.fields` for field-level messages.

## Accessibility minimums

- Every interactive element has visible focus (`focus-visible:ring-*` is set on `.btn`).
- Inputs have associated `<label>` (handled by `FormField`).
- Theme toggle has `aria-label`.
- Color contrast pairs already account for dark mode — re-test if you introduce new colour tokens.

## Don'ts

- Don't introduce TypeScript piecemeal — either a full sprint conversion or stay JS.
- Don't pull in a component library yet. Cost > benefit for Sprint 1–3.
- Don't put business logic in components — extract to `lib/` or `context/`.
- Don't bypass the theme system with hardcoded `bg-white` without a `dark:` pair.
- Don't call `localStorage` for anything other than the theme + token keys without a reason.
