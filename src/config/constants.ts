/**
 * Shared Tailwind class strings, mirroring the owner's dashboard conventions.
 * Keep every value a static literal so Tailwind's scanner can see the classes.
 */
export const A11Y = {
  FOCUS_RING: 'focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
  MOTION_SAFE: 'motion-reduce:transition-none',
} as const

export const TRANSITION = {
  COLORS: 'transition-colors duration-200',
  COLORS_SLOW: 'transition-colors duration-300',
} as const

export const ROUNDED = {
  MD: 'rounded-lg',
  LG: 'rounded-xl',
  FULL: 'rounded-full',
} as const

export const ICON_SIZE = {
  SM: 18,
  MD: 20,
  LG: 24,
} as const

export const CONTAINER = {
  MAX_W: 'max-w-7xl mx-auto',
} as const

/** Form controls — the dashboard's INPUT_CLASS / LABEL_CLASS pattern. */
export const FORM = {
  INPUT:
    'w-full rounded-lg border border-border bg-page-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/70 read-only:text-text-secondary disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
  HINDI_INPUT: 'font-hindi text-base',
  LABEL: 'text-xs font-medium text-text-secondary',
  HINT: 'text-xs text-text-secondary',
} as const

export const EDITOR = {
  /**
   * Invariant: the sheet must stay laid out (never `hidden`/display:none)
   * while the Form tab is active on phones — exporters capture it and
   * useFitText measures it — so the pane is parked off-screen instead.
   * styles/print.css overrides this when printing.
   */
  PREVIEW_PARKED:
    'max-lg:fixed max-lg:top-0 max-lg:-left-[300vw] max-lg:w-screen max-lg:h-auto max-lg:overflow-visible max-lg:pointer-events-none',
  PANES: 'editor-panes grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(340px,460px)_1fr]',
} as const
