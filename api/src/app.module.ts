import { Module } from "@nestjs/common";
import { FirebaseModule } from "./firebase/firebase.module";
import { BoardsModule } from "./boards/boards.module";
import { ListsModule } from "./lists/lists.module";
import { CardsModule } from "./cards/cards.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [FirebaseModule, BoardsModule, ListsModule, CardsModule, ConfigModule.forRoot({ isGlobal: true })],

})
export class AppModule {}
