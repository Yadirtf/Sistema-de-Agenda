'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, XCircle, Calendar, Clock, User, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Appointment } from '@agendamiento/shared';

export default function PublicConfirmationPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<{ appointment: Appointment; businessPhone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<'confirmed' | 'cancelled' | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const res = await apiClient.get<any>(`/public/appointments/validate/${token}`);
        setData(res);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('El enlace es inválido o ha expirado.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (token) validateToken();
  }, [token]);

  const handleAction = async (action: 'confirm' | 'cancel') => {
    try {
      setProcessing(true);
      await apiClient.patch(`/public/appointments/process/${token}`, { action });
      setSuccess(action === 'confirm' ? 'confirmed' : 'cancelled');
    } catch (err) {
      alert('Error al procesar la solicitud. Inténtalo de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReschedule = () => {
    if (!data?.businessPhone) return;

    const appt = data.appointment;
    const clientName = `${appt.client?.person?.firstName} ${appt.client?.person?.lastName}`;
    const dateStr = new Date(appt.appointmentDate).toLocaleDateString('es-CO');

    const message = `Hola, acabo de cancelar mi cita del día ${dateStr} y me gustaría solicitar un reagendamiento. Mi nombre es ${clientName}.`;
    const whatsappUrl = `https://wa.me/${data.businessPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Cargando información de tu cita...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', padding: '1rem' }}>
        <div className="glass-card" style={{ maxWidth: '450px', padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <XCircle size={48} style={{ color: 'var(--danger-text)', margin: '0 auto' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Enlace no válido</h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{error || 'El enlace que has seguido ya no está disponible o es incorrecto.'}</p>
        </div>
      </div>
    );
  }

  const { appointment: appt } = data;
  const person = appt.client?.person;
  const date = new Date(appt.appointmentDate);

  if (success) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', padding: '1rem' }}>
        <div className="glass-card" style={{ maxWidth: '500px', padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {success === 'confirmed' ? (
            <>
              <CheckCircle2 size={60} style={{ color: 'var(--success-text)', margin: '0 auto' }} />
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>¡Cita Confirmada!</h1>
              <p style={{ color: 'var(--text-muted)' }}>Gracias por confirmar tu asistencia. Te esperamos el día programado.</p>
            </>
          ) : (
            <>
              <AlertCircle size={60} style={{ color: 'var(--warning-text)', margin: '0 auto' }} />
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Cita Cancelada</h1>
              <p style={{ color: 'var(--text-muted)' }}>Hemos registrado la cancelación de tu cita.</p>
              {data.businessPhone && (
                <button className="btn btn-primary" onClick={handleReschedule} style={{ marginTop: '1rem' }}>
                  <MessageSquare size={18} />
                  <span>Solicitar Reagendamiento</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '550px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: 'var(--shadow-glow)' }}>
            <Sparkles size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Confirmación de Cita</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginTop: '0.5rem' }}>
            Hola, <strong>{person?.firstName}</strong>. Por favor confirma tu asistencia a la siguiente cita:
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}>
              <Calendar size={20} style={{ color: 'var(--primary-600)' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Fecha</p>
              <p style={{ fontWeight: 700, fontSize: '1.0625rem' }}>
                {date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}>
              <Clock size={20} style={{ color: 'var(--primary-600)' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Hora</p>
              <p style={{ fontWeight: 700, fontSize: '1.0625rem' }}>
                {date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '1rem' }}
            onClick={() => handleAction('cancel')}
            disabled={processing}
          >
            <XCircle size={18} />
            <span>No podré asistir</span>
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: '1rem' }}
            onClick={() => handleAction('confirm')}
            disabled={processing}
          >
            <CheckCircle2 size={18} />
            <span>Confirmar Cita</span>
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Si necesitas cambiar la fecha, presiona "No podré asistir" para solicitar un reagendamiento.
        </p>
      </div>
    </div>
  );
}
