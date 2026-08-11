import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Poblando base de datos con datos semilla...');

  // 1. Tipos de documento
  const docTypes = [
    'Cédula de Ciudadanía',
    'Tarjeta de Identidad',
    'Cédula de Extranjería',
    'Pasaporte',
    'Permiso Especial de Permanencia (PEP)',
    'Permiso por Protección Temporal (PPT)',
  ];
  for (const name of docTypes) {
    await prisma.documentType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 2. Roles
  const roles = ['Administrador', 'Profesional', 'Recepcionista'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 3. Estados de persona
  const personStatuses = ['Activo', 'Inactivo'];
  for (const name of personStatuses) {
    await prisma.personStatus.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 4. Estados de ingreso
  const entryStatuses = ['Activo', 'Inactivo', 'Finalizado'];
  for (const name of entryStatuses) {
    await prisma.entryStatus.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 5. Estados de periodo
  const periodStatuses = ['Abierto', 'Cerrado', 'En Curso'];
  for (const name of periodStatuses) {
    await prisma.periodStatus.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 6. Estados de cita
  const appointmentStatuses = [
    'Sin agendar',
    'Agendada',
    'Confirmada',
    'En Curso',
    'Completada',
    'Cancelada',
    'No Asistió',
  ];
  for (const name of appointmentStatuses) {
    await prisma.appointmentStatus.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 7. Tipos de seguimiento
  const followUpTypes = [
    'Llamada telefónica',
    'Mensaje WhatsApp',
    'Correo electrónico',
    'Visita presencial',
    'Cambio de Estado',
  ];
  for (const name of followUpTypes) {
    await prisma.followUpType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 8. Motivos de reagendamiento
  const reschedulingReasons = [
    { name: 'Solicitud del cliente', description: 'El cliente solicitó cambio de fecha' },
    { name: 'Inasistencia', description: 'El cliente no asistió y se reprograma' },
    { name: 'Fuerza mayor', description: 'Evento externo impide la cita' },
    { name: 'Cambio de profesional', description: 'Se reasigna a otro profesional' },
    { name: 'Error de agendamiento', description: 'Se agendó incorrectamente' },
  ];
  for (const r of reschedulingReasons) {
    await prisma.reschedulingReason.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
  }

  // 9. Intervalos de agendamiento
  const intervals = [
    { name: 'Quincenal', days: 15, description: 'Cada 15 días' },
    { name: 'Mensual', days: 30, description: 'Cada mes' },
    { name: 'Bimensual', days: 60, description: 'Cada 2 meses' },
    { name: 'Trimestral', days: 90, description: 'Cada 3 meses' },
  ];
  for (const i of intervals) {
    await prisma.schedulingInterval.upsert({
      where: { name: i.name },
      update: {},
      create: i,
    });
  }

  // 10. Configuración global por defecto
  const defaultInterval = await prisma.schedulingInterval.findFirst({ where: { name: 'Mensual' } });
  if (defaultInterval) {
    const existingConfig = await prisma.schedulingConfig.findFirst();
    if (!existingConfig) {
      await prisma.schedulingConfig.create({
        data: {
          defaultIntervalId: defaultInterval.id,
          allowClientOverride: true,
          autoSuggestNext: true,
          respectEntryWeek: true,
          workingDays: [1, 2, 3, 4, 5],
          slotDurationMinutes: 30,
        },
      });
    }
  }

  // 11. Persona y Usuario Admin
  const adminEmail = 'admin@agendamiento.com';
  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingUser) {
    const ccType = await prisma.documentType.findFirst({ where: { name: 'Cédula de Ciudadanía' } });
    const activeStatus = await prisma.personStatus.findFirst({ where: { name: 'Activo' } });
    const adminRole = await prisma.role.findFirst({ where: { name: 'Administrador' } });

    if (ccType && activeStatus && adminRole) {
      const adminPerson = await prisma.people.upsert({
        where: {
          documentTypeId_documentNumber: {
            documentTypeId: ccType.id,
            documentNumber: '0000000000',
          },
        },
        update: {},
        create: {
          documentTypeId: ccType.id,
          documentNumber: '0000000000',
          firstName: 'Administrador',
          lastName: 'Sistema',
          phone: '0000000000',
          email: adminEmail,
          statusId: activeStatus.id,
        },
      });

      const passwordHash = await bcrypt.hash('Admin123!', 10);

      const user = await prisma.user.create({
        data: {
          personId: adminPerson.id,
          email: adminEmail,
          passwordHash,
        },
      });

      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });

      console.log('✅ Usuario Administrador creado exitosamente: admin@agendamiento.com / Admin123!');
    }
  } else {
    // Si ya existe, actualizamos la contraseña para asegurarnos de que coincida con Admin123!
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { passwordHash },
    });
    console.log('✅ Contraseña de Administrador actualizada a Admin123!');
  }

  console.log('🚀 Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
