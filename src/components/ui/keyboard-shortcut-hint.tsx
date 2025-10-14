'use client'

export function KeyboardShortcut({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded"
        >
          {key}
        </kbd>
      ))}
    </div>
  )
}

export function ShortcutHint({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <KeyboardShortcut keys={keys} />
    </div>
  )
}


