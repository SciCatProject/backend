import { forwardRef, Module } from "@nestjs/common";
import { OrigDatablocksService } from "./origdatablocks.service";
import { MongooseModule } from "@nestjs/mongoose";
import {
  OrigDatablock,
  OrigDatablockSchema,
} from "./schemas/origdatablock.schema";
import { OrigDatablocksController } from "./origdatablocks.controller";
import { OrigDatablocksPublicV4Controller } from "./origdatablocks-public.v4.controller";
import { OrigDatablocksV4Controller } from "./origdatablocks.v4.controller";
import { CaslModule } from "src/casl/casl.module";
import { DatasetsModule } from "src/datasets/datasets.module";
import { DatafilesMetadataValidationPipe } from "./pipes/datafiles-metadata-validation.pipe";

@Module({
  imports: [
    CaslModule,
    forwardRef(() => DatasetsModule),
    MongooseModule.forFeature([
      {
        name: OrigDatablock.name,
        schema: OrigDatablockSchema,
      },
    ]),
  ],
  controllers: [
    OrigDatablocksPublicV4Controller,
    OrigDatablocksController,
    OrigDatablocksV4Controller,
  ],
  exports: [OrigDatablocksService],
  providers: [OrigDatablocksService, DatafilesMetadataValidationPipe],
})
export class OrigDatablocksModule {}
