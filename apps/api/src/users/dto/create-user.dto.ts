import {
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  // ── Datos de la Persona ──────────────────────────────────
  @IsInt({ message: 'El tipo de documento debe ser un número entero' })
  @IsNotEmpty({ message: 'El tipo de documento es requerido' })
  documentTypeId!: number;

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es requerido' })
  @MaxLength(50)
  documentNumber!: string;

  @IsString()
  @IsNotEmpty({ message: 'El primer nombre es requerido' })
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  middleName?: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  secondLastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsDateString({}, { message: 'La fecha de nacimiento no es válida (formato: YYYY-MM-DD)' })
  @IsOptional()
  birthDate?: string;

  // ── Datos de Acceso ──────────────────────────────────────
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo es requerido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password!: string;

  // ── Roles ─────────────────────────────────────────────────
  @IsArray({ message: 'roleIds debe ser un arreglo' })
  @IsInt({ each: true })
  @IsNotEmpty({ message: 'Debe asignar al menos un rol' })
  roleIds!: number[];
}
