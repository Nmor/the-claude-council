---
name: vue3-patterns
description: Vue 3 idioms — Composition API, `<script setup>`, composables, Pinia stores, reactivity gotchas, performance, and Volar / vue-tsc strictness. Auto-fires for `*.vue` and Vue-specific TypeScript files alongside `frontend-patterns` to add Vue depth the generic skill doesn't cover.
---

# Vue 3 Patterns

> **Reuse-first** (per `~/.claude/rules-library/common/reuse-first.md`):
> Before creating any new component, composable, store, or
> utility, sweep `components/`, `components/ui/`, `composables/`,
> `stores/`, `lib/`, `utils/`. One source of truth per primitive
> (one `<BaseButton>`, one `<DescriptionEditor>`, one
> `useApi()`, one `useToast()`). Extend with a prop or option —
> never fork. Compositional helpers (renderless components,
> `provide` / `inject`, slot-based APIs) are the canonical
> mechanism for extending shared primitives in Vue.

Vue 3 patterns that go beyond the generic `frontend-patterns` skill. Use
when the question is "how should this Vue component / composable / store be
shaped" — reactivity correctness, composable design, Pinia layout, and the
performance footguns specific to Vue's reactivity system.

## When to Activate

- Authoring or refactoring `.vue` files
- Designing a composable (`useFoo`)
- Adding or restructuring a Pinia store
- Reviewing a Vue PR for reactivity / performance bugs
- Tuning `vue-tsc` strictness or Volar config

## Default to `<script setup lang="ts">` + Composition API

Options API (`data() {}`, `methods: {}`) is fine for tiny demos and
discouraged for production code. Composition API + `<script setup>` is the
default because it composes naturally, plays well with TypeScript, and
eliminates `this`-binding bugs.

```vue
<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{ userId: string }>();
const emit = defineEmits<{ saved: [userId: string] }>();

const draft = ref("");
const isValid = computed(() => draft.value.length > 0);

function save() {
  if (!isValid.value) return;
  emit("saved", props.userId);
}
</script>
```

Type-only `defineProps` / `defineEmits` give you better inference and
auto-complete than the runtime-array form.

## ref vs reactive: Default To `ref`

| API | Use when | Watch out for |
| --- | -------- | ------------- |
| `ref<T>` | Default for all reactive state | Always `.value` outside templates |
| `reactive<T>` | A bag of related fields you want to mutate by property | Destructuring breaks reactivity (`const { foo } = state`) |
| `shallowRef<T>` | Large objects you replace wholesale (D3 datasets, mxGraph models) | Inner mutations not tracked — replace the ref, don't mutate |
| `readonly<T>` | Public surface of a composable that owns the state | — |

Default to `ref`. Only reach for `reactive` when you've felt the pain of
`.value` more than the pain of "wait, why isn't this updating after I
destructured it."

## Composables: One File, Returns A Plain Object

A composable is a function starting with `use`, returning a plain object
of refs / computed / functions. Conventions:

```ts
// composables/useTask.ts
export function useTask(taskId: Ref<string>) {
  const task = ref<Task | null>(null);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    task.value = await api.getTask(taskId.value);
    loading.value = false;
  }

  // Re-load when the input ref changes
  watch(taskId, load, { immediate: true });

  return { task: readonly(task), loading: readonly(loading), reload: load };
}
```

Rules:

- The composable owns its state — return `readonly` refs so callers can't
  mutate them by accident.
- Take refs as inputs, not raw values, when the input may change.
- Don't call composables conditionally — they must run unconditionally
  during component setup so cleanup hooks register.
- One file per composable. Easier to find, easier to test.

## Pinia Stores: `defineStore` With Setup Syntax

Use the setup-function form for parity with `<script setup>` ergonomics:

```ts
export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const isAdmin = computed(() => user.value?.role === "admin");

  async function login(email: string, password: string) { /* ... */ }
  function logout() { user.value = null; }

  return { user, isAdmin, login, logout };
});
```

Rules:

- One store per domain (`useAuthStore`, `useTasksStore`). Don't make a
  monolithic `useAppStore` — it becomes the new Vuex root.
- TTL-cache reads inside the store (`if (Date.now() - lastFetch < 60_000) return;`).
  Components don't have to remember to debounce.
