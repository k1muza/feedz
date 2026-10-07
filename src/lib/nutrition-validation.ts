export function assertUniqueIds(
  values: readonly { id: string }[],
  label: string,
): void {
  const ids = values.map((value) => value.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Duplicate IDs in ${label}.`);
  }
}
