/**
 * Utilidades centralizadas de formateo de fecha y hora para el sistema.
 * Configurado para Colombia (UTC-5, sistema horario de 12 horas a. m. / p. m.).
 */

/**
 * Convierte una hora en formato "HH:MM" (24h) o un objeto Date/string ISO
 * a formato de 12 horas con a. m. / p. m. (ej: "08:00 a. m.", "02:30 p. m.").
 */
export function formatTime12h(timeOrDate: string | Date | null | undefined): string {
  if (!timeOrDate) return '';

  // Si viene como string simple "HH:MM"
  if (typeof timeOrDate === 'string' && /^\d{1,2}:\d{2}$/.test(timeOrDate)) {
    const [hStr, mStr] = timeOrDate.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const period = h >= 12 ? 'p. m.' : 'a. m.';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  }

  // Si viene como ISO string o Date
  const date = typeof timeOrDate === 'string' ? new Date(timeOrDate) : timeOrDate;
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Bogota',
  });
}

/**
 * Formatea una fecha completa en español (ej: "Lunes, 25 de Agosto de 2026").
 */
export function formatDateLong(dateOrStr: string | Date | null | undefined): string {
  if (!dateOrStr) return '';
  const date = typeof dateOrStr === 'string' ? new Date(dateOrStr) : dateOrStr;
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Bogota',
  });
}

/**
 * Formatea una fecha corta (ej: "25 ago 2026").
 */
export function formatDateShort(dateOrStr: string | Date | null | undefined): string {
  if (!dateOrStr) return '';
  const date = typeof dateOrStr === 'string' ? new Date(dateOrStr) : dateOrStr;
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Bogota',
  });
}

/**
 * Formatea fecha y hora combinadas en 12h (ej: "25 ago 2026, 02:30 p. m.").
 */
export function formatDateTime12h(dateOrStr: string | Date | null | undefined): string {
  if (!dateOrStr) return '';
  const dStr = formatDateShort(dateOrStr);
  const tStr = formatTime12h(dateOrStr);
  return `${dStr}, ${tStr}`;
}
