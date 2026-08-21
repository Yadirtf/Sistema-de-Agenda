'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppointmentBookingForm } from '@/components/appointments/booking/AppointmentBookingForm';

export default function NewAppointmentPage() {
  const router = useRouter();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabecera de Página */}
      <div>
        <Link href="/appointments" className="btn btn-ghost" style={{ paddingLeft: 0, color: 'var(--text-muted)' }}>
          <ArrowLeft size={18} />
          <span>Volver a Gestión de Citas</span>
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.5rem', letterSpacing: '-0.025em' }}>
          Agendar Nueva Cita
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Selecciona un cliente, profesional y horario disponible en el calendario interactivo
        </p>
      </div>

      {/* Tarjeta con el Formulario Modular de Agendamiento */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <AppointmentBookingForm
          onSuccess={() => router.push('/appointments')}
          onCancel={() => router.push('/appointments')}
        />
      </div>
    </div>
  );
}
