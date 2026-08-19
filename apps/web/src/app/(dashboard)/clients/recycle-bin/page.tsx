'use client';

import Link from 'next/link';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { RecycleBinTable } from '@/components/clients/RecycleBinTable';

export default function RecycleBinPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/clients" className="btn btn-ghost btn-sm" style={{ padding: '0.5rem', minWidth: 'auto' }}>
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Trash2 size={24} style={{ color: 'var(--text-muted)' }} />
              Papelera de Reciclaje
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Gestiona los clientes eliminados y decide si restaurarlos o borrarlos permanentemente
            </p>
          </div>
        </div>
      </div>

      <RecycleBinTable />
    </div>
  );
}
