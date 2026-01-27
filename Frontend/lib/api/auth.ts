/**
 * API Key Utility for Backend Requests
 * Gets the API key to send to the backend
 * The backend (NestJS) will validate this API key
 */

/**
 * Get API key for backend requests
 * This is the key we send to the backend (backend will validate it)
 * Set BACKEND_API_KEY in .env.local (server-side only)
 */
export function getBackendApiKey(): string | undefined {
  return process.env.BACKEND_API_KEY || undefined
}
