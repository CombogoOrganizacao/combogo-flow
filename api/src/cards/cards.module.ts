import { Module } from "@nestjs/common";
import { CardsController, ListCardsController } from "./cards.controller";
import { CardsService } from "./cards.service";
import { BoardsModule } from "../boards/boards.module";

@Module({
  imports: [BoardsModule],
  controllers: [CardsController, ListCardsController],
  providers: [CardsService],
})
export class CardsModule {}
