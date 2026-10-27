export function KeyboardHint({ keyName }: { keyName: 'space' | 'up' | 'left' | 'down' | 'right' }) {
  const arrowPaths = {
    up: 'M16 18V8m-4 4 4-4 4 4',
    left: 'M21 13H11m4-4-4 4 4 4',
    down: 'M16 8v10m-4-4 4 4 4-4',
    right: 'M11 13h10m-4-4 4 4-4 4',
  }

  return <kbd aria-hidden="true" className="session-key-hint" data-key={keyName}>
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox={keyName === 'space' ? '0 0 80 24' : '0 0 32 32'}>
      {keyName === 'space' ? <><rect height="14" rx="3" width="68" x="6" y="2" /><path d="m7 3-5 4v13h76V7l-5-4M6 16l-4 4m72-4 4 4M20 8v3h40V8" /></> : <><rect height="21" rx="3" width="20" x="6" y="2" /><path d="m7 3-5 5v22h28V8l-5-5M6 23l-4 7m24-7 4 7" /><path d={arrowPaths[keyName]} /></>}
    </svg>
  </kbd>
}
