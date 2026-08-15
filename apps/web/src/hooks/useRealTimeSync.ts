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
            // MUY IMPORTANTE: Invalidar la lista de clientes también,
            // ya que la tabla de clientes muestra el "latestAppointment" y su estado.
            queryClient.invalidateQueries({ queryKey: ['clients'] });
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
