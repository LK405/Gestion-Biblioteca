# Contexto del Proyecto - Biblioteca Municipal

Fecha de referencia: 26/05/2026

## Objetivo General

Este proyecto es un sistema web para la gestion digital de prestamos de libros en una biblioteca municipal. Fue desarrollado como proyecto universitario para el curso de Analisis de Sistemas 1 de la Universidad Mariano Galvez de Guatemala.

El sistema busca apoyar el trabajo interno del personal de biblioteca, especialmente bibliotecarias y administradores, para consultar catalogo, registrar prestamos, procesar devoluciones, administrar lectores, generar reportes y mantener configuraciones basicas del catalogo y multas.

Los lectores no ingresan directamente al sistema. Sus datos son registrados y gestionados por el personal autorizado.

## Tecnologias y Arquitectura

### Stack principal

- Frontend: React 19 + Vite 8.
- Rutas: React Router DOM 7.
- Backend/DB/Auth: Supabase con PostgreSQL y Supabase Auth.
- Estilos: Tailwind CSS v4, shadcn/ui instalado, Radix, Geist font; muchas pantallas aun usan estilos inline.
- Iconos: lucide-react.
- PDFs: jsPDF.
- Build estatico pensado para Hostinger.

### Estructura relevante

- `src/main.jsx`: entrada de React.
- `src/App.jsx`: define rutas principales.
- `src/components/Layout.jsx`: sidebar, usuario actual, navegacion y cierre de sesion.
- `src/components/ProtectedRoute.jsx`: protege rutas por sesion y rol.
- `src/hooks/useAuth.js`: carga sesion de Supabase Auth y perfil desde tabla `usuario`.
- `src/lib/supabase.js`: cliente Supabase desde variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- `docs/database.txt`: esquema actual de tablas Supabase, usado como referencia.

### Rutas

- `/login`: inicio de sesion.
- `/dashboard`: panel de alertas y actividad reciente.
- `/catalogo`: busqueda y disponibilidad de libros.
- `/prestamos`: registro de prestamos e historial.
- `/devoluciones`: registro de devoluciones, multas y comprobante PDF.
- `/lectores`: listado, detalle y edicion de lectores.
- `/reportes`: reportes por periodo, solo administrador.
- `/gestion-catalogo`: gestion de titulos, ejemplares, establecimientos y configuracion de multas, solo administrador.

## Base de Datos

El esquema completo esta en `docs/database.txt`. No copiarlo aqui para evitar duplicidad.

Tablas principales:

- `usuario`: personal del sistema. Tiene `rol` (`ADMINISTRADOR`, `BIBLIOTECARIA`) y `activo`.
- `categoria`: clasificacion Dewey y bandera `permite_prestamo_formal`.
- `titulo`: obra bibliografica, con autor, ISBN, imagen y estado activo.
- `ejemplar`: copia fisica del titulo, con codigo inventario, ubicacion Dewey y estado.
- `lector`: persona que solicita prestamos formales.
- `prestamo`: registro central de prestamos formales e inmediatos.
- `multa`: cobros por retraso o dano al devolver.
- `configuracionmulta`: valores configurables de multa.
- `niveleducativo`: niveles educativos.
- `establecimiento`: centros educativos.
- `establecimiento_nivel`: relacion establecimiento-nivel.

Estados importantes:

- `ejemplar.estado`: `DISPONIBLE`, `PRESTADO`, `FUERA_DE_SERVICIO`.
- `prestamo.tipo`: `FORMAL`, `EXTERNO_INMEDIATO`.
- `prestamo.estado`: `ACTIVO`, `DEVUELTO`, `VENCIDO`.
- `multa.estado_libro`: `BUENO`, `DAÑADO_LEVE`, `DAÑADO_GRAVE`.

Nota: README menciona RLS habilitado, pero `docs/database.txt` solo incluye tablas y constraints; no contiene politicas RLS.

## Roles y Accesos

