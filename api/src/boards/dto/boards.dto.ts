import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CreateBoardDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class AddMemberDto {
  @IsEmail()
  email!: string;
}
