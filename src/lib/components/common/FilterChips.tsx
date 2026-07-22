"use client";

interface FilterChipsProps {
  options: string[];
  selected: string | null;
  onSelect: (val: string | null) => void;
}

export function FilterChips({ options, selected, onSelect }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      <button
        onClick={() => onSelect(null)}
        className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
        style={{
          background: selected === null ? "var(--primary)" : "var(--surface)",
          color: selected === null ? "#fff" : "var(--text-secondary)",
          border: `1px solid ${selected === null ? "transparent" : "var(--border)"}`,
        }}
      >
        All
      </button>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(selected === opt ? null : opt)}
          className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
          style={{
            background: selected === opt ? "var(--primary)" : "var(--surface)",
            color: selected === opt ? "#fff" : "var(--text-secondary)",
            border: `1px solid ${selected === opt ? "transparent" : "var(--border)"}`,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