- `ADMINISTRADOR`: acceso completo, incluyendo reportes y gestion de catalogo.
- `BIBLIOTECARIA`: acceso a dashboard, catalogo, prestamos, devoluciones y lectores.
- Rutas admin se protegen con `ProtectedRoute soloAdmin`.
- La autenticacion usa Supabase Auth, pero el perfil funcional se obtiene desde la tabla `usuario` buscando por correo.

## Reglas de Negocio Conocidas

### Catalogo y ejemplares

- Un `titulo` representa la obra bibliografica.
- Un `ejemplar` representa una copia fisica.
- Solo titulos `activo = true` deben aparecer en busquedas operativas.
- Un ejemplar disponible puede prestarse.
- Al registrar un prestamo, el ejemplar pasa a `PRESTADO`.
- Al devolver en estado `BUENO`, el ejemplar vuelve a `DISPONIBLE`.
- Al devolver con `DAÑADO_LEVE`, el ejemplar vuelve a `DISPONIBLE` pero puede generar multa por dano.
- Al devolver con `DAÑADO_GRAVE`, el ejemplar pasa a `FUERA_DE_SERVICIO`.
- Los titulos pueden darse de baja con `activo = false`.
- Los establecimientos pueden darse de baja con `activo = false`.

### Prestamos

- Hay dos tipos:
  - `FORMAL`: asociado a un lector registrado, con fecha esperada de devolucion a 7 dias.
  - `EXTERNO_INMEDIATO`: asociado a nombre inmediato y opcional DPI de garantia; fecha esperada es el mismo dia.
- Para prestamo formal se exige nombre, telefono y direccion.
- Para mayores de edad se exige DPI.
- Para menores de edad se exige nombre y telefono del tutor.
- Solo categorias con `permite_prestamo_formal = true` permiten prestamo formal.
- Un lector existente no debe tener mas de un prestamo formal activo.
- En `Prestamos.jsx`, el flujo fue redisenado con:
  - pestanas internas `Registrar prestamo` y `Prestamos realizados`,
  - selector de tipo contraible,
  - pestanas Libro / Datos del lector,
  - resumen lateral,
  - busqueda tolerante a mayusculas/minusculas y tildes por titulo, autor, ISBN, categoria y codigo.

### Devoluciones

- La devolucion actualiza `prestamo.estado` a `DEVUELTO`, registra `fecha_devolucion_real` y, para inmediatos, `hora_regreso`.
- Permite elegir estado del libro: `BUENO`, `DAÑADO_LEVE`, `DAÑADO_GRAVE`.
- Calcula multa para prestamos formales con:
  - cargo base si hay retraso,
  - cargo por dia de retraso,
  - cargo por dano leve/grave.
- Correccion posterior: las devoluciones inmediatas tambien pueden generar multa por dano leve/grave, aunque no tengan multa por retraso.
- Si hay multa, inserta registro en `multa`.
- Genera comprobante PDF desde `Devoluciones.jsx`.
- El historial de devoluciones muestra monto de multa y estado del libro.
- Correccion posterior: el historial de devoluciones muestra `nombre_inmediato` cuando el prestamo no tiene lector formal.

### Dashboard / Alertas

- Muestra actividad reciente arriba con tarjetas tipo grafico:
  - prestamos registrados,
  - devoluciones realizadas,
  - multas generadas,
  - titulos sin disponibilidad.
- Periodos disponibles: dia, semana, mes.
- Las tarjetas navegan a modulos relacionados.
- Muestra prestamos formales por vencer en los proximos 7 dias y prestamos vencidos.
- Muestra prestamos inmediatos activos del dia, indicando el tipo de prestamo.
- El panel de prestamos en alerta usa pestanas `Todos`, `Inmediato` y `Formal` para filtrar en el mismo cuadro.
- Permite ver datos del lector en modal.
- Permite confirmar devolucion desde el dashboard.
- Al confirmar devolucion desde dashboard ahora pide estado del libro y muestra desglose de multa antes de guardar; en prestamos inmediatos puede aplicar multa por dano leve/grave.
- Para vencidos puede generar PDF de reporte de pago estimado.

