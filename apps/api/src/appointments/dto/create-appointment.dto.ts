import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  @IsNotEmpty({ message: 'El cliente es requerido' })
  clientId!: number;

  @IsInt()
  @IsOptional()
  professionalId?: number;

  @IsInt()
  @IsOptional()
  clientEntryId?: number;

  @IsInt()
  @IsOptional()
  schedulingPeriodId?: number;

  @IsInt()
  @IsOptional()
  previousAppointmentId?: number;

  @IsDateString({}, { message: 'La fecha de la cita no es válida' })
  @IsNotEmpty({ message: 'La fecha de la cita es requerida' })
  appointmentDate!: string;

  @IsInt()
  @IsOptional()
  statusId?: number;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;
}
