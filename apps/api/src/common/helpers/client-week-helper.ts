/**
 * Helper para el cálculo y recomendaciones del sistema de Semana de Ingreso.
 */

export function calculateEntryWeekNumber(entryDate: Date): number {
  const day = entryDate.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

export interface RecommendedWeekRange {
  weekNumber: number;
  startDateStr: string; // YYYY-MM-DD
  endDateStr: string;   // YYYY-MM-DD
  label: string;        // "Semana 2 (08 al 14 de Septiembre)"
}

export function getRecommendedWeekRange(
  targetDate: Date,
  entryWeekNumber: number,
): RecommendedWeekRange {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth(); // 0-11

  let startDay = 1;
  let endDay = 7;

  if (entryWeekNumber === 2) {
    startDay = 8;
    endDay = 14;
  } else if (entryWeekNumber === 3) {
    startDay = 15;
    endDay = 21;
  } else if (entryWeekNumber === 4) {
    startDay = 22;
    // Obtener el último día del mes
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    endDay = Math.min(28, lastDayOfMonth);
  }

  const startDate = new Date(year, month, startDay);
  const endDate = new Date(year, month, endDay);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  const formatStr = (d: Date) => d.toISOString().split('T')[0];
  const monthName = monthNames[month];

  return {
    weekNumber: entryWeekNumber,
    startDateStr: formatStr(startDate),
    endDateStr: formatStr(endDate),
    label: `Semana ${entryWeekNumber} (${startDay.toString().padStart(2, '0')} al ${endDay.toString().padStart(2, '0')} de ${monthName})`,
  };
}
