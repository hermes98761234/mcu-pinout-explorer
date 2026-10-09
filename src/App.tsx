import { useEffect, useMemo, useState } from 'react'
import { BOARDS, BOARD_IDS, categorize, matchPin, pinTags, TAGS, type BoardId, type Pin, type Tag } from './lib/boards'
import { tr, type T } from './i18n'
import { useSettings } from './settings'
import { Shell } from './ui'

const TAG_COLOR: Record<Tag, string> = {
  adc: '#2563eb', dac: '#7c3aed', touch: '#db2777', pwm: '#ea580c', i2c: '#16a34a', spi: '#0891b2', uart: '#ca8a04', warn: '#dc2626', power: '#6b7280',
}
const TAG_LABEL: Record<Tag, string> = {
  adc: 'ADC', dac: 'DAC', touch: 'Touch', pwm: 'PWM', i2c: 'I2C', spi: 'SPI', uart: 'UART', warn: 'Boot / strapping warnings', power: 'Power and reset',
}
const DRAW_TAGS: Tag[] = ['adc', 'dac', 'touch', 'pwm', 'i2c', 'spi', 'uart']

const ROW = 26
const TOP = 56
const BX = 150
const BW = 200

function readHash(): { board: BoardId; tags: Set<Tag>; q: string } {
  const p = new URLSearchParams(location.hash.slice(1))
  const b = p.get('board') as BoardId | null
  return {
    board: b && BOARD_IDS.includes(b) ? b : 'esp32',
    tags: new Set((p.get('f') ?? '').split(',').filter((x): x is Tag => (TAGS as string[]).includes(x))),
    q: p.get('q') ?? '',
  }
}

const firstWarn = (b: (typeof BOARDS)[BoardId]): Pin | null => b.pins.find((p) => p.warnings.some((w) => w.level === 'warn')) ?? null

function pinX(p: Pin): number {
  return p.side === 'L' ? BX : BX + BW
}

