/**
 * This file documents the plain-object shapes used by the SDK.
 *
 * The runtime package intentionally stays dependency-free and does not require
 * TypeScript. These typedefs make editor IntelliSense useful in JavaScript
 * projects that read JSDoc from ESM packages.
 */

/**
 * @typedef {Object<string, unknown>} JSONMap
 */

/**
 * @typedef {Object} ClientConfig
 * @property {string} [apiKey]
 * @property {string} [baseURL]
 * @property {string} [modelBaseURL]
 * @property {string} [llmBaseURL]
 * @property {string} [passthroughBaseURL]
 * @property {string} [project]
 * @property {number} [timeout] Timeout in milliseconds.
 * @property {typeof fetch} [fetch] Custom fetch implementation.
 */

/**
 * @typedef {Object} StreamEvent
 * @property {string} event
 * @property {string|undefined} data
 * @property {boolean} done
 */

/**
 * @typedef {Object} PassthroughResponse
 * @property {number} statusCode
 * @property {Headers} headers
 * @property {Uint8Array} body
 * @property {() => string} text
 * @property {() => unknown} json
 */

export {};
