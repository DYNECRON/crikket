import type { AppRouterClient } from "@crikket/api/routers/index"

import { env } from "@crikket/env/web"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"
import { QueryCache, QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: query.invalidate,
        },
      })
    },
  }),
})

// Strip Host + hop-by-hop headers before forwarding Next.js request headers to
// the oRPC API. When app and API live on different subdomains behind one nginx,
// leaking Host routes the outbound fetch to the wrong vhost (returns 404).
const SSR_HEADER_BLOCKLIST = new Set([
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

export const link = new RPCLink({
  url: `${env.NEXT_PUBLIC_SERVER_URL}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    })
  },
  headers: async () => {
    if (typeof window !== "undefined") {
      return {}
    }

    const { headers } = await import("next/headers")
    const requestHeaders = await headers()
    const forwarded: Record<string, string> = {}
    for (const [name, value] of requestHeaders.entries()) {
      if (!SSR_HEADER_BLOCKLIST.has(name.toLowerCase())) {
        forwarded[name] = value
      }
    }
    return forwarded
  },
})

export const client: AppRouterClient = createORPCClient(link)

export const orpc = createTanstackQueryUtils(client)
