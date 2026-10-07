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

4. Abre la dirección local que indique Vite, normalmente `http://localhost:5173`. Entra como administrador o pulsa **Entrar como invitado** para ver eventos sin credenciales.

La aplicación usa `HashRouter` y rutas de assets relativas para GitHub Pages.

## Funcionalidades disponibles

- Autenticación de administrador con Supabase.
- El administrador inicia sesión con correo y contraseña; el botón **Entrar como invitado** permite consultar la lista completa y el detalle sin credenciales.
- Creación, edición y eliminación de eventos con trabajadores, material, decoración y notas.
- Gestión de trabajadores y asignación N:M a eventos por parte del administrador.
- Stock permanece oculto de la navegación y deshabilitado como módulo futuro.

Al editar un evento, las asignaciones y elementos se guardan en una transacción PostgreSQL mediante una función RPC. Como el esquema inicial ya está aplicado en tu proyecto, ejecuta también [`supabase/migrations/20261007000000_save_event_rpc.sql`](supabase/migrations/20261007000000_save_event_rpc.sql) en SQL Editor antes de usar los formularios.

Para habilitar el acceso de invitado sin autenticación en el proyecto existente, ejecuta [`supabase/migrations/20261007020000_guest_read_only_access.sql`](supabase/migrations/20261007020000_guest_read_only_access.sql) en SQL Editor. Este acceso es público: cualquier persona que tenga la URL de la app puede leer los eventos y sus notas, el material/decoración y los nombres asignados. Las políticas y permisos SQL limitan al invitado a lectura; no puede crear ni editar datos. No incluyas notas privadas en los eventos.

### Despliegue en GitHub Pages

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) compila y publica al hacer push a `main`. En **Settings → Secrets and variables → Actions → Variables** del repositorio (no en los ajustes de un Environment), crea exactamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Después, activa **Settings → Pages → Build and deployment → Source: GitHub Actions**. En la primera publicación configura también la URL de Pages en la allowlist de Supabase. El workflow verifica que las dos variables existan antes de compilar, para no publicar una página sin conexión.

## Esquema de Supabase

Ejecuta [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor de Supabase. El esquema crea perfiles vinculados a Supabase Auth, eventos, trabajadores, asignaciones N:M, material/decoración por evento y la tabla de stock preparada para una futura activación.

El perfil del administrador debe tener rol `admin`; promueve la cuenta propietaria ejecutando el `UPDATE` comentado al final del script con su correo real. El alta de trabajadores en la app solo crea nombres para las asignaciones y no crea cuentas Auth.

El acceso de invitados no usa una cuenta de Auth ni crea una sesión: navega como rol `anon` y solo puede leer los campos permitidos por RLS. El equipo que crea el administrador solo organiza las asignaciones a eventos. El login con correo y contraseña queda reservado al administrador.

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
│   └── 20261007020000_guest_read_only_access.sql
└── schema.sql
```

Las rutas `/events/new`, `/events/:id/edit`, `/workers` y `/stock` están protegidas para administradores; un invitado que acceda directamente recibe `No tienes permiso para poder visualizar esta información`. Stock no aparece en la navegación.
