import { Global, Module, OnModuleInit } from "@nestjs/common";
import { MongoTransactionService } from "../services/mongo-transaction.service";

let instance: MongoTransactionService | undefined;

@Global()
@Module({
  providers: [MongoTransactionService],
  exports: [MongoTransactionService],
})
export class MongoTransactionModule implements OnModuleInit {
  constructor(
    private readonly mongoTransactionService: MongoTransactionService,
  ) {}

  onModuleInit() {
    instance = this.mongoTransactionService;
  }
}

/**
 * Returns the MongoTransactionService singleton registered by
 * MongoTransactionModule. Backs `@Transactional()` so decorated methods
 * don't rely on the owning class injecting MongoTransactionService itself.
 */
export function getMongoTransactionService(): MongoTransactionService {
  if (!instance) {
    throw new Error(
      "MongoTransactionService is not available yet — make sure " +
        "MongoTransactionModule is imported in AppModule before any " +
        "@Transactional() method runs.",
    );
  }
  return instance;
}
