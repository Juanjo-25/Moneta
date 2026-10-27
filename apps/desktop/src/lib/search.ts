function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

export function createSearchMatcher(query: string) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);

  return (values: Array<string | undefined>): boolean => {
    const text = normalizeSearch(values.filter(Boolean).join(" "));
    return terms.every((term) => text.includes(term));
  };
}
