---

## Base de datos

El proyecto usa PostgreSQL a través de Supabase con 11 tablas:

| Tabla | Descripción |
|---|---|
| `usuario` | Personal del sistema (Administrador / Bibliotecaria) |
| `categoria` | Clasificación Dewey con flag de préstamo formal |
| `titulo` | Obra bibliográfica (el libro como concepto) |
| `ejemplar` | Copia física de un título con estado de disponibilidad |
| `lector` | Datos de quien solicita el préstamo |
| `prestamo` | Registro central de préstamos (formal e inmediato) |
| `multa` | Multas generadas por retraso o daño al devolver |
| `configuracionmulta` | Valores configurables de multa (singleton) |
| `niveleducativo` | Niveles educativos del sistema guatemalteco |
| `establecimiento` | Centros educativos asociados a lectores |
| `establecimiento_nivel` | Relación muchos a muchos entre establecimiento y nivel |

Row Level Security (RLS) habilitado en todas las tablas.
Solo usuarios autenticados tienen acceso.

---

## Roles del sistema

| Rol | Acceso |
|---|---|
| `ADMINISTRADOR` | Todas las funciones incluyendo Reportes y Gestión de catálogo |
| `BIBLIOTECARIA` | Dashboard, Catálogo, Préstamos, Devoluciones y Lectores |

Los lectores **no acceden al sistema**. Sus datos los registra la bibliotecaria.

---

## Despliegue en Hostinger

```bash
# Generar build de producción
npm run build

# Subir contenido de /dist a public_html en Hostinger
# vía File Manager del panel o por FTP
```

---

## Equipo

Proyecto universitario — Universidad Mariano Gálvez de Guatemala
Curso: Análisis de Sistemas 1 — 7mo semestre
Metodología: Cascada (Waterfall)
