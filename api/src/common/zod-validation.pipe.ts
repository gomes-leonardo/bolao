import type { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import type { z } from "zod";
import { validationFailed } from "./errors.js";

export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<T>
> {
  constructor(private readonly schema: T) {}

  transform(value: unknown, metadata?: ArgumentMetadata): z.output<T> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw validationFailed(
      result.error.issues.map((issue) => ({
        path: [metadata?.data, ...issue.path]
          .filter((part) => part !== undefined)
          .join("."),
        message: issue.message,
      })),
    );
  }
}
