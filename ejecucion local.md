Ejecución Local con Docker
Para levantar todo el sistema (API, Web, Base de Datos y Redis) localmente, sigue estos pasos:
Paso A: Configuración del .env
Tu archivo .env actual tiene configurada una IP externa (149.x.x.x). Para que el Frontend pueda comunicarse con el Backend en tu propia máquina, debes cambiarla a localhost.


Important
Edita tu archivo .env y cambia la línea: SERVER_IP=149.x.x.x  =>  SERVER_IP=localhost
Paso B: Levantar el Proyecto
Desde la raíz del proyecto, ejecuta el comando que ya tienes configurado:
Shell Script
npm run docker:up