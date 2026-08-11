import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFollowUpDto {
  @IsInt()
  @IsNotEmpty({ message: 'El cliente es requerido' })
  clientId!: number;

  @IsInt()
  @IsOptional()
  appointmentId?: number;

  @IsInt()
  @IsNotEmpty({ message: 'El tipo de seguimiento es requerido' })
  typeId!: number;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;
}
