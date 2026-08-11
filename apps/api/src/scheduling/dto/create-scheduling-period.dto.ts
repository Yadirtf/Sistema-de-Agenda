import { IsDateString, IsInt, IsNotEmpty } from 'class-validator';

export class CreateSchedulingPeriodDto {
  @IsDateString({}, { message: 'La fecha de inicio no es válida' })
  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  startDate!: string;

  @IsDateString({}, { message: 'La fecha de fin no es válida' })
  @IsNotEmpty({ message: 'La fecha de fin es requerida' })
  endDate!: string;

  @IsInt()
  @IsNotEmpty({ message: 'El estado es requerido' })
  statusId!: number;
}
