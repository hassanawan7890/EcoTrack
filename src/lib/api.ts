async function apiFetch(path: string, init?: RequestInit) {
  const isJson = !(init?.body instanceof FormData)
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(isJson && init?.body != null ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
  return data
}

export const api = {
  get:    (path: string) => apiFetch(path),
  post:   (path: string, body?: unknown) => apiFetch(path, { method: 'POST',   body: body != null ? JSON.stringify(body) : undefined }),
  patch:  (path: string, body?: unknown) => apiFetch(path, { method: 'PATCH',  body: body != null ? JSON.stringify(body) : undefined }),
  delete: (path: string) => apiFetch(path, { method: 'DELETE' }),
}
