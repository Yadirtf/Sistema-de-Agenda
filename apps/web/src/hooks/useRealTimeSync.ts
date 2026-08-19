import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function useRealTimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Establecer conexión SSE
    const eventSource = new EventSource(`${API_URL}/events/sse`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[RealTimeSync] Event received:', data.type);

        // Lógica de invalidación selectiva basada en el tipo de evento
        switch (data.type) {
          case 'appointment.created':
          case 'appointment.updated':
            // Invalidar listas de citas y detalles
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['appointments-pending-reminders'] });
            queryClient.invalidateQueries({ queryKey: ['appointments-yearly-history'] });

            // Invalidar la lista de clientes también (incluye la tabla general y dropdowns)
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['clients-general'] }); // Por compatibilidad si quedó alguno
            queryClient.invalidateQueries({ queryKey: ['clients-dropdown'] });

            // Invalidar estadísticas del dashboard
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

            if (data.payload?.id) {
               queryClient.invalidateQueries({ queryKey: ['follow-ups', Number(data.payload.id)] });
            }
            if (data.payload?.clientId) {
               queryClient.invalidateQueries({ queryKey: ['client', Number(data.payload.clientId)] });
            }
            break;

          case 'client.created':
            // Invalidar lista de clientes y estadísticas del dashboard
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            break;

          default:
            console.log('[RealTimeSync] Unhandled event type:', data.type);
        }
      } catch (err) {
        console.error('[RealTimeSync] Error parsing event data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[RealTimeSync] EventSource error:', err);
      // El navegador suele intentar reconectar automáticamente en SSE
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);
}
