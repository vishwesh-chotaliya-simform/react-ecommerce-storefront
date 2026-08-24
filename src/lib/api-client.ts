import { ApiError, toApiError } from './api-error';

/**
 * In dev this is `/api` and Vite proxies it to the API, stripping the prefix — the backend
 * serves `/products`, not `/api/products`. For a deployed build set `VITE_API_URL` to the API
 * origin itself.
 */
const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '');

/** Values that can appear in a query string. Nullish entries are dropped, not sent as "". */
export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Serialised as JSON. Omit for requests without a body. */
  body?: unknown;
  searchParams?: QueryParams;
  signal?: AbortSignal;
  /** Set false for endpoints that must not carry credentials. Defaults to true. */
  auth?: boolean;
}

/** The envelope every endpoint returns, success or failure. */
interface ApiEnvelope<T> {
  success: boolean;
  message: string | Record<string, string>;
  data: T | null;
}

type TokenReader = () => string | null;
type UnauthorizedHandler = (error: ApiError) => void;

let readToken: TokenReader = () => null;
let handleUnauthorized: UnauthorizedHandler = () => {};

/**
 * Wire the client to the session.
 *
 * Kept as injection rather than an import so `api-client` stays free of feature imports — the
 * auth store imports the client, not the other way round.
 */
export function configureApiClient(config: {
  getToken?: TokenReader;
  onUnauthorized?: UnauthorizedHandler;
}): void {
  if (config.getToken) readToken = config.getToken;
  if (config.onUnauthorized) handleUnauthorized = config.onUnauthorized;
}

/**
 * Build a request path with every interpolated value percent-encoded.
 *
 * ```ts
 * apiPath`/products/${productId}/reviews`
 * ```
 *
 * Plain template strings silently let an id rewrite the request: an id containing `?` turns
 * the rest of the path into a query string, and `/` invents a route segment. Every endpoint
 * that takes an id in its path should build it through here.
 */
export function apiPath(segments: TemplateStringsArray, ...values: (string | number)[]): string {
  return segments.reduce((path, segment, index) => {
    const value = values[index];
    return path + segment + (value === undefined ? '' : encodeURIComponent(String(value)));
  }, '');
}

function buildUrl(path: string, searchParams?: QueryParams): string {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!searchParams) return url;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === null || value === undefined || value === '') continue;
    query.set(key, String(value));
  }

  const queryString = query.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * "No body at all" and "a body we could not read" are different failures, and conflating them
 * is how an unreadable 200 ends up looking like a successful empty response.
 */
type EnvelopeResult<T> =
  { kind: 'empty' } | { kind: 'json'; envelope: ApiEnvelope<T> } | { kind: 'unreadable' };

async function readEnvelope<T>(response: Response): Promise<EnvelopeResult<T>> {
  if (response.status === 204) return { kind: 'empty' };

  const text = await response.text();
  if (!text) return { kind: 'empty' };

  try {
    return { kind: 'json', envelope: JSON.parse(text) as ApiEnvelope<T> };
  } catch {
    // A non-JSON body means something upstream of the API answered — a dead proxy, an HTML
    // error page. Surface it as a transport failure rather than pretending it parsed.
    return { kind: 'unreadable' };
  }
}

/**
 * Perform a request and return the unwrapped `data` payload.
 *
 * Callers never see the envelope. If you find yourself reaching for `.data.data`, this client
 * is being bypassed.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, searchParams, signal, auth = true } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = readToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  if (signal) init.signal = signal;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, searchParams), init);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError(0, 'Could not reach the server. Is the API running on port 3000?');
  }

  const result = await readEnvelope<T>(response);
  const envelope = result.kind === 'json' ? result.envelope : null;

  if (!response.ok || envelope?.success === false) {
    const error = toApiError(response.status, envelope?.message);

    // `tokenVersion` is checked on every request and bumped by sign-out, password change, and
    // password reset — so a 401 can land on any call at any time, not just at sign-in.
    // One handler clears the session and redirects; callers do not each repeat that.
    if (error.isUnauthorized) handleUnauthorized(error);

    throw error;
  }

  if (result.kind === 'unreadable') {
    // A 2xx we cannot parse is still a failure. Returning `undefined` here used to let
    // TanStack Query raise its own "data is undefined" error, which put the raw query key on
    // screen in front of the user.
    throw new ApiError(
      response.status,
      'The server sent a response this app could not read. It may be misconfigured.',
    );
  }

  if (result.kind === 'empty') {
    // 204 or an empty body: nothing to unwrap. Endpoints typed as `void` land here.
    return undefined as T;
  }

  // Several endpoints (`POST /cart`, `PATCH /cart/:productId`) succeed with `data: null` and
  // expect a refetch. `null` is the honest value to hand back.
  return result.envelope.data as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
