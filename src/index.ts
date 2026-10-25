import buildinfo from './buildinfo.json'

interface Env {
  DB: D1Database
  LICENSE_KEY?: string
  ADMIN_TOKEN?: string
}

// Reports what the build step saw and what the runtime has. Never returns secret values.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname
    if (path === '/buildinfo') {
      return Response.json({
        build: buildinfo,
        runtime: { LICENSE_KEY_set: Boolean(env.LICENSE_KEY), ADMIN_TOKEN_set: Boolean(env.ADMIN_TOKEN) },
      })
    }
    if (path === '/db') return Response.json(await env.DB.prepare('SELECT id, note FROM probe').all())
    return new Response('formgate deploy-button experiment: see /buildinfo and /db\n')
  },
}
