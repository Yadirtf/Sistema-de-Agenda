import { IsInt, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePersonDto } from '../../people/dto/create-person.dto';

export class CreateClientDto {
  @IsInt()
  @IsOptional()
  personId?: number;

  @ValidateNested()
  @Type(() => CreatePersonDto)
  @IsOptional()
  person?: CreatePersonDto;
}
