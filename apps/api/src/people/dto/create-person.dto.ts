import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreatePersonDto {
  @IsInt()
  @IsNotEmpty({ message: 'El tipo de documento es requerido' })
  documentTypeId!: number;

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es requerido' })
  @MaxLength(50)
  documentNumber!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
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

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsOptional()
  @MaxLength(150)
  email?: string;

  @IsInt()
  @IsNotEmpty({ message: 'El estado es requerido' })
  statusId!: number;
}