### Multas

- Las multas se registran en tabla `multa` cuando el total es mayor a cero.
- `multa.id_prestamo` es unico.
- Dashboard usa `upsert` para evitar duplicados si ya existe multa para el prestamo.
- Devoluciones usa `insert`, por lo que podria fallar si se intenta registrar multa duplicada para el mismo prestamo.
- No existe una pestana dedicada exclusivamente a buscar/gestionar multas.
- Las multas pueden verse indirectamente en:
  - `Devoluciones.jsx`, historial de devoluciones;
  - `Reportes.jsx`, seccion "Multas en el periodo" para administradores;
  - Dashboard, actividad reciente y PDF de pago para vencidos.
- No hay flujo visible para marcar una multa como pagada.

### Lectores

- Pantalla redisenada con el mismo estilo visual del dashboard.
- Muestra una lista unificada de personas, aunque una misma persona tenga prestamos formales e inmediatos.
- Filtros disponibles: `Todos`, `Formales`, `Inmediatos`, `Ambos`.
- Los lectores formales salen de tabla `lector`; los inmediatos salen de `prestamo.nombre_inmediato` y `prestamo.dpi_garantia`.
- La union se hace principalmente por DPI; si no hay DPI, por nombre normalizado.
- El detalle muestra datos de la persona y un historial combinado de libros prestados.
- Solo las personas que existen en tabla `lector` pueden editar datos personales desde `Lectores.jsx`; los visitantes inmediatos se consultan, pero no se editan como lector porque no tienen fila propia en `lector`.
- La busqueda de lectores/visitantes tolera mayusculas/minusculas y tildes.

### Reportes

- Solo admin.
- Genera reporte por rango de fechas.
- Muestra prestamos del periodo, libros mas solicitados y multas del periodo.
- No genera PDF actualmente.

### Gestion de catalogo

- Solo admin.
- Gestiona titulos, ejemplares, establecimientos y configuracion de multas.
- Puede registrar multiples ejemplares.
- Puede autogenerar codigos `EJ-XXX`.
- Configura:
  - cargo base por vencimiento,
  - cargo por dia,
  - cargo por dano leve,
  - cargo por dano grave.

## Estado Actual del Proyecto

### Funciona actualmente

- Login con Supabase Auth y perfil por tabla `usuario`.
- Rutas protegidas por sesion y rol.
- Catalogo funcional con busqueda tolerante a tildes/mayusculas y botones para iniciar prestamos.
- Catalogo muestra disponibilidad por titulo y senala ejemplares `Prestado` y `Fuera de servicio`.
- Al cargar catalogo se ocultan titulos cuyos ejemplares estan todos fuera de servicio; si se busca por texto vuelven a aparecer, y tambien existe vista `Fuera de servicio` para consultarlos.
- Prestamos redisenado y funcional para formal/inmediato, con busqueda tolerante y flujo mas intuitivo.
- Lectores carga todos los registros y ordena por `id_lector DESC`.
- Dashboard redisenado con actividad, alertas, modal de lector, confirmacion de devolucion y PDF de pago para vencidos.
- Dashboard ahora incluye prestamos inmediatos activos en el panel de alertas, con etiqueta de tipo y confirmacion de devolucion con multa por dano.
- Devoluciones registra devolucion, calcula multas, actualiza ejemplar y genera comprobante PDF.
- Devoluciones ahora busca prestamos activos formales e inmediatos por lector, nombre inmediato, DPI, telefono, titulo, autor o codigo; ademas refleja correctamente nombre inmediato y estado de multa en historial.
- Reportes basicos por periodo.
- Gestion de catalogo funcional para catalogo, ejemplares, establecimientos y multas.
- `npm run build` pasa correctamente al 26/05/2026.

