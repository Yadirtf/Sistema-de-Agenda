import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateReschedulingDto {
  @IsInt()
  @IsNotEmpty({ message: 'La cita original es requerida' })
  originalAppointmentId!: number;

  @IsDateString({}, { message: 'La nueva fecha no es válida' })
  @IsNotEmpty({ message: 'La nueva fecha es requerida' })
  newAppointmentDate!: string;

  @IsInt()
  @IsNotEmpty({ message: 'El motivo de reagendamiento es requerido' })
  reasonId!: number;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;
}
