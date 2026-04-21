type HeadersLike = {
  get: (name: string) => string | null
}

// Only forward cookie/authorization when calling the auth API from SSR.
// Passing the full Next.js request headers leaks the incoming Host
// (crikket.dynecron.com) to the fetch — nginx then routes the request to
// the web server block instead of the api server block, returning 404.
export function forwardAuthHeaders(headers: HeadersLike): Headers {
  const forwarded = new Headers()
  const cookie = headers.get("cookie")
  const authorization = headers.get("authorization")
  if (cookie) forwarded.set("cookie", cookie)
  if (authorization) forwarded.set("authorization", authorization)
  return forwarded
}
