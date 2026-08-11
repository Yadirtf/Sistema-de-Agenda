import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAppointmentStatusDto {
  @IsInt()
  @IsNotEmpty({ message: 'El ID del estado es requerido' })
  statusId!: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;
}
