import { useEffect, useRef, useMemo } from 'react'
import { useProcessStore } from '../../stores/process-store'

const EMPTY_OUTPUT: string[] = []

// ANSI color code → Tailwind/CSS color
const FG_COLORS: Record<number, string> = {
  30: '#1a1d27', 31: '#ef4444', 32: '#22c55e', 33: '#eab308',
  34: '#3b82f6', 35: '#a855f7', 36: '#06b6d4', 37: '#e4e6f0',
  39: '',        // default
  90: '#8b8fa3', 91: '#f87171', 92: '#4ade80', 93: '#facc15',
  94: '#60a5fa', 95: '#c084fc', 96: '#22d3ee', 97: '#f8fafc'
}

interface Span { text: string; color: string; bold: boolean; dim: boolean; underline: boolean }

function parseAnsi(raw: string): Span[] {
  const spans: Span[] = []
  // Regex matches ESC[ sequences
  const regex = /\x1b\[([0-9;]*)([A-Za-z])/g
  let pos = 0
  let color = ''
  let bold = false
  let dim = false
  let underline = false

  let match: RegExpExecArray | null
  while ((match = regex.exec(raw)) !== null) {
    // Push text before this escape
    if (match.index > pos) {
      spans.push({ text: raw.slice(pos, match.index), color, bold, dim, underline })
    }
    pos = match.index + match[0].length

    const cmd = match[2]
    if (cmd === 'm') {
      const codes = match[1] === '' ? [0] : match[1].split(';').map(Number)
      for (const code of codes) {
        if (code === 0) { color = ''; bold = false; dim = false; underline = false }
        else if (code === 1) bold = true
        else if (code === 2) dim = true
        else if (code === 4) underline = true
        else if (code === 22) { bold = false; dim = false }
        else if (code === 24) underline = false
        else if (FG_COLORS[code] !== undefined) color = FG_COLORS[code]
      }
    }
    // Ignore cursor/erase commands (A-F, H, J, K, etc.) — just skip
  }

  // Remaining text after last escape
  if (pos < raw.length) {
    spans.push({ text: raw.slice(pos), color, bold, dim, underline })
  }

  return spans.filter((s) => s.text.length > 0)
}

function AnsiLine({ raw }: { raw: string }) {
  const spans = useMemo(() => parseAnsi(raw), [raw])
  if (spans.length === 0) return <br />
  return (
    <span>
      {spans.map((s, i) => {
        const style: React.CSSProperties = {}
        if (s.color) style.color = s.color
        if (s.bold) style.fontWeight = 'bold'
        if (s.dim) style.opacity = 0.6
        if (s.underline) style.textDecoration = 'underline'
        return (
          <span key={i} style={style}>
            {s.text}
          </span>
        )
      })}
    </span>
  )
}

interface ProcessOutputProps {
  projectId: string
  autoScroll?: boolean
}

export default function ProcessOutput({ projectId, autoScroll = true }: ProcessOutputProps) {
  const output = useProcessStore((s) => s.outputs[projectId]) ?? EMPTY_OUTPUT
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [output, autoScroll])

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[200px] bg-dock-bg rounded-lg p-3 overflow-y-auto font-mono text-xs leading-relaxed"
    >
      {output.length === 0 ? (
        <span className="text-dock-muted">No output yet. Start the server to see output here.</span>
      ) : (
        output.map((line, i) => (
          <div key={i} className="text-dock-text/90 whitespace-pre-wrap break-all">
            <AnsiLine raw={line} />
          </div>
        ))
      )}
    </div>
  )
}
