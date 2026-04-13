import { CreateIndexDto } from "../dto/create-index.dto";
import { DeleteIndexDto } from "../dto/delete-index.dto";
import { GetIndexDto } from "../dto/get-index.dto";
import { SyncDatabaseDto } from "../dto/sync-data.dto";
import { UpdateIndexDto } from "../dto/update-index.dto";

export class ElasticSearchActions {
  createIndex: CreateIndexDto;
  deleteIndex: DeleteIndexDto;
  updateIndex: UpdateIndexDto;
  syncDatabase: SyncDatabaseDto;
  getIndexSettings: GetIndexDto;
}
