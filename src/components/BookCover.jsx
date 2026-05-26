const DEWEY_STYLES = {
  0: 'bg-slate-100 text-slate-600 border-slate-300',
  1: 'bg-purple-100 text-purple-600 border-purple-300',
  2: 'bg-amber-100 text-amber-600 border-amber-300',
  3: 'bg-blue-100 text-blue-600 border-blue-300',
  4: 'bg-teal-100 text-teal-600 border-teal-300',
  5: 'bg-emerald-100 text-emerald-600 border-emerald-300',
  6: 'bg-orange-100 text-orange-600 border-orange-300',
  7: 'bg-pink-100 text-pink-600 border-pink-300',
  8: 'bg-indigo-100 text-indigo-600 border-indigo-300',
  9: 'bg-red-100 text-red-600 border-red-300',
}

function hashValue(value) {
  return String(value || '')
    .split('')
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) >>> 0, 2166136261)
}

function deweyGroup(deweyCode) {
  const match = String(deweyCode || '').match(/\d/)
  return match ? Number(match[0]) : null
}

function BookIcon({ variant }) {
  const fold = 18 + (variant % 8)
  const lineA = 42 + (variant % 12)
  const lineB = 86 - (variant % 10)

  return (
    <svg viewBox="0 0 120 120" className="h-16 w-16" fill="none" aria-hidden="true">
      <path d={`M31 ${fold}h38c9 0 16 7 16 16v58H47c-9 0-16-7-16-16V${fold}Z`} stroke="currentColor" strokeWidth="7" strokeLinejoin="round" opacity="0.92" />
      <path d={`M85 34h7c6 0 11 5 11 11v53H85V34Z`} stroke="currentColor" strokeWidth="7" strokeLinejoin="round" opacity="0.55" />
      <path d={`M47 ${lineA}h22M47 ${lineB}h28`} stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
      <circle cx={42 + (variant % 14)} cy={70 - (variant % 9)} r="4" fill="currentColor" opacity="0.35" />
    </svg>
  )
}

function MicroscopeIcon() {
  return (
    <svg viewBox="0 0 120 120" className="h-16 w-16" fill="none" aria-hidden="true">
      <path d="M52 22l22 13-9 16-22-13 9-16Z" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" />
      <path d="M55 49c-6 12-2 25 10 32M70 84H39M33 98h58" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M76 42l10 6M44 73h17M72 84c12-3 20-13 20-25" stroke="currentColor" strokeWidth="7" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

function FeatherIcon() {
  return (
    <svg viewBox="0 0 120 120" className="h-16 w-16" fill="none" aria-hidden="true">
      <path d="M85 19c-23 2-44 16-54 39-7 16-3 29 8 35 15 8 33-2 43-19 9-16 11-35 3-55Z" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" />
      <path d="M84 20C68 45 52 65 27 101M47 67h22M57 52h21" stroke="currentColor" strokeWidth="7" strokeLinecap="round" opacity="0.58" />
    </svg>
  )
}

export default function BookCover({ deweyCode, title, id }) {
  const group = deweyGroup(deweyCode)
  const style = group === null ? 'bg-gray-100 text-gray-600 border-gray-300' : DEWEY_STYLES[group]
  const seed = hashValue(`${id}-${deweyCode}-${title}`)
  const variant = seed % 17
  const codeLabel = deweyCode || 'CAT'
  const shortTitle = title || 'Libro sin titulo'

  return (
    <div className={`relative aspect-[3/4] w-full overflow-hidden rounded-md border ${style} shadow-sm`}>
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/12 via-black/5 to-transparent" />
      <div className="absolute left-8 top-0 h-full w-px bg-white/70" />
      <div
        className="absolute -right-10 -top-10 h-28 w-28 rounded-full border border-current/20"
        style={{ transform: `translate(${variant}px, ${variant / 2}px)` }}
      />
      <div className="absolute bottom-5 right-5 h-12 w-12 rotate-45 border border-current/20" />

      <div className="relative flex h-full flex-col justify-between p-5 pl-10">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full border border-current/25 bg-white/45 px-2.5 py-1 text-xs font-black tracking-wide">
            {codeLabel}
          </span>
          <span className="h-2 w-2 rounded-full bg-current opacity-45" />
        </div>

        <div className="grid place-items-center text-current">
          {group === 5 ? <MicroscopeIcon /> : group === 8 ? <FeatherIcon /> : <BookIcon variant={variant} />}
        </div>

        <div>
          <p className="mb-2 max-h-12 overflow-hidden text-sm font-black leading-tight text-current">
            {shortTitle}
          </p>
          <div className="h-1.5 w-16 rounded-full bg-current opacity-35" />
        </div>
      </div>
    </div>
  )
}
