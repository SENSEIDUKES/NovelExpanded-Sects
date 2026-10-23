# Direct dependency provenance

Inventory checked on 2026-10-23 after the frozen Bun install. Resolved versions are
recorded in `bun.lock`; the table below is a direct-package inventory. Dependency
licenses apply to those packages, not to SEIHouse-authored code. A release process
should include transitive dependency notices and any required attribution.

| Dependency | Installed version | Declared license | Role |
| --- | --- | --- | --- |
| `@tailwindcss/vite` | 4.3.3 | MIT | App/render/build |
| `@vitejs/plugin-react` | 6.1.2 | MIT | App/render/build |
| `lucide-react` | 0.546.0 | ISC | App/render/build |
| `motion` | 12.43.0 | MIT | App/render/build |
| `react` | 19.3.1 | MIT | App/render/build |
| `react-dom` | 19.3.1 | MIT | App/render/build |
| `three` | 0.186.1 | MIT | App/render/build |
| `vite` | 8.3.5 | MIT | App/render/build |
| `@types/node` | 22.20.5 | MIT | Development |
| `@types/react` | 19.3.0 | MIT | Development |
| `@types/react-dom` | 19.3.0 | MIT | Development |
| `@types/three` | 0.186.0 | MIT | Development |
| `autoprefixer` | 10.6.1 | MIT | Development |
| `tailwindcss` | 4.3.3 | MIT | Development |
| `tsx` | 4.23.15 | MIT | Development |
| `typescript` | 7.0.2 | Apache-2.0 | Development |

The unused scaffold AI SDK and Express/dotenv server dependencies were removed;
the source currently runs as a Vite browser app. The unused direct esbuild pin was
also removed so Vite/tsx can resolve their own compatible build tooling. Bun 1.3.11
and the regenerated frozen lock are the reproducible install path used by CI.

Procedural geometry lives under `src/three/objects`; its provenance follows the
repository history. Existing images under `public/assets/aistudio` still need an
explicit source/rights record before an engine/content distribution. This change
does not assign ownership of those files or add a source license.
