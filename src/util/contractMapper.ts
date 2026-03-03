export const mapSubraceForContract = <T extends Record<string, unknown>>(subrace: T): T => {
  const mapped = { ...subrace } as Record<string, unknown>

  if (mapped.racial_traits !== undefined && mapped.traits === undefined) {
    mapped.traits = mapped.racial_traits
    delete mapped.racial_traits
  }

  return mapped as T
}
