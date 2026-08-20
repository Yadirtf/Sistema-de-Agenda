'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  Client,
  NextAppointmentSuggestion,
  PaginatedResponse,
} from '@agendamiento/shared';

interface UseCreateAppointmentFormParams {
  isOpen: boolean;
  initialClientId?: number | null;
  previousAppointmentId?: number | null;
  onSuccess?: () => void;
}

export function useCreateAppointmentForm({
  isOpen,
  initialClientId,
  previousAppointmentId,
  onSuccess,
}: UseCreateAppointmentFormParams) {
  const queryClient = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    initialClientId || null,
  );
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('08:00');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<NextAppointmentSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Sincronizar selectedClientId si cambia initialClientId
  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId]);

  // Consulta de lista de clientes para el dropdown cuando no hay initialClientId
  const { data: clientsData } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: () => apiClient.get<PaginatedResponse<Client>>('/clients?perPage=100'),
    enabled: isOpen && !initialClientId,
  });

  const clients = clientsData?.data || [];

  // Consulta de sugerencia automática cuando se selecciona un cliente
  useEffect(() => {
    const fetchSuggestion = async () => {
      const cid = initialClientId || selectedClientId;
      if (!cid || !isOpen) {
        setSuggestion(null);
        return;
      }

      try {
        setLoadingSuggestion(true);
        const sugg = await apiClient.get<NextAppointmentSuggestion>(
          `/appointments/suggest-next/${cid}`,
        );
        if (sugg) {
          setSuggestion(sugg);
          const suggDate = new Date(sugg.suggestedDate);
          setAppointmentDate(suggDate.toISOString().split('T')[0]);
          setAppointmentTime(
            suggDate.toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
          );
        }
      } catch {
        // Ignorar si no hay sugerencia calculable
      } finally {
        setLoadingSuggestion(false);
      }
    };

    fetchSuggestion();
  }, [selectedClientId, initialClientId, isOpen]);

  const resetForm = () => {
    setError(null);
    setNotes('');
    if (!initialClientId) {
      setSelectedClientId(null);
      setAppointmentDate('');
      setAppointmentTime('08:00');
      setSuggestion(null);
    }
  };

  const submitAppointment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cid = initialClientId || selectedClientId;

    if (!cid || !appointmentDate || !appointmentTime) {
      setError('Por favor completa todos los campos requeridos');
      return false;
    }

    try {
      setLoading(true);
      // Forzar offset de Bogotá para evitar desfases al persistir en BD
      const combinedDateTime = `${appointmentDate}T${appointmentTime}:00-05:00`;

      await apiClient.post('/appointments', {
        clientId: cid,
        previousAppointmentId: previousAppointmentId || null,
        appointmentDate: new Date(combinedDateTime).toISOString(),
        notes: notes || null,
      });

      // Invalidar queries de citas y clientes
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      resetForm();
      if (onSuccess) onSuccess();
      return true;
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Error al registrar la cita.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedClientId,
    setSelectedClientId,
    appointmentDate,
    setAppointmentDate,
    appointmentTime,
    setAppointmentTime,
    notes,
    setNotes,
    loading,
    error,
    suggestion,
    loadingSuggestion,
    clients,
    submitAppointment,
    resetForm,
  };
}
