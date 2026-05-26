# Registro del Proyecto

Fecha: 26/05/2026
Autor: Codex
Mensaje: Proyecto iniciado tras analisis completo. A partir de aqui se continua el desarrollo.

Fecha: 26/05/2026
Autor: Codex
Mensaje: Correccion en devoluciones: busqueda ampliada para prestamos formales e inmediatos, multas por dano en prestamos inmediatos, nombre inmediato en historial y estado de libro/multa reflejado correctamente.

Fecha: 26/05/2026
Autor: Codex
Mensaje: Dashboard actualizado para mostrar prestamos inmediatos activos en alertas, indicar el tipo de prestamo y permitir devolucion con multa por dano.

Fecha: 26/05/2026
Autor: Codex
Mensaje: Panel de alertas reorganizado con pestanas Todos/Inmediato/Formal. Catalogo ahora muestra ejemplares prestados y fuera de servicio; devoluciones validan errores de Supabase antes de confirmar exito.

Fecha: 26/05/2026
Autor: Codex
Mensaje: Regla de dano ajustada: solo dano grave marca ejemplar fuera de servicio; dano leve genera multa pero devuelve disponibilidad. Catalogo oculta fuera de servicio al cargar, permite buscarlos por texto y agrega vista dedicada.

Fecha: 26/05/2026
Autor: Codex
Mensaje: Lectores ahora separa lectores formales y visitantes de prestamos inmediatos. Los visitantes se consultan desde prestamos inmediatos agrupados por nombre y DPI de garantia, con historial propio.

Fecha: 26/05/2026
Autor: Codex
Mensaje: Lectores redisenado como lista unificada de personas con filtros Todos/Formales/Inmediatos/Ambos. El detalle muestra historial combinado de libros prestados; la edicion queda solo para registros formales de la tabla lector.

Fecha: 26/05/2026
Autor: Codex
Mensaje: Prestamos reorganizado con pestanas internas para separar registro de prestamo y consulta de prestamos realizados, evitando tener que bajar hasta el historial.

Fecha: 26/05/2026
Autor: Codex
Archivo modificado: src/components/BookCover.jsx, src/pages/Catalogo.jsx
Descripcion: Se agrego una portada generada por codigo Dewey para libros sin imagen o con imagen rota; el catalogo mantiene imagen real cuando carga correctamente.
Estado: probado en local con eslint enfocado y npm run build.

Fecha: 26/05/2026
Autor: Codex
Archivo modificado: src/pages/Devoluciones.jsx
Descripcion: Se rediseno la pantalla de devoluciones con el estilo visual actual, filtros Todas/Formales/Inmediatas para busqueda e historial, y modal para consultar informacion relevante del usuario.
Estado: probado en local con eslint enfocado y npm run build.

Fecha: 26/05/2026
Autor: Codex
Archivo modificado: src/pages/Devoluciones.jsx, src/pages/Dashboard.jsx, src/pages/Lectores.jsx
Descripcion: Se consolido Lectores como vista oficial para datos de usuario; Devoluciones elimino el modal de usuario, cambio texto a Buscar prestamo e integro una vista de Multas. Dashboard ahora dirige usuarios a Lectores, enlaza Multas a Devoluciones y elimina Titulos sin disponibilidad.
Estado: probado en local con eslint enfocado y npm run build.
