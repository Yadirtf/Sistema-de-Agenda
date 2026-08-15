export class AppointmentStatusChangedEvent {
  constructor(
    public readonly appointmentId: number,
    public readonly clientId: number,
    public readonly statusId: number,
    public readonly statusName: string,
    public readonly note?: string,
    public readonly userId?: number,
  ) {}
}
