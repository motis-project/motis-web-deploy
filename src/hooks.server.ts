import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { startInstance } from '$lib/instances';
import fs from 'fs/promises';

(async () => {
  try {
    if (!env.INSTANCE_FOLDER) {
      throw new Error('INSTANCE_FOLDER environment variable is not set.');
    }
    const entries = await fs.readdir(env.INSTANCE_FOLDER, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
        await startInstance(Number(entry.name));
      }
    }
  } catch (err) {
    console.error('Error reading INSTANCE_FOLDER:', err);
  }
})();

export const handle: Handle = async ({ event, resolve }) => {
  const regex = /^\/instances\/(\d+)\/(.*)$/;
  const match = event.url.pathname.match(regex);

  if (match) {
    const port = match[1];
    const path = match[2];
    const targetUrl = `http://localhost:${port}/${path}${event.url.search}`;
    console.log(`Proxying request to: ${targetUrl}`);

    // Prepare headers, but remove 'host' to avoid issues
    const headers = new Headers(event.request.headers);
    headers.delete('host');

    // Forward the request method, headers, and body
    const response = await fetch(targetUrl, {
      method: event.request.method,
      headers,
      body: event.request.body,
      redirect: 'manual'
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');

    // Return the proxied response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  }

  return await resolve(event);
};