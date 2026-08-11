import { ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdatePersonDto } from '../../people/dto/update-person.dto';

export class UpdateClientDto {
  @ValidateNested()
  @Type(() => UpdatePersonDto)
  @IsOptional()
  person?: UpdatePersonDto;
}
