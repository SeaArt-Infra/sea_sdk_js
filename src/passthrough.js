import { ErrGeneral, SeaArtError } from './errors.js';
import { buildRequestOptions } from './options.js';

export class PassthroughService {
  constructor(client) {
    this.client = client;
  }

  async request(method, path, body, ...options) {
    let payload;
    if (body !== undefined && body !== null) {
      try {
        payload = new TextEncoder().encode(JSON.stringify(body));
      } catch (error) {
        throw new SeaArtError({ kind: ErrGeneral, message: `failed to marshal request: ${error.message}` });
      }
    }
    return this.requestRaw(method, path, payload, ...options);
  }

  async requestRaw(method, path, body, ...options) {
    const normalizedPath = normalizePassthroughPath(path);
    const { headers, signal } = splitOptions(options);
    const response = await this.client.requestRaw(method, normalizedPath, body, headers, { signal });
    return {
      statusCode: response.status,
      StatusCode: response.status,
      headers: response.headers,
      Headers: response.headers,
      body: response.body,
      Body: response.body,
      text: () => new TextDecoder().decode(response.body),
      json: () => JSON.parse(new TextDecoder().decode(response.body)),
    };
  }

  get(path, ...options) {
    return this.requestRaw('GET', path, undefined, ...options);
  }

  post(path, body, ...options) {
    return this.request('POST', path, body, ...options);
  }

  put(path, body, ...options) {
    return this.request('PUT', path, body, ...options);
  }

  delete(path, body, ...options) {
    return this.request('DELETE', path, body, ...options);
  }
}

export function normalizePassthroughPath(raw) {
  let path = String(raw ?? '').trim();
  if (!path) {
    throw new SeaArtError({ kind: ErrGeneral, message: 'passthrough path is required' });
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    throw new SeaArtError({ kind: ErrGeneral, message: 'passthrough path must be relative' });
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return path;
}

function splitOptions(options) {
  const requestOptions = buildRequestOptions(options);
  const signalOption = options.find((option) => option?.signal);
  return { headers: requestOptions.headers, signal: signalOption?.signal };
}
