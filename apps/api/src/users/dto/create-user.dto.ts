import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsInt()
  @IsNotEmpty({ message: 'La persona es requerida' })
  personId!: number;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo es requerido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password!: string;

  @IsArray()
  @IsInt({ each: true })
  @IsNotEmpty({ message: 'Debe asignar al menos un rol' })
  roleIds!: number[];
}
