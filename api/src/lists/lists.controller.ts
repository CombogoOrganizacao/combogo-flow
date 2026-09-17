import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/firebase-auth.guard";
import { ListsService } from "./lists.service";
import { CreateListDto, RenameListDto } from "./dto/lists.dto";

@UseGuards(FirebaseAuthGuard)
@Controller("boards/:boardId/lists")
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post()
  create(
    @Param("boardId") boardId: string,
    @Body() dto: CreateListDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listsService.create(boardId, user.uid, dto.title);
  }
}

@UseGuards(FirebaseAuthGuard)
@Controller("lists")
export class ListItemController {
  constructor(private readonly listsService: ListsService) {}

  @Patch(":listId")
  rename(
    @Param("listId") listId: string,
    @Body() dto: RenameListDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listsService.rename(listId, user.uid, dto.title);
  }

  @Delete(":listId")
  delete(@Param("listId") listId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.listsService.delete(listId, user.uid);
  }
}