- Stores are global. Don't put per-route state there — use a composable
  scoped to the component that owns the route.
- Don't import a store inside another store's top-level — call it inside
  the action that needs it. Top-level imports create circular initialization.

## Reactivity Gotchas

These bite once and you remember forever. Better to read them now.

| Gotcha | Why | Fix |
| ------ | --- | --- |
| `const { foo } = reactive(state)` loses reactivity | `foo` is a plain value at the moment of destructure | Use `toRefs(state)` or keep `state.foo` access |
| Mutating an array prop directly | Props are readonly | Emit an event; let parent mutate |
| `ref` of a `Map` / `Set` doesn't trigger updates | Vue 3 has special handling for Map/Set; pre-3.0.11 it didn't | Replace the whole map: `m.value = new Map(m.value).set(k, v)` |
| `computed` with side effects | `computed` should be pure; effects belong in `watchEffect` | Move side effects to `watchEffect` or `watch` |
| `watch(source, cb)` not firing | Source isn't reactive (raw value) or watcher set up before mount | Pass a getter `() => source.value`, ensure watcher in `setup` |
| `v-for` over a `Map` doesn't update | Same as above; Vue tracks reference identity for collections | Use `Array.from(map.value)` or replace whole map |
| `unref(x)` on a non-ref returns `x` | Useful for "ref or value" inputs | `function setName(name: MaybeRef<string>) { const v = unref(name); ... }` |

## Performance: Where Vue Bleeds

Vue's reactivity is fast, but four patterns dominate slow apps:

1. **Big lists without virtualization** — 1000+ rows render every cell.
   Use `RecycleScroller` (`vue-virtual-scroller`) or `vue-virtual-list`
   for any list that can grow past 200 items.

2. **Computed dependency cycles** — a `computed` that reads another
   `computed` that reads the first. Vue detects and warns; fix the design.

3. **Deep watchers on big objects** — `watch(state, ..., { deep: true })`
   walks every property on every change. Replace with a watcher on a
   specific path, or restructure state into smaller refs.

4. **Component re-renders on parent state change** — Vue 3 is much better
   than Vue 2 here, but a `<HeavyComponent v-bind="$props" />` still
   re-renders on every parent change. Use `defineProps` precisely and
   memoize children with `v-memo` for expensive trees.

## `v-memo` For Expensive Trees

`v-memo` skips re-render when the dependency array hasn't changed.
Use sparingly — it's a manual optimization, easy to misuse:

```vue
<div v-for="item in items" :key="item.id" v-memo="[item.id, item.updatedAt]">
  <!-- expensive -->
</div>
```

Only the listed deps trigger re-render. Forget to include one and you
get stale UI.

## Volar / vue-tsc Strictness

Pin Volar to the workspace TypeScript SDK so editor diagnostics match CI.
In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "moduleResolution": "Bundler",
    "skipLibCheck": true
  },
  "vueCompilerOptions": {
    "strictTemplates": true
  }
}
```

`strictTemplates` makes typos in template bindings (`{{ user.namee }}`) a
compile error. Worth the upfront pain.

CI runs `vue-tsc --noEmit` — same check the IDE shows. Drift between the
two means you're shipping bugs that look fine locally.

## Slots: Type Them

```vue
<script setup lang="ts">
defineSlots<{
  default(props: { task: Task }): unknown;
  empty(): unknown;
}>();
</script>

<template>
  <slot v-if="tasks.length" name="default" :task="tasks[0]" />
  <slot v-else name="empty" />
