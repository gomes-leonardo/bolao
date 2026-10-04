import {
  Global,
  Module,
  type OnApplicationShutdown,
  Inject,
} from "@nestjs/common";
import { createDb, type Db } from "@bolao/core";

export const DB = Symbol("DB");

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: (): Db => {
        const url = process.env["DATABASE_URL"];
        if (!url)
          throw new Error("DATABASE_URL não definida. Confere o api/.env.");
        return createDb(url);
      },
    },
  ],
  exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(DB) private readonly db: Db) {}

  async onApplicationShutdown(): Promise<void> {
    await this.db.$disconnect();
  }
}
