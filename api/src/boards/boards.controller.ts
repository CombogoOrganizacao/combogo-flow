import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/firebase-auth.guard";
import { BoardsService } from "./boards.service";
import { AddMemberDto, CreateBoardDto } from "./dto/boards.dto";

@UseGuards(FirebaseAuthGuard)
@Controller("boards")
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  create(@Body() dto: CreateBoardDto, @CurrentUser() user: AuthenticatedUser) {
    return this.boardsService.create(dto.title, user.uid);
  }

  @Post(":boardId/members")
  addMember(
    @Param("boardId") boardId: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.boardsService.addMember(boardId, user.uid, dto.email);
  }
}
