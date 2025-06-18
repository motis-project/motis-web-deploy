import type { Handle } from '@sveltejs/kit';

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