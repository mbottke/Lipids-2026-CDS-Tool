/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  // A hover style never sticks after a tap on a touch screen.
  future: { hoverOnlyWhenSupported: true },
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        body: 'var(--body)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        line: 'var(--line)',
        edge: 'var(--edge)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        knob: 'var(--knob)',
        'track-off': 'var(--track-off)',
      },
      fontFamily: {
        sans: ['"DM Sans"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
