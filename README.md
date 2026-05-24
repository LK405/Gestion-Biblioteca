# Sistema de Gestión de Préstamos — Biblioteca Municipal

Sistema web para la gestión digital de préstamos de libros en bibliotecas municipales.
Desarrollado como proyecto universitario para el curso de Análisis de Sistemas 1,
Universidad Mariano Gálvez de Guatemala.

---

## Tecnologías

- **Frontend:** React 19 + Vite 8
- **UI:** shadcn/ui (Radix + preset Nova) + Tailwind CSS v4
- **Routing:** React Router DOM v7
- **Backend / Base de datos:** Supabase (PostgreSQL + Auth + RLS)
- **PDF:** jsPDF
- **Hosting:** Hostinger (build estático)
- **Control de versiones:** GitHub

---

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18.x (probado en 22.22.0) |
| npm | 9.x (probado en 11.11.0) |
| Git | 2.x |

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxx
```

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto en Supabase. Se obtiene en Project Settings → Data API → API URL |
| `VITE_SUPABASE_ANON_KEY` | Clave pública del proyecto. Se obtiene en Project Settings → API Keys → Publishable key |

> El archivo `.env` nunca debe subirse a GitHub. Ya está incluido en `.gitignore`.
> Usa `.env.example` como plantilla (incluido en el repositorio).

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/usuario/repositorio.git
cd biblioteca

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de entorno
cp .env.example .env
# Editar .env con las credenciales reales de Supabase

# 4. Correr en desarrollo
npm run dev
```

El proyecto quedará disponible en `http://localhost:5173`

---

## Comandos disponibles

```bash
npm run dev       # Servidor de desarrollo con hot reload
npm run build     # Build de producción (genera carpeta /dist)
npm run preview   # Vista previa del build de producción
npm run lint      # Verificación de código con ESLint
```

---

## Dependencias

### Producción

| Paquete | Versión | Uso |
|---|---|---|
| `react` | ^19.2.4 | Librería principal de UI |
| `react-dom` | ^19.2.4 | Renderizado en el DOM |
| `react-router-dom` | ^7.14.1 | Navegación entre páginas |
| `@supabase/supabase-js` | ^2.103.0 | Cliente de Supabase (DB + Auth) |
| `tailwindcss` | ^4.2.2 | Estilos utilitarios |
| `@tailwindcss/vite` | ^4.2.2 | Plugin de Tailwind para Vite |
| `shadcn` | ^4.2.0 | Componentes de UI |
| `radix-ui` | ^1.4.3 | Primitivos de UI accesibles |
| `lucide-react` | ^1.8.0 | Íconos |
| `jspdf` | ^4.2.1 | Generación de PDF en el frontend |
| `class-variance-authority` | ^0.7.1 | Variantes de clases CSS |
| `clsx` | ^2.1.1 | Utilidad para combinar clases |
| `tailwind-merge` | ^3.5.0 | Merge inteligente de clases Tailwind |
| `tw-animate-css` | ^1.4.0 | Animaciones CSS para Tailwind |
| `@fontsource-variable/geist` | ^5.2.8 | Fuente Geist variable |

### Desarrollo

| Paquete | Versión | Uso |
|---|---|---|
| `vite` | ^8.0.4 | Bundler y servidor de desarrollo |
| `@vitejs/plugin-react` | ^6.0.1 | Plugin de React para Vite |
| `eslint` | ^9.39.4 | Linter de código |
| `eslint-plugin-react-hooks` | ^7.0.1 | Reglas de ESLint para hooks |
| `eslint-plugin-react-refresh` | ^0.5.2 | Soporte de fast refresh en ESLint |
| `@eslint/js` | ^9.39.4 | Configuración base de ESLint |
| `@types/react` | ^19.2.14 | Tipos de React |
| `@types/react-dom` | ^19.2.3 | Tipos de React DOM |
| `globals` | ^17.4.0 | Variables globales para ESLint |

---

## Estructura de carpetas
biblioteca/
├── .env                          # Credenciales Supabase (no subir a GitHub)
├── .env.example                  # Plantilla de variables de entorno
├── .gitignore
├── index.html
├── jsconfig.json                 # Alias de importación (@/*)
├── vite.config.js                # Configuración de Vite + Tailwind + alias
├── components.json               # Configuración de shadcn/ui
├── package.json
└── src/
├── main.jsx                  # Punto de entrada
├── App.jsx                   # Rutas principales con React Router
├── index.css                 # Importación de Tailwind
├── lib/
│   ├── supabase.js           # Cliente de Supabase
│   └── utils.js              # Utilidades de shadcn/ui
├── hooks/
│   ├── useAuth.js            # Sesión, rol, login, logout
│   └── useAlertas.js         # (reservado para alertas globales)
├── components/
│   ├── Layout.jsx            # Sidebar + navegación principal
│   ├── ProtectedRoute.jsx    # Protección de rutas por sesión y rol
│   └── ui/                   # Componentes generados por shadcn/ui
└── pages/
├── Login.jsx             # Pantalla de autenticación
├── Dashboard.jsx         # Panel de alertas + actividad reciente
├── Catalogo.jsx          # Búsqueda de libros + disponibilidad en cards
├── Prestamos.jsx         # Registro de préstamos + historial
├── Devoluciones.jsx      # Registro de devoluciones + historial + PDF
├── Lectores.jsx          # Lista de lectores + detalle + edición
├── Reportes.jsx          # Reportes por período (solo Administrador)
└── GestionCatalogo.jsx   # CRUD de títulos, ejemplares,
# establecimientos y config de multas
# (solo Administrador)

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