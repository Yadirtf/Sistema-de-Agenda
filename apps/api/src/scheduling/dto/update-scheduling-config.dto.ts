import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdateSchedulingConfigDto {
  @IsInt()
  @IsOptional()
  defaultIntervalId?: number;

  @IsBoolean()
  @IsOptional()
  allowClientOverride?: boolean;

  @IsBoolean()
  @IsOptional()
  autoSuggestNext?: boolean;

  @IsBoolean()
  @IsOptional()
  respectEntryWeek?: boolean;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  workingDays?: number[];

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato de hora inválido (HH:MM)' })
  @IsOptional()
  businessStartTime?: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato de hora inválido (HH:MM)' })
  @IsOptional()
  businessEndTime?: string;

  @IsInt()
  @Min(5, { message: 'La duración mínima del slot es 5 minutos' })
  @Max(480, { message: 'La duración máxima del slot es 480 minutos' })
  @IsOptional()
  slotDurationMinutes?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  reminderDaysBefore?: number;

  @IsString()
  @IsOptional()
  businessPhone?: string;
}