### Falta o podria mejorar

- Crear una vista dedicada de multas para buscar, filtrar, ver detalle y marcar como pagada.
- Extraer logica de multas a una utilidad compartida (`src/lib/multas.js`) para evitar duplicacion entre Dashboard y Devoluciones.
- Redisenar `Devoluciones.jsx`, `Lectores.jsx`, `Reportes.jsx`, `GestionCatalogo.jsx`, `Login.jsx` y `Layout.jsx` para unificar con el estilo nuevo.
- Normalizar busquedas de lectores y devoluciones para tolerar tildes/mayusculas, igual que Catalogo y Prestamos.
- Revisar manejo de fechas con zona horaria: se usa `toISOString().split('T')[0]`, lo cual puede tener efectos segun zona.
- Validar duplicados de DPI/lector si el negocio lo requiere; la DB no impone unique en DPI.
- Implementar flujo para marcar `prestamo.estado = VENCIDO` automaticamente o por job/proceso; actualmente dashboard trata como vencido si fecha esperada ya paso aunque estado siga ACTIVO.
- Mejorar control de errores de Supabase en varias consultas.
- Agregar tests o pruebas manuales documentadas.
- Evitar cargar todos los titulos/lectores en cliente si la base crece mucho; para este proyecto universitario es aceptable, pero no escala.

### Bugs/Riesgos relevantes conocidos

- `npm run lint` falla actualmente por:
  - `src/components/ui/button.jsx`: exporta `buttonVariants` junto al componente y viola regla Fast Refresh.
  - `src/pages/Devoluciones.jsx`: `useEffect` llama `cargarHistorial` antes de declarar la funcion segun reglas nuevas de React Hooks.
  - `src/pages/GestionCatalogo.jsx`: varios `useEffect` llaman funciones antes de declararlas; hay warning por dependencia de `generarCodigosAuto`; `abrirNuevoEstablecimiento` no se usa.
  - `src/pages/Login.jsx`: variable `err` no usada en catch.
  - `src/pages/Prestamos.jsx`: warnings de dependencias faltantes en `useEffect`.
  - `vite.config.js`: `__dirname` no definido segun eslint en proyecto ESM.
- `Devoluciones.jsx` busca por `ilike` y puede tener problemas similares a los ya corregidos en Catalogo/Prestamos para tildes.
- `Devoluciones.jsx` inserta multa con `insert`; si alguna ruta ya genero multa para el mismo prestamo, puede chocar con unique `id_prestamo`.
- No hay pantalla para gestionar cobros/multas pagadas.
- `@anthropic-ai/sdk` esta en dependencias pero no se observa uso en el frontend.
- README menciona `.env.example`, pero no se observo en la lista de archivos actual.

## Convenciones actuales de trabajo

- Usar alias `@/` para imports desde `src`.
- Mantener Supabase como fuente de datos.
- Preferir no romper estructura actual de tablas.
- Las mejoras recientes usan estilo inline con paleta clara, tarjetas blancas, bordes `#e2e8f0`, acentos azules/verdes/rojos/ambar y radios de 8px.
- Usar lucide-react para iconos cuando se agreguen botones o acciones.
- Antes de cerrar cambios importantes, correr:
  - `npm run build`
  - `npx eslint <archivo_modificado>` cuando aplique.

## Respuesta corta sobre multas

Actualmente no hay una pestana exclusiva de multas. Para consultarlas:

- Administrador: ir a `Reportes` y generar un rango de fechas; ahi aparece "Multas en el periodo".
- Cualquier usuario autorizado a devoluciones: ir a `Devoluciones`; el historial muestra multa por devolucion.
- Dashboard muestra conteo de multas recientes, pero no lista completa.

Recomendacion futura: crear modulo `Multas` o agregar pestana en `Devoluciones` para buscar por lector, libro, estado pagada/no pagada y rango de fechas.
