import { IsDateString, IsInt, IsNotEmpty } from 'class-validator';

export class CreateClientEntryDto {
  @IsDateString()
  @IsNotEmpty({ message: 'La fecha de ingreso es requerida' })
  entryDate!: string;

  @IsInt()
  @IsNotEmpty({ message: 'El estado de ingreso es requerido' })
  statusId!: number;
}
