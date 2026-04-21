import { env } from "@crikket/env/web"
import { polarClient } from "@polar-sh/better-auth"
import type { BetterAuthClientOptions } from "better-auth/client"
import {
  adminClient,
  emailOTPClient,
  organizationClient,
} from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

const adminPlugin = adminClient()
const emailOtpPlugin = emailOTPClient()
const organizationPlugin = organizationClient()
const polarPlugin: ReturnType<typeof polarClient> = polarClient()

type AuthClientOptions = {
  baseURL: string
  plugins: [
    typeof adminPlugin,
    typeof emailOtpPlugin,
    typeof organizationPlugin,
    typeof polarPlugin,
  ]
}

type AuthClient<Option extends BetterAuthClientOptions> = ReturnType<
  typeof createAuthClient<Option>
>

// SSR forwards the incoming request headers (set via fetchOptions.headers) to
// the auth API. Those headers include Host: <app-origin>, and when the app
// and the API are on different subdomains behind the same nginx, the Host
// override causes nginx to route the outbound fetch to the wrong vhost,
// returning 404. Scrub hop-by-hop/host headers from every outgoing auth fetch.
const HEADER_BLOCKLIST = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "keep-alive",
  "upgrade",
  "proxy-authorization",
  "te",
  "trailer",
])

export const authClient: AuthClient<AuthClientOptions> = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  fetchOptions: {
    onRequest(context) {
      const h = (context as { headers?: Headers }).headers
      if (!h) return
      for (const name of HEADER_BLOCKLIST) {
        h.delete(name)
      }
    },
  },
  plugins: [adminPlugin, emailOtpPlugin, organizationPlugin, polarPlugin],
})
