import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertClientSchedulingConfigDto {
  @IsInt()
  @IsNotEmpty({ message: 'El intervalo de agendamiento es requerido' })
  intervalId!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
