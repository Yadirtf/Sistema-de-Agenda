export function getStatusBadgeClass(statusName: string | undefined): string {
  if (!statusName) return 'badge-info';

  switch (statusName) {
    case 'Completada':
      return 'badge-success';
    case 'Cancelada':
    case 'No Asistió':
      return 'badge-danger';
    case 'Agendada':
    case 'Confirmada':
      return 'badge-info';
    case 'En Curso':
      return 'badge-warning';
    case 'Sin agendar':
      return 'badge-ghost';
    default:
      return 'badge-secondary';
  }
}

export function getStatusColor(statusName: string | undefined): string {
  if (!statusName) return 'var(--info-text)';

  switch (statusName) {
    case 'Completada':
      return 'var(--success-text)';
    case 'Cancelada':
    case 'No Asistió':
      return 'var(--danger-text)';
    case 'Agendada':
    case 'Confirmada':
      return 'var(--info-text)';
    case 'En Curso':
      return 'var(--warning-text)';
    default:
      return 'var(--primary-500)';
  }
}
