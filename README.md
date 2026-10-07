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
- Lista y detalle de eventos; la lectura queda limitada por las políticas RLS.
- Creación, edición y eliminación de eventos con trabajadores, material, decoración y notas.
- Gestión de trabajadores y flujo de invitación segura por correo.
- Stock permanece oculto de la navegación y deshabilitado como módulo futuro.

Al editar un evento, las asignaciones y elementos se guardan en una transacción PostgreSQL mediante una función RPC. Como el esquema inicial ya está aplicado en tu proyecto, ejecuta también [`supabase/migrations/20261007000000_save_event_rpc.sql`](supabase/migrations/20261007000000_save_event_rpc.sql) en SQL Editor antes de usar los formularios.

### Invitaciones de trabajadores

La clave `service_role` nunca se expone al navegador. La invitación usa la función Edge `invite-worker`, que verifica el JWT y el rol admin antes de crear una cuenta Auth y vincularla al trabajador.

1. Instala Supabase CLI y vincula el proyecto (`supabase login` y `supabase link --project-ref TU_PROJECT_REF`).
2. Despliega desde la raíz del repositorio: `supabase functions deploy invite-worker`.
3. En Supabase, configura **Authentication → URL Configuration** con la URL local `http://localhost:5173/` y la URL GitHub Pages como Redirect URL permitida. En producción la función puede configurarse con `supabase secrets set INVITE_REDIRECT_URL=https://USUARIO.github.io/REPOSITORIO/`.
4. En **Authentication → SMTP Settings**, configura SMTP propio antes de enviar invitaciones a usuarios reales; el servicio de correo por defecto de Supabase es limitado para pruebas.

Las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las proporciona el runtime de Supabase Edge Functions. No las copies a `.env.local` ni a GitHub.

### Despliegue en GitHub Pages

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) compila y publica al hacer push a `main`. En **Settings → Secrets and variables → Actions → Variables**, crea `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Después, activa **Settings → Pages → Build and deployment → Source: GitHub Actions**. En la primera publicación configura también la URL de Pages en la allowlist de Supabase.

## Esquema de Supabase

Ejecuta [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor de Supabase. El esquema crea perfiles vinculados a Supabase Auth, eventos, trabajadores, asignaciones N:M, material/decoración por evento y la tabla de stock preparada para una futura activación.

Las cuentas nuevas reciben el rol `worker` por defecto. Después de registrar la cuenta propietaria, promuévela a administradora ejecutando el `UPDATE` comentado al final del script con su correo real. No permitas que el cliente cree o cambie roles: el rol debe administrarse desde un entorno confiable.

El acceso de trabajador requiere una cuenta autenticada asociada al trabajador mediante `workers.user_id`; solo podrá leer los eventos a los que esté asignado. La navegación del frontend oculta las pantallas de administración, pero RLS aplica también la autorización en la base de datos.

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
├── functions/invite-worker/index.ts
├── migrations/20261007000000_save_event_rpc.sql
└── schema.sql
```

Las rutas `/events/new`, `/events/:id/edit`, `/workers` y `/stock` están protegidas para administradores; un trabajador que acceda directamente recibe `No tienes permiso para poder visualizar esta información`. Stock no aparece en la navegación.
