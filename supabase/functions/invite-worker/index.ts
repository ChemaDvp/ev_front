import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return json({ error: 'Método no permitido.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Falta configuración interna de Supabase.' }, 500);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Sesión requerida.' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'Sesión no válida.' }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return json({ error: 'No se pudo verificar el rol.' }, 500);
  if (profile?.role !== 'admin') return json({ error: 'Solo un administrador puede invitar trabajadores.' }, 403);

  let body: { workerId?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Solicitud JSON no válida.' }, 400);
  }
  if (!body.workerId || !/^[0-9a-f-]{36}$/i.test(body.workerId)) {
    return json({ error: 'Identificador de trabajador no válido.' }, 400);
  }

  const { data: worker, error: workerError } = await adminClient
    .from('workers')
    .select('id, user_id, name, email')
    .eq('id', body.workerId)
    .maybeSingle();
  if (workerError) return json({ error: 'No se pudo cargar el trabajador.' }, 500);
  if (!worker) return json({ error: 'Trabajador no encontrado.' }, 404);
  if (!worker.email) return json({ error: 'Añade un correo al trabajador antes de invitarlo.' }, 400);
  if (worker.user_id) return json({ error: 'Este trabajador ya tiene una cuenta vinculada.' }, 409);

  const redirectTo = Deno.env.get('INVITE_REDIRECT_URL');
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    worker.email,
    {
      data: { display_name: worker.name },
      ...(redirectTo ? { redirectTo } : {}),
    },
  );
  if (inviteError) return json({ error: `No se pudo enviar la invitación: ${inviteError.message}` }, 400);
  if (!invited.user) return json({ error: 'Supabase no devolvió el usuario invitado.' }, 500);

  const { error: linkError } = await adminClient
    .from('workers')
    .update({ user_id: invited.user.id })
    .eq('id', worker.id);
  if (linkError) {
    return json({
      error: `La invitación fue creada, pero no se pudo vincular el trabajador. Revisa el usuario ${invited.user.id}: ${linkError.message}`,
    }, 500);
  }
  const { error: profileUpdateError } = await adminClient
    .from('profiles')
    .update({ role: 'worker', display_name: worker.name })
    .eq('id', invited.user.id);
  if (profileUpdateError) {
    return json({ error: `La invitación se envió y se vinculó, pero no se pudo actualizar el perfil: ${profileUpdateError.message}` }, 500);
  }

  return json({ invited: true });
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
