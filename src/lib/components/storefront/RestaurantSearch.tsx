"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface RestaurantSearchProps {
  onSearch: (query: string) => void;
}

export function RestaurantSearch({ onSearch }: RestaurantSearchProps) {
  const [query, setQuery] = useState("");

  // Simple debounce logic for fast, instant filtering
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(query);
    }, 150); // fast 150ms debounce for local search
    return () => clearTimeout(handler);
  }, [query, onSearch]);

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 opacity-40" style={{ color: "var(--text)" }} />
      </div>
      <input
        type="text"
        placeholder="Search dishes or categories..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full pl-10 pr-10 py-3 border rounded-xl text-sm transition-colors outline-none"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          aria-label="Clear search"
        >
          <X className="h-4 w-4 opacity-40 hover:opacity-80" style={{ color: "var(--text)" }} />
        </button>
      )}
    </div>
  );
}
