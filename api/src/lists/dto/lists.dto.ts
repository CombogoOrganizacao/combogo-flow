import { IsNotEmpty, IsString } from "class-validator";

export class CreateListDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class RenameListDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}
