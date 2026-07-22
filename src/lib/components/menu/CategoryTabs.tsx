"use client";

import { FilterChips } from "@/lib/components/common/FilterChips";

interface CategoryTabsProps {
  categories: string[];
  selected: string | null;
  onSelect: (val: string | null) => void;
}

export function CategoryTabs({ categories, selected, onSelect }: CategoryTabsProps) {
  return <FilterChips options={categories} selected={selected} onSelect={onSelect} />;
}
