/**
 * Master switch for the "breathing" (alive-mode) visual layer.
 * 'on'  → <html data-breathe="on"> and the CSS layer in globals.css applies.
 * 'off' → attribute renders "off", every breathe-* class matches no rule,
 *         and the site behaves EXACTLY as before this feature. This is the
 *         one-line rollback required by the spec
 *         (docs/superpowers/specs/2026-07-09-breathing-ux-design.md).
 */
export const BREATHE: 'on' | 'off' = 'on';
