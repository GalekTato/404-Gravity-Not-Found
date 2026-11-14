export type IconName = 'home' | 'globe' | 'layers' | 'book' | 'arrow' | 'plus' | 'minus' | 'target' | 'menu' | 'close' | 'satellite' | 'chevron'
const paths: Record<IconName, string> = {
  home: 'm3 10 9-7 9 7v10h-6v-7H9v7H3Z',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z',
  layers: 'm3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4',
  book: 'M12 5v16M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 2-3-3-6-3-9-2Z',
  arrow: 'M4 12h15m-6-6 6 6-6 6', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
  target: 'M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM12 2v5m0 10v5M2 12h5m10 0h5',
  menu: 'M4 6h16M4 12h16M4 18h16', close: 'm6 6 12 12M6 18 18 6',
  satellite: 'm8 8 8 8m-9-5 6-6 4 4-6 6ZM3 5l2-2 4 4-2 2Zm12 12 2-2 4 4-2 2ZM4 14a6 6 0 0 0 6 6m-6-2h2',
  chevron: 'm9 5 7 7-7 7',
}
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
