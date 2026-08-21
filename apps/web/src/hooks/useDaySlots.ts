'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { DaySlotsResponse, ProfessionalItem } from '@agendamiento/shared';

interface UseDaySlotsParams {
  date: string; // YYYY-MM-DD
  professionalId?: number | null;
  clientId?: number | null;
  enabled?: boolean;
}

export function useDaySlots({
  date,
  professionalId,
  clientId,
  enabled = true,
}: UseDaySlotsParams) {
  // Consulta de catálogo de profesionales habilitados
  const { data: professionals = [], isLoading: isLoadingProfessionals } = useQuery({
    queryKey: ['professionals-list'],
    queryFn: () => apiClient.get<ProfessionalItem[]>('/appointments/professionals'),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Consulta de slots para el día y profesional seleccionado
  const {
    data: slotsData,
    isLoading: isLoadingSlots,
    isFetching: isFetchingSlots,
    error: slotsError,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ['day-slots', date, professionalId, clientId],
    queryFn: async () => {
      const params = new URLSearchParams({ date });
      if (professionalId) params.append('professionalId', professionalId.toString());
      if (clientId) params.append('clientId', clientId.toString());

      return apiClient.get<DaySlotsResponse>(`/appointments/slots?${params.toString()}`);
    },
    enabled: enabled && !!date && /^\d{4}-\d{2}-\d{2}$/.test(date),
  });

  return {
    professionals,
    isLoadingProfessionals,
    slotsData,
    slots: slotsData?.slots || [],
    isWorkingDay: slotsData?.isWorkingDay ?? true,
    workingDays: slotsData?.workingDays || [1, 2, 3, 4, 5],
    isLoadingSlots,
    isFetchingSlots,
    slotsError,
    refetchSlots,
  };
}
