import { CreateIndexDto } from "./create-index.dto";
import { DeleteIndexDto } from "./delete-index.dto";
import { GetIndexDto } from "./get-index.dto";
import { SyncDatabaseDto } from "./sync-data.dto";
import { UpdateIndexDto } from "./update-index.dto";

export class OpensearchActions {
  createIndex: CreateIndexDto;
  deleteIndex: DeleteIndexDto;
  updateIndex: UpdateIndexDto;
  syncDatabase: SyncDatabaseDto;
  getIndexSettings: GetIndexDto;
}
