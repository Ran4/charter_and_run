// Hooks that world builders publish for game code, e.g. worldHooks.bodegaLit = (on) => {...}, set
// by the Hotel Flamenco builder and called by the `bodega` unlock (an unlock's `hook` is a name or a
// list: `bodega` also calls worldHooks.bungalowSold, the bungalow builder's band). Missing hooks are
// skipped.

export const worldHooks = {};
