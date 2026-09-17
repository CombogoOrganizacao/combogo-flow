import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateCardDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class MoveCardDto {
  @IsString()
  @IsNotEmpty()
  targetListId!: string;

  @IsInt()
  @Min(0)
  targetOrder!: number;
}
