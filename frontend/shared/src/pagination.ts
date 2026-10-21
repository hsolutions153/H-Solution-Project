type Page<T> = { items: T[]; total?: number };

export async function fetchAllPages<T>(
  fetchPage: (endpoint: string) => Promise<Page<T> | T[]>,
  endpoint: string,
): Promise<T[]> {
  const [path, search = ""] = endpoint.split("?");
  const params = new URLSearchParams(search);
  params.set("limit", "100");
  const items: T[] = [];
  for (let page = 1; ; page++) {
    params.set("page", String(page));
    const result = await fetchPage(`${path}?${params}`);
    if (Array.isArray(result)) return result;
    if (!Array.isArray(result.items)) throw new Error("Danh sách trả về không hợp lệ.");
    items.push(...result.items);
    if (result.items.length < 100 || (result.total !== undefined && items.length >= result.total)) {
      return items;
    }
  }
}
