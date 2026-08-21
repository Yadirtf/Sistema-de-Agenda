/**
 * Formatea el tiempo transcurrido desde que se envió el recordatorio,
 * en un texto legible en español (ej: "Notificado hace 15 min").
 */
export function formatRelativeNotificationTime(dateStr: string): string {
  const sentDate = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - sentDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 2) return 'Notificado hace un momento';
  if (diffMins < 60) return `Notificado hace ${diffMins} min`;
  if (diffHours < 24) {
    const hStr = sentDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    return `Notificado hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'} (${hStr})`;
  }
  return `Notificado el ${sentDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`;
}
