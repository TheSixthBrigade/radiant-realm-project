// NOTE: @dnd-kit/sortable is not yet installed or wired up in PageBuilderSidebar.tsx.
// This utility is ready to be integrated once @dnd-kit/core and @dnd-kit/sortable
// are added as dependencies (e.g. `npm install @dnd-kit/core @dnd-kit/sortable`)
// and the DndContext + SortableContext are set up in the Sections tab.

/**
 * Reorders an array of sections by moving the item at fromIndex to toIndex.
 * Returns a new array — does not mutate the original.
 * Also updates the `order` field on each section to match its new position.
 */
export function reorderSections<T extends { order?: number }>(
  sections: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (fromIndex === toIndex) return sections;
  if (fromIndex < 0 || toIndex < 0) return sections;
  if (fromIndex >= sections.length || toIndex >= sections.length) return sections;

  const result = [...sections];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);

  return result.map((section, index) => ({ ...section, order: index }));
}
