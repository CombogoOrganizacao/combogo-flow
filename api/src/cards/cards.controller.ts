import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/firebase-auth.guard";
import { CardsService } from "./cards.service";
import { CreateCardDto, MoveCardDto, UpdateCardDto } from "./dto/cards.dto";

@UseGuards(FirebaseAuthGuard)
@Controller("lists/:listId/cards")
export class ListCardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post()
  create(
    @Param("listId") listId: string,
    @Body() dto: CreateCardDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardsService.create(listId, user.uid, dto.title);
  }
}

@UseGuards(FirebaseAuthGuard)
@Controller("cards")
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Patch(":cardId")
  update(
    @Param("cardId") cardId: string,
    @Body() dto: UpdateCardDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardsService.update(cardId, user.uid, dto);
  }

  @Patch(":cardId/move")
  move(
    @Param("cardId") cardId: string,
    @Body() dto: MoveCardDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardsService.move(cardId, user.uid, dto.targetListId, dto.targetOrder);
  }

  @Delete(":cardId")
  delete(@Param("cardId") cardId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cardsService.delete(cardId, user.uid);
  }
}
