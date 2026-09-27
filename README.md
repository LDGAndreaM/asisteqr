# AsisteQR

Sistema de asistencia con código QR para maestro y alumnos, implementado a partir del
prototipo de Claude Design en `../project/Asistencia QR.dc.html`.

- **Panel del maestro** (escritorio): materias con horario/aula, generación de QR rotativo
  (expira cada 15 s), asistencias en vivo y pase de lista manual, asignaciones con
  calificaciones y rúbricas, revisión de justificaciones, reportes exportables a CSV/Excel.
- **App del alumno** (móvil, instalable como PWA): inicio con clases del día, escaneo real de
  QR con cámara (jsQR) + validación de ubicación (Geolocation API contra un geocerco de 120 m
  alrededor del salón), historial de asistencia, justificación de faltas con subida de archivo.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind v4, Postgres vía Prisma 7 (driver adapter
`@prisma/adapter-pg`), autenticación por sesión firmada (JWT en cookie httpOnly, `jose` +
`bcryptjs`), `qrcode`/`jsqr` para el ciclo de vida del QR, `exceljs` para exportar `.xlsx`.

## Requisitos

- Node 20+
- Postgres en ejecución localmente (o cambia `DATABASE_URL`)

## Configuración local

```bash
# edita .env con tu DATABASE_URL / AUTH_SECRET si no usas los valores de ejemplo
npm install
npx prisma migrate deploy   # crea las tablas
npm run db:seed             # datos de demo (ver credenciales abajo)
npm run dev
```

## Cuentas de prueba (tras `npm run db:seed`)

- **Maestro**: `m.rangel@inst.mx` / `maestro123`
- **Alumnos**: `diego.soto@inst.mx`, `ana.beltran@inst.mx`, `carlos.vera@inst.mx`,
  `fernanda.lugo@inst.mx`, `jorge.nava@inst.mx` — contraseña `alumno123`. El ID de institución
  de cada alumno se muestra en la salida del seed (ej. Diego Soto = `2021030456`).

También puedes crear cuentas nuevas desde la pantalla de login ("Créala aquí"). Un alumno se
une a una materia de dos formas: escribiendo el **código de unión** de la materia (6 letras y
números, p. ej. `CALC21` en el seed) desde "Inicio → Unirme a una materia con código", o siendo
invitado por correo por el maestro desde la pestaña "Alumnos" de cada materia.

## Administración de materias y alumnos

- **Editar / archivar materia**: ícono ✏️ en la tarjeta abre el formulario de edición; el ícono
  🗄️ archiva la materia (no se puede generar QR ni inscribirse por clave mientras está
  archivada, pero sus reportes/historial siguen disponibles). "Ver archivadas" en la parte
  superior alterna la lista.
- **Invitar por correo**: dentro del panel de alumnos de una materia, el maestro captura un
  correo. Si ya existe una cuenta de alumno con ese correo, se inscribe de inmediato; si no,
  queda como invitación pendiente y se activa sola en cuanto ese correo se registra como alumno
  (no se envía ningún correo real — es un mecanismo interno).
- **Quitar / reactivar alumno**: botón "Quitar" en la lista de alumnos desactiva su inscripción
  (deja de contar en asistencia y reportes futuros, pero conserva su historial pasado); "Editar"
  permite corregir su nombre o ID de institución.

## Código de unión

Cada materia tiene un código único de 6 caracteres (sin `0/O/1/I` para evitar confusiones) que
se muestra en su tarjeta y en la pestaña "Alumnos". El maestro puede copiarlo, generar uno nuevo
(el anterior deja de funcionar) o desactivar la inscripción por código (entonces solo se puede
entrar por invitación de correo). La clave de la materia (`CALC-201`) sigue siendo solo una
etiqueta del maestro.

## Pase de lista manual

En la pestaña "Asistencia" de cada materia (y en "Asistencias" del menú) hay una lista con
botones **P / R / F** (Presente / Retardo / Falta) por alumno, más acciones para marcar a todos
los pendientes como presentes o como falta. Se puede elegir una fecha pasada para capturar o
corregir clases anteriores. Los escaneos QR aparecen en la misma lista en tiempo real y el
maestro puede corregirlos. Los retardos cuentan como asistencia en los porcentajes y se
desglosan en los reportes.

## Asignaciones y calificaciones

En la pestaña "Asignaciones" de cada materia el maestro registra tareas/proyectos con nombre,
fecha de entrega, descripción breve y **peso** en el promedio. Cada asignación usa una escala:

- Predefinidas: sobre 100, sobre 10, `1/0` (entregó / no entregó), `1/R/0` (con retardo) y
  Excelente/Bueno/Suficiente/Insuficiente.
- Personalizadas: numérica sobre cualquier máximo o una lista de opciones con código, significado
  y valor (ej. `1`, `R`, `NE`). Se pueden guardar en la materia para reutilizarlas.

Opcionalmente lleva una **rúbrica**: se elige una prediseñada (tarea, ensayo, exposición,
proyecto, trabajo en equipo), una guardada por el maestro, o se arman los criterios a mano, y se
puede guardar como plantilla. Al calificar con escala numérica, los puntos de la rúbrica calculan
la calificación automáticamente (ajustable a mano). La libreta muestra todas las calificaciones y
un promedio ponderado sobre 100 (solo cuenta asignaciones calificadas).

## Reportes

- Asistencia: semanal (pestaña "Reportes") o de todo el periodo (botones "Todo el periodo" y en la
  pestaña "Asistencia" de la materia), en CSV o Excel.
- Calificaciones: CSV (tabla alumnos × asignaciones + promedio) o Excel con hojas de
  calificaciones, detalle de asignaciones (escala, peso, rúbrica) y comentarios.

## Notas de implementación

- El geocerco por materia se captura con el botón "Usar mi ubicación actual" al crear la
  materia (el maestro debe estar en el salón); el radio de validación es fijo (120 m).
- El QR se identifica por un token opaco de un solo uso por ventana de 15 s, emitido por
  `/api/subjects/[id]/qr` y validado en `/api/attendance/scan`; token expirado o desconocido
  se rechaza.
- Los documentos de justificación se guardan en `uploads/` (fuera de `public/`, fuera de git) y
  sólo se sirven a través de `/api/justifications/[id]/file` tras verificar que quien pide el
  archivo es el alumno dueño o el maestro de la materia.
