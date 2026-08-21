'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  Client,
  NextAppointmentSuggestion,
  PaginatedResponse,
} from '@agendamiento/shared';
import { useDaySlots } from './useDaySlots';

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
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null);

  // Inicializar fecha de hoy en formato YYYY-MM-DD
  const [appointmentDate, setAppointmentDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [appointmentTime, setAppointmentTime] = useState<string>('');
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

  // Conectar con el hook de slots y profesionales
  const {
    professionals,
    isLoadingProfessionals,
    slots,
    isWorkingDay,
    workingDays,
    isLoadingSlots,
    isFetchingSlots,
  } = useDaySlots({
    date: appointmentDate,
    professionalId: selectedProfessionalId,
    clientId: selectedClientId,
    enabled: isOpen && !!appointmentDate,
  });

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
          const dateStr = suggDate.toISOString().split('T')[0];
          setAppointmentDate(dateStr);

          // Extraer hora sugerida HH:MM
          const suggTime = suggDate.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          setAppointmentTime(suggTime);
        }
      } catch {
        // Ignorar si no hay sugerencia calculable
      } finally {
        setLoadingSuggestion(false);
      }
    };

    fetchSuggestion();
  }, [selectedClientId, initialClientId, isOpen]);

  // Al cambiar de fecha o profesional, si la hora previamente seleccionada está ocupada, resetear appointmentTime
  useEffect(() => {
    if (appointmentTime && slots.length > 0) {
      const currentSlot = slots.find((s) => s.time === appointmentTime);
      if (currentSlot && !currentSlot.available) {
        setAppointmentTime('');
      }
    }
  }, [slots, appointmentTime]);

  const resetForm = () => {
    setError(null);
    setNotes('');
    setSelectedProfessionalId(null);
    if (!initialClientId) {
      setSelectedClientId(null);
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      setAppointmentDate(`${y}-${m}-${d}`);
      setAppointmentTime('');
      setSuggestion(null);
    }
  };

  const submitAppointment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cid = initialClientId || selectedClientId;

    if (!cid) {
      setError('Por favor selecciona un cliente');
      return false;
    }

    if (!appointmentDate) {
      setError('Por favor selecciona una fecha en el calendario');
      return false;
    }

    if (!appointmentTime) {
      setError('Por favor selecciona un horario disponible');
      return false;
    }

    // Validar disponibilidad del slot seleccionado en los datos actuales
    const targetSlot = slots.find((s) => s.time === appointmentTime);
    if (targetSlot && !targetSlot.available) {
      setError('El horario seleccionado se encuentra ocupado. Por favor elige otro.');
      return false;
    }

    try {
      setLoading(true);
      // Forzar offset de Bogotá (-05:00) para persistir con precisión en BD
      const combinedDateTime = `${appointmentDate}T${appointmentTime}:00-05:00`;

      await apiClient.post('/appointments', {
        clientId: cid,
        professionalId: selectedProfessionalId || null,
        previousAppointmentId: previousAppointmentId || null,
        appointmentDate: new Date(combinedDateTime).toISOString(),
        notes: notes || null,
      });

      // Invalidar queries de citas, slots y clientes
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['day-slots'] });
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
    selectedProfessionalId,
    setSelectedProfessionalId,
    professionals,
    isLoadingProfessionals,
    appointmentDate,
    setAppointmentDate,
    appointmentTime,
    setAppointmentTime,
    notes,
    setNotes,
    slots,
    isWorkingDay,
    workingDays,
    isLoadingSlots,
    isFetchingSlots,
    loading,
    error,
    suggestion,
    loadingSuggestion,
    clients,
    submitAppointment,
    resetForm,
  };
}
