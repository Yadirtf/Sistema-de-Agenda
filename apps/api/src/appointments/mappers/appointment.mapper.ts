import type { Appointment } from '@agendamiento/shared';

export class AppointmentMapper {
  static toDto(raw: any): Appointment {
    return {
      id: Number(raw.id),
      clientId: Number(raw.clientId),
      professionalId: raw.professionalId ? Number(raw.professionalId) : null,
      clientEntryId: raw.clientEntryId ? Number(raw.clientEntryId) : null,
      schedulingPeriodId: raw.schedulingPeriodId ? Number(raw.schedulingPeriodId) : null,
      previousAppointmentId: raw.previousAppointmentId ? Number(raw.previousAppointmentId) : null,
      appointmentDate: raw.appointmentDate.toISOString(),
      statusId: Number(raw.statusId),
      notes: raw.notes,
      confirmationToken: raw.confirmationToken,
      tokenUsed: raw.tokenUsed,
      reminderSentAt: raw.reminderSentAt ? raw.reminderSentAt.toISOString() : null,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      client: raw.client
        ? {
            id: Number(raw.client.id),
            personId: Number(raw.client.personId),
            createdAt: raw.client.createdAt.toISOString(),
            person: raw.client.person
              ? {
                  id: Number(raw.client.person.id),
                  documentTypeId: Number(raw.client.person.documentTypeId),
                  documentNumber: raw.client.person.documentNumber,
                  firstName: raw.client.person.firstName,
                  middleName: raw.client.person.middleName,
                  lastName: raw.client.person.lastName,
                  secondLastName: raw.client.person.secondLastName,
                  birthDate: raw.client.person.birthDate?.toISOString() ?? null,
                  phone: raw.client.person.phone,
                  email: raw.client.person.email,
                  statusId: Number(raw.client.person.statusId),
                  createdAt: raw.client.person.createdAt.toISOString(),
                  updatedAt: raw.client.person.updatedAt.toISOString(),
                  documentType: raw.client.person.documentType
                    ? { id: Number(raw.client.person.documentType.id), name: raw.client.person.documentType.name }
                    : undefined,
                  status: raw.client.person.status
                    ? { id: Number(raw.client.person.status.id), name: raw.client.person.status.name }
                    : undefined,
                }
              : undefined,
          }
        : undefined,
      professional: raw.professional
        ? {
            id: Number(raw.professional.id),
            documentTypeId: Number(raw.professional.documentTypeId),
            documentNumber: raw.professional.documentNumber,
            firstName: raw.professional.firstName,
            middleName: raw.professional.middleName,
            lastName: raw.professional.lastName,
            secondLastName: raw.professional.secondLastName,
            birthDate: raw.professional.birthDate?.toISOString() ?? null,
            phone: raw.professional.phone,
            email: raw.professional.email,
            statusId: Number(raw.professional.statusId),
            createdAt: raw.professional.createdAt.toISOString(),
            updatedAt: raw.professional.updatedAt.toISOString(),
          }
        : null,
      clientEntry: raw.clientEntry
        ? {
            id: Number(raw.clientEntry.id),
            clientId: Number(raw.clientEntry.clientId),
            entryDate: raw.clientEntry.entryDate.toISOString(),
            statusId: Number(raw.clientEntry.statusId),
            createdAt: raw.clientEntry.createdAt.toISOString(),
            status: raw.clientEntry.status
              ? { id: Number(raw.clientEntry.status.id), name: raw.clientEntry.status.name }
              : undefined,
          }
        : null,
      schedulingPeriod: raw.schedulingPeriod
        ? {
            id: Number(raw.schedulingPeriod.id),
            startDate: raw.schedulingPeriod.startDate.toISOString(),
            endDate: raw.schedulingPeriod.endDate.toISOString(),
            statusId: Number(raw.schedulingPeriod.statusId),
            createdAt: raw.schedulingPeriod.createdAt.toISOString(),
            status: raw.schedulingPeriod.status
              ? { id: Number(raw.schedulingPeriod.status.id), name: raw.schedulingPeriod.status.name }
              : undefined,
          }
        : null,
      status: raw.status
        ? { id: Number(raw.status.id), name: raw.status.name }
        : undefined,
    };
  }
}
