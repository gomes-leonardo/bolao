import type { Paginated, PaginationInput } from "@bolao/core/contracts";

export const skipOf = ({ page, pageSize }: PaginationInput) =>
  (page - 1) * pageSize;

export function paginated<T>(
  data: T[],
  total: number,
  { page, pageSize }: PaginationInput,
): Paginated<T> {
  return { data, meta: { page, pageSize, total } };
}