function BoardSvg(props: { board: (typeof BOARDS)[BoardId]; match: (p: Pin) => boolean; active: Pin | null; onHover: (p: Pin | null) => void; onPick: (p: Pin) => void; t: T }) {
  const { board, match, active, onHover, onPick, t } = props
  const h = TOP + board.rows * ROW + 24
  const w = BX * 2 + BW
  return (
    <svg className="board-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={board.name}>
      <rect x={BX} y={8} width={BW} height={h - 16} rx={10} className="pcb" />
      <rect x={BX + BW / 2 - 28} y={4} width={56} height={32} rx={5} className="usb" />
      <text x={BX + BW / 2} y={26} textAnchor="middle" className="svg-dim">USB</text>
      <rect x={BX + 56} y={TOP + 8} width={BW - 112} height={Math.min(120, board.rows * ROW * 0.4)} rx={6} className="chip-body" />
      <text x={BX + BW / 2} y={TOP + 8 + Math.min(120, board.rows * ROW * 0.4) / 2} textAnchor="middle" className="svg-chip">{board.mcu}</text>
      {board.pins.map((p) => {
        const y = TOP + p.row * ROW + ROW / 2
        const x = pinX(p)
        const on = match(p)
        const tags = pinTags(p)
        const left = p.side === 'L'
        const isActive = active === p
        const dir = left ? 1 : -1
        const dots = DRAW_TAGS.filter((g) => tags.has(g))
        return (
          <g
            key={`${p.side}${p.row}`}
            opacity={on ? 1 : 0.18}
            className="pin"
            tabIndex={0}
            role="button"
            aria-label={p.label}
            onMouseEnter={() => onHover(p)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(p)}
            onBlur={() => onHover(null)}
            onClick={() => onPick(p)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick(p)}
          >
            <rect x={left ? 0 : BX + BW} y={y - ROW / 2 + 1} width={BX} height={ROW - 2} fill={isActive ? 'var(--panel2)' : 'transparent'} rx={4} />
            <circle
              cx={x} cy={y} r={7}
              fill={p.kind === 'power' ? '#dc2626' : p.kind === 'gnd' ? '#374151' : p.kind === 'reset' ? '#ea580c' : 'var(--grid-strong)'}
              stroke={tags.has('warn') ? '#f59e0b' : 'var(--chart-fg)'} strokeWidth={tags.has('warn') ? 3 : 1}
            />
            <text x={x - dir * 16} y={y + 4} textAnchor={left ? 'end' : 'start'} className="svg-label">
              {p.num ? <tspan className="svg-dim">{p.num} </tspan> : null}
              {p.label}
              {tags.has('warn') ? <tspan fill="#f59e0b"> !</tspan> : null}
            </text>
            {dots.map((g, i) => (
              <rect key={g} x={x + dir * (14 + i * 12) - (left ? 0 : 9)} y={y - 4.5} width={9} height={9} rx={2} fill={TAG_COLOR[g]}>
                <title>{t(TAG_LABEL[g])}</title>
              </rect>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

function Details({ pin, t }: { pin: Pin | null; t: T }) {
  if (!pin) return <p className="hint">{t('Hover or tap a pin to see its functions and warnings.')}</p>
  const by = new Map<Tag, string[]>()
  const other: string[] = []
  for (const s of pin.signals) {
    const g = categorize(s)
    if (g) by.set(g, [...(by.get(g) ?? []), s])
    else other.push(s)
  }
  return (
    <div>
      <h2 className="pin-title">
        {pin.label} {pin.num ? <span className="hint">({t('physical pin {0}', pin.num)})</span> : null}
      </h2>
      {pin.signals.length === 0 && pin.kind === 'io' && <p className="hint">{t('No special peripheral function: plain GPIO.')}</p>}
      {[...by.entries()].map(([g, sigs]) => (
        <div key={g} className="row">
          <span className="tagname" style={{ color: TAG_COLOR[g] }}>{t(TAG_LABEL[g])}</span>
          {sigs.map((s) => <span key={s} className="chip mono">{s}</span>)}
        </div>
      ))}
      {other.length > 0 && <div className="row">{other.map((s) => <span key={s} className="chip mono">{s}</span>)}</div>}
      {pin.warnings.map((w) => (
        <p key={w.text} className={w.level === 'warn' ? 'warn-text' : 'hint'}>
          {w.level === 'warn' ? '⚠ ' : 'ℹ '}
          {t(w.text)}
        </p>
      ))}
    </div>
  )
}

export default function App() {
  const [settings, setSettings] = useSettings()
  const t: T = (s, ...a) => tr(settings.lang, s, ...a)
  const [init] = useState(readHash)
  const [boardId, setBoardId] = useState<BoardId>(init.board)
  const [tags, setTags] = useState<Set<Tag>>(init.tags)
  const [q, setQ] = useState(init.q)
  const [hover, setHover] = useState<Pin | null>(null)
  const [picked, setPicked] = useState<Pin | null>(() => firstWarn(BOARDS[init.board]))
  const board = BOARDS[boardId]

  useEffect(() => {
    const p = new URLSearchParams()
    p.set('board', boardId)
    if (tags.size) p.set('f', [...tags].join(','))
    if (q) p.set('q', q)
    history.replaceState(null, '', '#' + p.toString())
  }, [boardId, tags, q])

  const match = (p: Pin) => matchPin(p, tags, q)
  const list = board.pins.filter(match)
  const active = hover ?? picked
  const toggle = (g: Tag) => setTags((s) => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n })
  const counts = useMemo(() => {
    const c = {} as Record<Tag, number>
    for (const g of TAGS) c[g] = board.pins.filter((p) => pinTags(p).has(g)).length
    return c
  }, [board])

  return (
    <Shell title="MCU Pinout Explorer" subtitle="ESP32, Raspberry Pi Pico and STM32 Blue Pill pins at a glance." settings={settings} onSettings={setSettings} t={t}>
      <div className="box">
        <div className="row">
          {BOARD_IDS.map((id) => (
            <button key={id} className={id === boardId ? 'primary' : ''} onClick={() => { setBoardId(id); setPicked(firstWarn(BOARDS[id])) }}>
              {BOARDS[id].name}
            </button>
          ))}
          <span className="spacer" />
          <input type="search" aria-label={t('Search')} placeholder={t('Search: i2c0, GPIO12, strapping…')} value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 300, flex: 1, maxWidth: 480 }} />
        </div>
        <div className="row">
          {TAGS.map((g) => (
            <button key={g} className={tags.has(g) ? 'chipbtn on' : 'chipbtn'} style={{ borderColor: TAG_COLOR[g] }} aria-pressed={tags.has(g)} onClick={() => toggle(g)}>
              <span className="dot" style={{ background: TAG_COLOR[g] }} /> {t(TAG_LABEL[g])} <span className="hint">{counts[g]}</span>
            </button>
          ))}
          {(tags.size > 0 || q) && <button className="small" onClick={() => { setTags(new Set()); setQ('') }}>{t('Clear filters')}</button>}
        </div>
      </div>
      <div className="cols">
        <div className="box">
          <h3>{board.name} <span className="hint">{board.mcu}</span></h3>
          <Details pin={active} t={t} />
          <hr />
          <h3>{t('Notes')}</h3>
          {board.notes.map((n) => <p key={n} className="hint">{t(n)}</p>)}
          <p className="hint">{t('Pins with an amber ring or "!" have boot, strapping or debug caveats. Coloured squares show available functions.')}</p>
        </div>
        <div className="box">
          <BoardSvg board={board} match={match} active={active} onHover={setHover} onPick={(p) => setPicked((o) => (o === p ? null : p))} t={t} />
        </div>
      </div>
      <div className="box">
        <h3>{t('Matching pins ({0})', list.length)}</h3>
        <div className="scroll" style={{ maxHeight: 360 }}>
          <table className="data">
            <thead>
              <tr><th>{t('Pin')}</th><th>{t('Functions')}</th><th>{t('Warnings')}</th></tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={`${p.side}${p.row}`} className={active === p ? 'active' : ''} onClick={() => setPicked(p)} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)}>
                  <td className="mono">{p.num ? `${p.num} · ` : ''}{p.label}</td>
                  <td>{p.signals.map((s) => <span key={s} className="chip mono" style={{ borderColor: TAG_COLOR[categorize(s) ?? 'power'] }}>{s}</span>)}</td>
                  <td className={p.warnings.some((w) => w.level === 'warn') ? 'warn-text' : 'hint'}>{p.warnings.map((w) => t(w.text)).join(' ')}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={3} className="hint">{t('No pin matches the filters.')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  )
}
