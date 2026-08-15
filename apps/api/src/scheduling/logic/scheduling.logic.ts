import type { NextAppointmentSuggestion } from '@agendamiento/shared';
import {
  calculateEntryWeekNumber,
  getRecommendedWeekRange,
} from '../../common/helpers/client-week-helper';

export interface SuggestionInput {
  lastAppt?: any;
  client: any;
  config: any;
}

/**
 * Lógica pura para calcular la sugerencia de la próxima cita.
 * Desacoplado de Prisma y servicios.
 */
export function calculateNextSuggestionLogic(input: SuggestionInput): NextAppointmentSuggestion | null {
  const { lastAppt, client, config } = input;

  if (!config.autoSuggestNext) return null;
  if (!client) return null;

  // Determinar intervalo: override del cliente > default global
  const clientConfig = client.schedulingConfig;
  const isClientOverride = !!clientConfig;
  const interval = isClientOverride
    ? clientConfig.interval
    : config.defaultInterval;

  if (!interval) return null;

  // Fecha base: fecha de la última cita, o fecha actual si no hay cita previa
  const baseDate = lastAppt
    ? new Date(lastAppt.appointmentDate)
    : new Date();

  // Paso 1: sumar días del intervalo
  const suggestedDate = new Date(baseDate);
  suggestedDate.setDate(suggestedDate.getDate() + interval.days);

  // Paso 2: ajustar por semana de ingreso (si está habilitado)
  let entryWeek = 1;
  let adjustedForEntryWeek = false;
  const firstEntry = client.entries?.[0];
  let firstEntryDateStr: string | null = null;

  if (firstEntry) {
    const entryDate = new Date(firstEntry.entryDate);
    firstEntryDateStr = entryDate.toISOString().split('T')[0];
    entryWeek = calculateEntryWeekNumber(entryDate);

    if (config.respectEntryWeek) {
      // Calcular día aproximado de la semana objetivo en el mes sugerido
      const targetDay = (entryWeek - 1) * 7 + (entryDate.getDay() || 7);
      const currentDay = suggestedDate.getDate();

      if (Math.abs(currentDay - targetDay) > 3 && targetDay > 0 && targetDay <= 28) {
        suggestedDate.setDate(targetDay);
        adjustedForEntryWeek = true;
      }
    }
  }

  // Paso 3: ajustar a día laboral válido
  let adjustedForWorkingDay = false;
  const maxIterations = 7;
  for (let i = 0; i < maxIterations; i++) {
    const dayOfWeek = suggestedDate.getDay();
    if (config.workingDays.includes(dayOfWeek)) break;
    suggestedDate.setDate(suggestedDate.getDate() + 1);
    adjustedForWorkingDay = true;
  }

  // Paso 4: asignar hora de inicio del negocio
  const [startH, startM] = config.businessStartTime.split(':').map(Number);
  suggestedDate.setHours(startH, startM, 0, 0);

  const suggestedEnd = new Date(suggestedDate);
  suggestedEnd.setMinutes(suggestedEnd.getMinutes() + config.slotDurationMinutes);

  const weekRange = getRecommendedWeekRange(suggestedDate, entryWeek);

  return {
    suggestedDate: suggestedDate.toISOString(),
    suggestedEnd: suggestedEnd.toISOString(),
    interval: {
      id: Number(interval.id),
      name: interval.name,
      days: interval.days,
      description: interval.description ?? null,
    },
    isClientOverride,
    entryWeek,
    weekStartDate: weekRange.startDateStr,
    weekEndDate: weekRange.endDateStr,
    firstEntryDate: firstEntryDateStr,
    adjustedForEntryWeek,
    adjustedForWorkingDay,
  };
}
