import { Prisma } from "@bolao/core/prisma";

interface DriverAdapterMeta {
  driverAdapterError?: { cause?: { constraint?: { index?: unknown } } };
}

/** Nome da constraint UNIQUE violada, no formato de erro do Prisma 7 com adapter-pg. */
export function violatedUniqueConstraint(error: unknown): string | undefined {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return undefined;
  }
  const index = (error.meta as DriverAdapterMeta | undefined)
    ?.driverAdapterError?.cause?.constraint?.index;
  return typeof index === "string" ? index : undefined;
}