</template>
```

`defineSlots` gives consumers compile-time type-safety on slot props and
on which slots exist. Without it, slot misuse fails at runtime.

## Async Components For Routes

```ts
const RoadmapView = defineAsyncComponent(() => import("@/views/RoadmapView.vue"));
```

Or in the router:

```ts
{ path: "/roadmap", component: () => import("@/views/RoadmapView.vue") }
```

Keeps the initial bundle small. Combined with Vite's `manualChunks` for
heavy libs (mxGraph, Chart.js), the first paint stays fast even as the
app grows.

## Common Smells

| Smell | Fix |
| ----- | --- |
| `data() { return { ... } }` in a new file | Use `<script setup>` + `ref` |
| `this.$emit` (Options API) in 2024+ codebase | `defineEmits` typed events |
| `ref(somePropValue)` then never updating | Use a `computed`, or `watch` the prop |
| `reactive({ list: [], filters: {} })` then `const { list } = state` | Either `toRefs(state)` or use `ref` per field |
| Pinia `state: () => ({ ... })` + `actions: { ... }` (options form) | Setup form: closure over refs and functions |
| `v-for` without `:key` (or `:key="index"`) | Use a stable id: `:key="item.id"` |
| `:style="{...}"` rebuilt every render with the same object | `computed(() => ({ ... }))` |
| Watching deep state to derive a value | Replace with `computed` |

## Skill Chain

1. **frontend-patterns** — generic component / state / hook patterns
2. **vue3-patterns** — this skill (Vue-specific depth)
3. **frontend-design** — typography, color, motion, aesthetics
4. **typescript-patterns** — narrowing, branded types, exhaustiveness

## Purpose

Principal-level Vue 3 engineering: Composition API + `<script
setup>` as the canonical default, composables (the `useX()`
pattern) for reusable logic, Pinia for global state, reactivity
discipline (no destructuring `reactive()` — that loses
reactivity), `ref` vs `reactive` semantics, computed vs watchers,
provide / inject scoping, async setup + `<Suspense>`, Teleport
for portals, dynamic + async components for code-splitting,
defineModel for v-model, TypeScript + Volar for type safety, and
the SSR + hydration discipline (Nuxt 3 / Vite SSR).

**Negative scope** (NOT what this skill covers):
- Generic frontend patterns — see `frontend-patterns`
- Visual design quality (typography, colour, motion) — see
  `frontend-patterns` design section
- TypeScript depth — see `typescript-patterns`
- Vue 2 / Options API patterns — out (Vue 2 EOL 2024-Dec-31)
- React / Svelte / Angular — different frameworks

## When NOT to use

- Pure server-rendered HTML pages with no interactivity (use
  templates + a sprinkle of vanilla JS)
- Single-file widget embedded in another app's DOM (Vue's runtime
  cost is large relative to vanilla / Preact for tiny widgets)
- Existing Vue 2 codebase mid-migration (Composition API can be
  introduced gradually; full Vue 3 patterns require the runtime)

## Standards Cited

- **Vue 3 Documentation** (vuejs.org) — canonical reference
- **Vue Style Guide — Priority A/B/C/D** (vuejs.org/style-guide)
- **Pinia Documentation** (pinia.vuejs.org) — official state mgmt
- **Vue Router 4 Documentation** — routing
- **Nuxt 3 Documentation** (nuxt.com) — SSR + meta-framework
- **Volar / vue-tsc** — type checking
- **WHATWG HTML Living Standard** — base
- **WAI-ARIA 1.2** — accessibility primitives for custom components
- **WCAG 2.2** — accessibility floor (via `a11y.md`)
- **OWASP ASVS 4.0.3 §5.3 (Output Encoding + Injection Prevention)** —
  XSS guards (Vue's auto-escaping + sanitisation)
- **OWASP ASVS 4.0.3 §14.4 (HTTP Security Headers)** — CSP +
  framework integration

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Options API in new code | Inconsistent with team standard; harder to reuse logic | `<script setup>` + Composition API |
| Destructuring `reactive()` | Loses reactivity (silent bug) | Use `toRefs(state)` OR keep state as `reactive` and access via `state.x` |
| Mutating props directly | Vue dev mode warns; breaks one-way data flow | `emit('update:modelValue', x)` or `defineModel()` |
| `v-html` with user input | XSS vector | Render text content; or sanitise via DOMPurify before `v-html` |
| Inline event handler with complex logic | Untestable; coupling | Extract to method / composable |
| Watching reactive object without `deep: true` | Misses nested changes | Use `watch(source, fn, { deep: true })` OR `watchEffect` |
| `ref().value` reassign in template | Templates auto-unwrap; manual `.value` breaks reactivity | Use the ref directly in templates |
| Global state in module-level `ref()` | Singleton across tests / SSR (memory leak across requests) | Pinia store (per-app instance) |
| `setup()` with async work + no `<Suspense>` | Component hangs without fallback | Wrap in `<Suspense>` with `#fallback` |
| Component name collision with HTML | Some browsers ignore custom elements without `-` | Multi-word PascalCase / kebab-case |
| Provide / inject without `Symbol` keys | Name collision in larger apps | Typed `InjectionKey<T>` |
| List rendering with index as `:key` | Animation glitches on reorder | Stable id from data |
| Composable side effects in setup() not cleaned up | Leaks across HMR / hot reload | Use `onScopeDispose` / `onBeforeUnmount` |

