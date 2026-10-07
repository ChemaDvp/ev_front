# ev_front

Frontend mobile-first para la gestión de eventos de Eventos Vidal.

## Ejecutar en local

1. En Supabase, abre **Connect** y copia el **Project URL** y la **Publishable key** del proyecto. La clave publicable empieza normalmente por `sb_publishable_`; en proyectos anteriores puede aparecer como `anon`. Nunca uses la clave `secret` ni `service_role` en el navegador.
2. En la raíz del repositorio, crea `.env.local` copiando `.env.example` y reemplaza los valores:

   ```env
   VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
   ```

   `.env.local` está excluido de Git. No pegues esas claves en issues, chats ni commits.
3. Instala dependencias y arranca el servidor:

   ```sh
   npm install
   npm run dev
   ```

4. Abre la dirección local que indique Vite, normalmente `http://localhost:5173`, e inicia sesión con el usuario administrador creado en Supabase Auth.

La aplicación usa `HashRouter` y rutas de assets relativas para GitHub Pages.

## Funcionalidades disponibles

- Autenticación con Supabase; el selector de administrador/trabajador comprueba el rol de perfil y no suplanta identidades.
- Los trabajadores con sesión pueden consultar la lista completa de eventos y sus detalles, independientemente de las asignaciones.
- Creación, edición y eliminación de eventos con trabajadores, material, decoración y notas.
- Gestión de trabajadores y asignación N:M a eventos por parte del administrador.
- Stock permanece oculto de la navegación y deshabilitado como módulo futuro.

Al editar un evento, las asignaciones y elementos se guardan en una transacción PostgreSQL mediante una función RPC. Como el esquema inicial ya está aplicado en tu proyecto, ejecuta también [`supabase/migrations/20261007000000_save_event_rpc.sql`](supabase/migrations/20261007000000_save_event_rpc.sql) en SQL Editor antes de usar los formularios.

Para actualizar el acceso de los trabajadores en el proyecto existente, ejecuta [`supabase/migrations/20261007010000_workers_read_all_events.sql`](supabase/migrations/20261007010000_workers_read_all_events.sql) en SQL Editor. Esto deja que todo perfil `worker` autenticado lea todos los eventos y detalles; las asignaciones solo identifican qué trabajadores organiza el administrador para cada evento. La migración conserva los datos existentes de contacto, pero los trabajadores solo pueden leer los nombres del equipo.

### Despliegue en GitHub Pages

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) compila y publica al hacer push a `main`. En **Settings → Secrets and variables → Actions → Variables**, crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Después, activa **Settings → Pages → Build and deployment → Source: GitHub Actions**. En la primera publicación configura también la URL de Pages en la allowlist de Supabase.

## Esquema de Supabase

Ejecuta [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor de Supabase. El esquema crea perfiles vinculados a Supabase Auth, eventos, trabajadores, asignaciones N:M, material/decoración por evento y la tabla de stock preparada para una futura activación.

Las cuentas nuevas reciben el rol `worker` por defecto. Después de registrar la cuenta propietaria, promuévela a administradora ejecutando el `UPDATE` comentado al final del script con su correo real. No permitas que el cliente cree o cambie roles: el rol debe administrarse desde un entorno confiable.

Los trabajadores necesitan iniciar sesión con una cuenta de Supabase Auth cuyo perfil tenga el rol `worker`. El registro de equipo que crea el administrador es para organizar las asignaciones; no crea credenciales de inicio de sesión. Crea las cuentas de acceso desde **Authentication → Users** y mantén desactivados los registros públicos: cada cuenta nueva recibe el rol `worker` y puede consultar todos los eventos, nombres de trabajadores asignados, material y decoración. Solo el administrador puede crear/editar eventos, gestionar trabajadores o asignaciones.

## Estructura React propuesta

```text
src/
├── components/
│   ├── BottomNavigation.jsx
│   ├── PermissionDenied.jsx
│   └── ProtectedRoute.jsx
├── context/
│   └── AuthContext.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── EventsPage.jsx
│   ├── EventDetailPage.jsx
│   ├── EventFormPage.jsx
│   ├── WorkersPage.jsx
│   └── StockPage.jsx
├── services/
│   ├── supabaseClient.js
│   ├── eventsService.js
│   └── workersService.js
├── App.jsx
└── main.jsx
supabase/
├── migrations/
│   ├── 20261007000000_save_event_rpc.sql
│   └── 20261007010000_workers_read_all_events.sql
└── schema.sql
```

Las rutas `/events/new`, `/events/:id/edit`, `/workers` y `/stock` están protegidas para administradores; un trabajador que acceda directamente recibe `No tienes permiso para poder visualizar esta información`. Stock no aparece en la navegación.
