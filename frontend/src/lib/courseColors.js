// ── Course accent-color palette ──────────────────────────────────────────────
// Every class string must appear as a complete literal so Tailwind's build
// scanner includes them even when they are only referenced via a lookup object.

export const COURSE_COLORS = [
  {
    hex:         '#6366f1',
    text:        'text-indigo-500',
    hoverBorder: 'hover:border-indigo-400/70',
    hoverText:   'group-hover:text-indigo-500',
    dot:         'bg-indigo-500',
  },
  {
    hex:         '#f43f5e',
    text:        'text-rose-500',
    hoverBorder: 'hover:border-rose-400/70',
    hoverText:   'group-hover:text-rose-500',
    dot:         'bg-rose-500',
  },
  {
    hex:         '#f59e0b',
    text:        'text-amber-500',
    hoverBorder: 'hover:border-amber-400/70',
    hoverText:   'group-hover:text-amber-500',
    dot:         'bg-amber-500',
  },
  {
    hex:         '#0ea5e9',
    text:        'text-sky-500',
    hoverBorder: 'hover:border-sky-400/70',
    hoverText:   'group-hover:text-sky-500',
    dot:         'bg-sky-500',
  },
  {
    hex:         '#a855f7',
    text:        'text-purple-500',
    hoverBorder: 'hover:border-purple-400/70',
    hoverText:   'group-hover:text-purple-500',
    dot:         'bg-purple-500',
  },
  {
    hex:         '#f97316',
    text:        'text-orange-500',
    hoverBorder: 'hover:border-orange-400/70',
    hoverText:   'group-hover:text-orange-500',
    dot:         'bg-orange-500',
  },
  {
    hex:         '#14b8a6',
    text:        'text-teal-500',
    hoverBorder: 'hover:border-teal-400/70',
    hoverText:   'group-hover:text-teal-500',
    dot:         'bg-teal-500',
  },
  {
    hex:         '#ec4899',
    text:        'text-pink-500',
    hoverBorder: 'hover:border-pink-400/70',
    hoverText:   'group-hover:text-pink-500',
    dot:         'bg-pink-500',
  },
];

/** Deterministically picks a color from the palette based on the course UUID. */
export function getCourseColor(courseId) {
  let hash = 0;
  for (const ch of String(courseId)) {
    hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  }
  return COURSE_COLORS[hash % COURSE_COLORS.length];
}
