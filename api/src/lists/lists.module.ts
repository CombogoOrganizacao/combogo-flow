import { Module } from "@nestjs/common";
import { ListItemController, ListsController } from "./lists.controller";
import { ListsService } from "./lists.service";
import { BoardsModule } from "../boards/boards.module";

@Module({
  imports: [BoardsModule],
  controllers: [ListsController, ListItemController],
  providers: [ListsService],
})
export class ListsModule {}
