'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, Save, AlertCircle } from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { CatalogItem } from '@agendamiento/shared';

export default function NewClientPage() {
  const router = useRouter();

  const [documentTypeId, setDocumentTypeId] = useState<number>(1);
  const [documentNumber, setDocumentNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [secondLastName, setSecondLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar catálogos (document types)
  const { data: documentTypes } = useQuery({
    queryKey: ['catalogs', 'document-types'],
    queryFn: () => apiClient.get<CatalogItem[]>('/catalogs/document-types'),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!documentTypeId || !documentNumber || !firstName || !lastName) {
      setError('Por favor completa los campos obligatorios (*)');
      return;
    }

    try {
      setLoading(true);

      // 1. Crear cliente con persona anidada
      const client = await apiClient.post<any>('/clients', {
        person: {
          documentTypeId,
          documentNumber,
          firstName,
          middleName: middleName || null,
          lastName,
          secondLastName: secondLastName || null,
          birthDate: birthDate || null,
          phone: phone || null,
          email: email || null,
          statusId: 1, // Activo
        },
      });

      // 2. Registrar ingreso inicial de cliente
      if (entryDate) {
        await apiClient.post(`/clients/${client.id}/entries`, {
          entryDate,
          statusId: 1, // Activo
        });
      }

      router.push(`/clients/${client.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Error al registrar el cliente. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back Button & Title */}
      <div>
        <Link href="/clients" className="btn btn-ghost" style={{ paddingLeft: 0, color: 'var(--text-muted)' }}>
          <ArrowLeft size={18} />
          <span>Volver a Clientes</span>
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.5rem' }}>
          Registrar Nuevo Cliente
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Crea la persona e inicia su historial de ingresos
        </p>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            border: '1px solid var(--danger-border)',
            fontSize: '0.875rem',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          Información Personal
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Tipo de Documento *</label>
            <select
              className="input"
              value={documentTypeId}
              onChange={(e) => setDocumentTypeId(Number(e.target.value))}
              required
            >
              {documentTypes?.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Número de Documento *</label>
            <input
              type="text"
              className="input"
              placeholder="Ej: 1020304050"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Primer Nombre *</label>
            <input
              type="text"
              className="input"
              placeholder="Ej: Juan"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Segundo Nombre</label>
            <input
              type="text"
              className="input"
              placeholder="Ej: Carlos"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Primer Apellido *</label>
            <input
              type="text"
              className="input"
              placeholder="Ej: Pérez"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Segundo Apellido</label>
            <input
              type="text"
              className="input"
              placeholder="Ej: Gómez"
              value={secondLastName}
              onChange={(e) => setSecondLastName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fecha de Nacimiento</label>
            <input
              type="date"
              className="input"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Teléfono Móvil</label>
            <input
              type="text"
              className="input"
              placeholder="Ej: 3001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Correo Electrónico</label>
            <input
              type="email"
              className="input"
              placeholder="ejemplo@cliente.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginTop: '1rem' }}>
          Fecha de Ingreso Inicial
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Fecha de Ingreso *</label>
            <input
              type="date"
              className="input"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Fuente de verdad para el cálculo automático de semana de ingreso
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <Link href="/clients" className="btn btn-secondary">
            Cancelar
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={18} />
            <span>{loading ? 'Guardando...' : 'Guardar Cliente'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
