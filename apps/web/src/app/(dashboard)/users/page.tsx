'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, Plus, Shield, Mail, AlertCircle,
  UserCheck, UserX, Edit, ChevronLeft, ChevronRight, X, Eye, EyeOff,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { UserWithRoles, PaginatedResponse, CatalogItem, Role } from '@agendamiento/shared';
import { useAuthStore } from '@/stores/useAuthStore';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CreateUserPayload {
  documentTypeId: number;
  documentNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;
  phone?: string;
  birthDate?: string;
  email: string;
  password: string;
  roleIds: number[];
}

// ── Colores por rol ───────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  Administrador: { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626' },
  Asistente:     { bg: 'rgba(59,130,246,0.12)',  color: '#2563eb' },
  Profesional:   { bg: 'rgba(16,185,129,0.12)',  color: '#059669' },
};
function getRoleBadgeStyle(name: string) {
  return ROLE_COLORS[name] ?? { bg: 'rgba(99,102,241,0.12)', color: '#4f46e5' };
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserWithRoles | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const emptyForm: CreateUserPayload = {
    documentTypeId: 0, documentNumber: '', firstName: '', middleName: '',
    lastName: '', secondLastName: '', phone: '', birthDate: '',
    email: '', password: '', roleIds: [],
  };
  const [form, setForm] = useState<CreateUserPayload>(emptyForm);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: page.toString(), perPage: '10' });
      if (search) params.append('search', search);
      return apiClient.get<PaginatedResponse<UserWithRoles>>(`/users?${params}`);
    },
  });

  const { data: catalogsData } = useQuery({
    queryKey: ['catalogs-for-users'],
    queryFn: async () => {
      const [docTypes, roles] = await Promise.all([
        apiClient.get<{ data: CatalogItem[] }>('/catalogs/document-types'),
        apiClient.get<Role[]>('/roles'),
      ]);
      return { docTypes: docTypes.data, roles };
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) =>
      apiClient.post<UserWithRoles>('/users', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      setForm(emptyForm);
    },
    onError: (err: any) => setFormError(err?.message ?? 'Error al crear el usuario'),
  });

  const updateRolesMutation = useMutation({
    mutationFn: ({ id, roleIds }: { id: number; roleIds: number[] }) =>
      apiClient.put<UserWithRoles>(`/users/${id}`, { roleIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      setEditUser(null);
    },
    onError: (err: any) => setFormError(err?.message ?? 'Error al actualizar roles'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch<UserWithRoles>(`/users/${id}/status`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (user: UserWithRoles) => {
    setEditUser(user);
    setForm({ ...emptyForm, roleIds: user.roles.map((r) => r.id) });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (form.roleIds.length === 0) { setFormError('Selecciona al menos un rol'); return; }
    if (editUser) {
      updateRolesMutation.mutate({ id: editUser.id, roleIds: form.roleIds });
    } else {
      if (!form.documentTypeId) { setFormError('Selecciona el tipo de documento'); return; }
      createMutation.mutate(form);
    }
  };

  const toggleRole = (roleId: number) => {
    setForm((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  const users = data?.data ?? [];
  const meta = data?.meta;
  const isMutating = createMutation.isPending || updateRolesMutation.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
            Gestión de Usuarios
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Registra y administra cuentas de acceso con roles y permisos
          </p>
        </div>
        {hasPermission('users:create') && (
          <button
            id="btn-create-user"
            className="btn btn-primary"
            onClick={openCreate}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} /> Registrar Usuario
          </button>
        )}
      </div>

      {/* Search */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            id="search-users"
            type="text"
            className="input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Buscar por nombre, correo o documento..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando usuarios...</div>
        ) : isError ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} /> Error al cargar usuarios.
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No se encontraron usuarios registrados.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-app)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem' }}>Usuario</th>
                  <th style={{ padding: '1rem' }}>Correo</th>
                  <th style={{ padding: '1rem' }}>Roles</th>
                  <th style={{ padding: '1rem' }}>Estado</th>
                  <th style={{ padding: '1rem' }}>Registro</th>
                  <th style={{ padding: '1rem' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const p = user.person;
                  const active = user.isActive;
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '38px', height: '38px', minWidth: '38px', borderRadius: '50%', background: active ? 'linear-gradient(135deg, var(--primary-500), var(--primary-700))' : 'var(--border-subtle)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
                            {p?.firstName?.[0] ?? 'U'}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{p?.firstName} {p?.lastName}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Doc: {p?.documentNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                          {user.roles?.map((role) => {
                            const style = getRoleBadgeStyle(role.name);
                            return (
                              <span key={role.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: style.bg, color: style.color }}>
                                <Shield size={11} /> {role.name}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)', color: active ? '#059669' : '#dc2626' }}>
                          {active ? <UserCheck size={11} /> : <UserX size={11} />}
                          {active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {new Date(user.createdAt).toLocaleDateString('es-CO')}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {hasPermission('users:update') && (
                            <>
                              <button
                                id={`btn-edit-roles-${user.id}`}
                                title="Editar roles"
                                onClick={() => openEdit(user)}
                                style={{ padding: '0.375rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer', color: 'var(--primary-600)' }}
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                id={`btn-toggle-${user.id}`}
                                title={active ? 'Desactivar' : 'Activar'}
                                onClick={() => toggleStatusMutation.mutate(user.id)}
                                style={{ padding: '0.375rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer', color: active ? '#dc2626' : '#059669' }}
                              >
                                {active ? <UserX size={15} /> : <UserCheck size={15} />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '0.5rem' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Página {meta.page} de {meta.totalPages}
          </span>
          <button className="btn" disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '0.5rem' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Modal de registro / edición ──────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {editUser ? 'Editar Roles de Usuario' : 'Registrar Nuevo Usuario'}
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {editUser ? `${editUser.person?.firstName} ${editUser.person?.lastName}` : 'Completa los datos para crear la cuenta'}
                </p>
              </div>
              <button id="btn-close-modal" onClick={() => setShowModal(false)} style={{ padding: '0.375rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form id="form-create-user" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Datos personales — solo en creación */}
              {!editUser && (
                <>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datos Personales</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', display: 'block' }}>Tipo de Documento *</label>
                      <select
                        id="select-doc-type"
                        className="input"
                        value={form.documentTypeId}
                        onChange={(e) => setForm(f => ({ ...f, documentTypeId: parseInt(e.target.value) }))}
                        required
                      >
                        <option value={0}>Seleccionar...</option>
                        {catalogsData?.docTypes?.map((dt) => (
                          <option key={dt.id} value={dt.id}>{dt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', display: 'block' }}>Número de Documento *</label>
                      <input id="input-doc-number" className="input" required value={form.documentNumber} onChange={(e) => setForm(f => ({ ...f, documentNumber: e.target.value }))} placeholder="Ej: 1234567890" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', display: 'block' }}>Primer Nombre *</label>
                      <input id="input-first-name" className="input" required value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Nombre" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', display: 'block' }}>Segundo Nombre</label>
                      <input id="input-middle-name" className="input" value={form.middleName ?? ''} onChange={(e) => setForm(f => ({ ...f, middleName: e.target.value }))} placeholder="Opcional" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', display: 'block' }}>Primer Apellido *</label>
                      <input id="input-last-name" className="input" required value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Apellido" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', display: 'block' }}>Segundo Apellido</label>
                      <input id="input-second-last-name" className="input" value={form.secondLastName ?? ''} onChange={(e) => setForm(f => ({ ...f, secondLastName: e.target.value }))} placeholder="Opcional" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', display: 'block' }}>Teléfono</label>
                      <input id="input-phone" className="input" type="tel" value={form.phone ?? ''} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Ej: 3001234567" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', display: 'block' }}>Fecha de Nacimiento</label>
                      <input id="input-birth-date" className="input" type="date" value={form.birthDate ?? ''} onChange={(e) => setForm(f => ({ ...f, birthDate: e.target.value }))} />
                    </div>
                  </div>

                  <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)' }} />
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datos de Acceso</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', display: 'block' }}>Correo Electrónico *</label>
                      <input id="input-email" className="input" type="email" required value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
                    </div>
                    <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', display: 'block' }}>Contraseña Temporal *</label>
                      <input id="input-password" className="input" type={showPassword ? 'text' : 'password'} required minLength={8} style={{ paddingRight: '2.75rem' }} value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
                      <button type="button" onClick={() => setShowPassword(s => !s)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(25%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)' }} />
                </>
              )}

              {/* Roles */}
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Roles Asignados *
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {catalogsData?.roles?.map((role) => {
                    const selected = form.roleIds.includes(role.id);
                    const style = getRoleBadgeStyle(role.name);
                    return (
                      <label
                        key={role.id}
                        htmlFor={`role-${role.id}`}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)', border: `1px solid ${selected ? style.color : 'var(--border-subtle)'}`, backgroundColor: selected ? style.bg : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}
                      >
                        <input id={`role-${role.id}`} type="checkbox" checked={selected} onChange={() => toggleRole(role.id)} style={{ marginTop: '0.125rem', accentColor: style.color }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={14} style={{ color: style.color }} />
                            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: style.color }}>{role.name}</span>
                            {role.isSystem && <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', borderRadius: '9999px', padding: '0.1rem 0.45rem' }}>Sistema</span>}
                          </div>
                          {role.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{role.description}</p>}
                          {role.permissions && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              {role.permissions.length} permisos asignados
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {formError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239,68,68,0.1)', color: '#dc2626', fontSize: '0.875rem' }}>
                  <AlertCircle size={16} /> {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" id="btn-cancel-modal" className="btn" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" id="btn-submit-user" className="btn btn-primary" disabled={isMutating} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isMutating ? 'Guardando...' : editUser ? 'Actualizar Roles' : 'Registrar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