## Verification Checklist

- [ ] Composition API + `<script setup>` used in all new files
- [ ] Volar + `vue-tsc --noEmit` returns zero errors
- [ ] No `reactive()` destructured without `toRefs()`
- [ ] No `v-html` with user-controlled input
- [ ] Composables extracted on second occurrence (rule of three)
- [ ] Global state via Pinia (per-app instance), never module-level
      `ref()`
- [ ] Lists keyed by stable id from data (S6479)
- [ ] Async setup wrapped in `<Suspense>` with fallback
- [ ] Provide / inject use typed `InjectionKey<T>` symbols
- [ ] Watchers use appropriate `deep` / `immediate` flags
- [ ] `defineModel()` (3.4+) for two-way binding
- [ ] Accessibility audited per `a11y.md` (ARIA, keyboard nav,
      focus management)
- [ ] No raw colour literals; design tokens via CSS vars
- [ ] SSR-safe (no `window` access outside `onMounted`)
- [ ] Bundle size budgeted (Vite chunk analysis)

## Cross-References

- `~/.claude/skills/frontend-patterns/SKILL.md` — generic patterns
- `~/.claude/skills/typescript-patterns/SKILL.md` — TS depth
- `~/.claude/skills/coding-standards/SKILL.md` — universal baseline
- `~/.claude/rules-library/common/a11y.md` — accessibility floor
- `~/.claude/rules-library/common/no-discards.md` — Vue-specific S6299
  (no-bypass-sanitization) ban
- `~/.claude/rules-library/common/extreme-lint-policy.md` — eslint-plugin-vue
  + sonarjs strict
- `~/.claude/agents/code-reviewer.md` — Council Division 3
- `~/.claude/agents/ux-reviewer.md` — Council Division 7
- Vue 3 Style Guide (vuejs.org/style-guide)

## Why this skill exists

Vue 3's Composition API + `<script setup>` are the canonical
baseline for new Vue work — but the framework's flexibility means
teams ship Vue 2 idioms, reactive() destructuring bugs, `v-html`
XSS, and Pinia-vs-module-level-state confusion. The patterns above
codify the production-ready posture: Composition API, typed
composables, reactivity discipline, Pinia for global state,
SSR-safety, ARIA-correct components, design-token-based styling.
Teams that adopt these maintain Vue's velocity advantage; teams
that don't accumulate the silent-bug debt the reactivity system
hides behind interactive UIs.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- Options API used in new code where Composition API + `<script setup>` is the canonical baseline
- `ref` / `reactive` misuse (e.g., destructuring reactive object loses reactivity — silent bug)
- `watchEffect` used where `watch` with explicit deps would be clearer
- Composable function not prefixed with `use` (Vue convention drift)
- Pinia store accessed inside `setup` without `storeToRefs` for destructuring (reactivity loss)
- Template directives misused (`v-if` + `v-for` on same element, deprecated `v-html` without sanitization)
- `provide` / `inject` used as a global state shortcut instead of Pinia
- Component prop typed as `any` / `Object` instead of typed interface
- `defineExpose` used to leak internals instead of defining a proper public API
- Reactivity gotcha: mutating a `readonly` prop / mutating arrays / Maps without `.value`

**Refinement candidates**:
- New idiom row when Vue ships a new release (e.g., Vapor mode, new macros)
- Tightening of the `<script setup>` enforcement when Options API recurs in new code
- New cross-reference when a sister skill (frontend-patterns, typescript-patterns, accessible-forms) adds a Vue-relevant gate
- New composable template when a recurring shared pattern emerges (e.g., `useDebounce`, `usePagination`)
