'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Plus, Edit, Trash2, X, AlertCircle, CheckSquare, Square, ChevronDown, ChevronUp, Lock,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Role, Permission } from '@agendamiento/shared';
import { useAuthStore } from '@/stores/useAuthStore';

// ── Colores por módulo ────────────────────────────────────────────────────────

const MODULE_COLORS: Record<string, string> = {
  dashboard:     '#6366f1',
  appointments:  '#0ea5e9',
  clients:       '#10b981',
  follow_ups:    '#f59e0b',
  users:         '#ef4444',
  roles:         '#8b5cf6',
  settings:      '#64748b',
};

function getModuleColor(module: string) {
  return MODULE_COLORS[module] ?? '#6366f1';
}

// ── Agrupar permisos por módulo ───────────────────────────────────────────────

function groupByModule(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', appointments: 'Citas', clients: 'Clientes',
  follow_ups: 'Seguimientos', users: 'Usuarios', roles: 'Roles', settings: 'Configuración',
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const emptyForm = { name: '', description: '', permissionIds: [] as number[] };
  const [form, setForm] = useState(emptyForm);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiClient.get<Role[]>('/roles'),
  });

  const { data: allPermissions } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: () => apiClient.get<Permission[]>('/roles/permissions'),
    enabled: showModal,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (payload: typeof emptyForm) => apiClient.post<Role>('/roles', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); closeModal(); },
    onError: (err: any) => setFormError(err?.message ?? 'Error al crear el rol'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<typeof emptyForm> }) =>
      apiClient.put<Role>(`/roles/${id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); closeModal(); },
    onError: (err: any) => setFormError(err?.message ?? 'Error al actualizar el rol'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/roles/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setDeleteConfirm(null); },
    onError: (err: any) => alert(err?.message ?? 'No se pudo eliminar el rol'),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditRole(null);
    setForm(emptyForm);
    setFormError(null);
    setExpandedModules({});
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditRole(role);
    setForm({
      name: role.name,
      description: role.description ?? '',
      permissionIds: role.permissions?.map((p) => p.id) ?? [],
    });
    setFormError(null);
    setExpandedModules({});
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditRole(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) { setFormError('El nombre del rol es requerido'); return; }
    if (form.permissionIds.length === 0) { setFormError('Selecciona al menos un permiso'); return; }
    if (editRole) {
      updateMutation.mutate({ id: editRole.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const togglePermission = (permId: number) => {
    setForm((f) => ({
      ...f,
      permissionIds: f.permissionIds.includes(permId)
        ? f.permissionIds.filter((id) => id !== permId)
        : [...f.permissionIds, permId],
    }));
  };

  const toggleModule = (module: string, perms: Permission[]) => {
    const moduleIds = perms.map((p) => p.id);
    const allSelected = moduleIds.every((id) => form.permissionIds.includes(id));
    setForm((f) => ({
      ...f,
      permissionIds: allSelected
        ? f.permissionIds.filter((id) => !moduleIds.includes(id))
        : [...new Set([...f.permissionIds, ...moduleIds])],
    }));
  };

  const toggleExpandModule = (module: string) => {
    setExpandedModules((prev) => ({ ...prev, [module]: !prev[module] }));
  };

  const grouped = groupByModule(allPermissions ?? []);
  const isMutating = createMutation.isPending || updateMutation.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Gestión de Roles</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Define roles personalizados y asigna los permisos que tendrán en el sistema
          </p>
        </div>
        {hasPermission('roles:create') && (
          <button id="btn-create-role" className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Crear Rol
          </button>
        )}
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando roles...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {roles?.map((role) => {
            const permsByModule = groupByModule(role.permissions ?? []);
            return (
              <div key={role.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Role header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={20} color="#fff" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{role.name}</h3>
                        {role.isSystem && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 600, backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', borderRadius: '9999px', padding: '0.1rem 0.45rem' }}>
                            <Lock size={9} /> Sistema
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{role.description ?? 'Sin descripción'}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                    {hasPermission('roles:update') && (
                      <button id={`btn-edit-role-${role.id}`} title="Editar rol" onClick={() => openEdit(role)} style={{ padding: '0.375rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer', color: 'var(--primary-600)' }}>
                        <Edit size={14} />
                      </button>
                    )}
                    {hasPermission('roles:delete') && !role.isSystem && (
                      <button id={`btn-delete-role-${role.id}`} title="Eliminar rol" onClick={() => setDeleteConfirm(role)} style={{ padding: '0.375rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Permissions by module */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {(role.permissions?.length ?? 0)} permisos
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {Object.entries(permsByModule).map(([module, perms]) => (
                      <span key={module} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: `${getModuleColor(module)}18`, color: getModuleColor(module) }}>
                        {MODULE_LABELS[module] ?? module} ({perms.length})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal crear/editar ─────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{editRole ? 'Editar Rol' : 'Crear Nuevo Rol'}</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Configura los permisos que tendrá este rol</p>
              </div>
              <button id="btn-close-role-modal" onClick={closeModal} style={{ padding: '0.375rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form id="form-role" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', display: 'block' }}>Nombre del Rol *</label>
                <input
                  id="input-role-name"
                  className="input"
                  required
                  placeholder="Ej: Coordinador"
                  value={form.name}
                  readOnly={editRole?.isSystem}
                  style={{ opacity: editRole?.isSystem ? 0.6 : 1 }}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                />
                {editRole?.isSystem && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>El nombre de los roles de sistema no puede modificarse</p>}
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', display: 'block' }}>Descripción</label>
                <textarea
                  id="input-role-description"
                  className="input"
                  rows={2}
                  placeholder="Describe brevemente las responsabilidades del rol..."
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Permisos por módulo */}
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Permisos — {form.permissionIds.length} seleccionados
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Object.entries(grouped).map(([module, perms]) => {
                    const moduleIds = perms.map((p) => p.id);
                    const allSelected = moduleIds.every((id) => form.permissionIds.includes(id));
                    const someSelected = moduleIds.some((id) => form.permissionIds.includes(id));
                    const color = getModuleColor(module);
                    const expanded = expandedModules[module] ?? false;

                    return (
                      <div key={module} style={{ border: `1px solid ${someSelected ? color + '50' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: someSelected ? `${color}08` : 'transparent' }}>
                        {/* Module header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', cursor: 'pointer' }} onClick={() => toggleExpandModule(module)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <button type="button" onClick={(e) => { e.stopPropagation(); toggleModule(module, perms); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: allSelected ? color : 'var(--text-muted)' }}>
                              {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color }}>{MODULE_LABELS[module] ?? module}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{perms.filter(p => form.permissionIds.includes(p.id)).length}/{perms.length}</span>
                          </div>
                          {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                        </div>

                        {/* Individual permissions */}
                        {expanded && (
                          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {perms.map((perm) => {
                              const selected = form.permissionIds.includes(perm.id);
                              return (
                                <label key={perm.id} htmlFor={`perm-${perm.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
                                  <input
                                    id={`perm-${perm.id}`}
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => togglePermission(perm.id)}
                                    style={{ accentColor: color }}
                                  />
                                  <div>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{perm.label}</span>
                                    <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.375rem' }}>{perm.name}</code>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {formError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239,68,68,0.1)', color: '#dc2626', fontSize: '0.875rem' }}>
                  <AlertCircle size={16} /> {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={closeModal}>Cancelar</button>
                <button type="submit" id="btn-submit-role" className="btn btn-primary" disabled={isMutating} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isMutating ? 'Guardando...' : editRole ? 'Guardar Cambios' : 'Crear Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminación ───────────────────────────────────── */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Trash2 size={24} color="#dc2626" />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>¿Eliminar rol?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
              Vas a eliminar el rol <strong>{deleteConfirm.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button
                id="btn-confirm-delete-role"
                className="btn"
                style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none' }}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
