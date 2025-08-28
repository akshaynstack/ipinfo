import { Hono } from 'hono';

export const docs = new Hono();

// Minimal OpenAPI 3.0 spec describing our endpoints
const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'ipapi (Hono)',
    version: '1.0.0',
    description: 'API key management, rate limiting, and IP->country lookup.'
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: {
      ApiKeyHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      },
      AdminKeyHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Admin-Key'
      }
    },
    schemas: {
      CreateUserRequest: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } }
      },
      CreateKeyRequest: {
        type: 'object',
        required: ['user_id', 'name'],
        properties: {
          user_id: { type: 'integer' },
          name: { type: 'string' },
          rate_limit_per_min: { type: 'integer', nullable: true }
        }
      },
      IpResponse: {
        type: 'object',
        properties: {
          ip: { type: 'string' },
          country: { type: 'string', nullable: true },
          country_code: { type: 'string', nullable: true },
          country_iso: { type: 'string', nullable: true },
          error: { type: 'string', nullable: true }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: { '200': { description: 'OK' } }
      }
    },
    '/v1/auth/users': {
      post: {
        summary: 'Create user',
        security: [{ AdminKeyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateUserRequest' } }
          }
        },
        responses: { '200': { description: 'User created' }, '401': { description: 'Unauthorized' } }
      },
      delete: {
        summary: 'Delete user by email',
        security: [{ AdminKeyHeader: [] }],
        parameters: [{ name: 'email', in: 'query', required: true, schema: { type: 'string', format: 'email' } }],
        responses: { '200': { description: 'Deleted' }, '401': { description: 'Unauthorized' } }
      }
    },
    '/v1/auth/keys': {
      post: {
        summary: 'Create API key',
        security: [{ AdminKeyHeader: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateKeyRequest' } }
          }
        },
        responses: { '200': { description: 'Key created' }, '401': { description: 'Unauthorized' } }
      }
    },
    '/v1/auth/keys/{keyId}': {
      delete: {
        summary: 'Delete API key',
        security: [{ AdminKeyHeader: [] }],
        parameters: [{ name: 'keyId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Deleted' }, '401': { description: 'Unauthorized' } }
      }
    },
    '/v1/auth/users/{userId}': {
      delete: {
        summary: 'Delete user by id',
        security: [{ AdminKeyHeader: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Deleted' }, '401': { description: 'Unauthorized' } }
      }
    },
    '/v1/ip': {
      get: {
        summary: 'IP country lookup',
        description: 'Returns country info for the client IP. Respects common proxy headers. Rate limited per API key.',
        security: [{ ApiKeyHeader: [] }],
        parameters: [
          { name: 'api', in: 'query', required: false, schema: { type: 'string' }, description: 'API key via query (alternative to X-API-Key header)' }
        ],
        responses: {
          '200': {
            description: 'Lookup result',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/IpResponse' } } }
          },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limit exceeded' }
        }
      }
    }
  }
} as const;

// Serve OpenAPI JSON
docs.get('/openapi.json', (c) => c.json(openapi));

// Serve Swagger UI (via CDN) that loads our spec
const swaggerHtml = (specUrl: string) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>ipapi (Hono) - Swagger UI</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
        requestInterceptor: (req) => {
          // Ensure API key endpoints pass HTTPS enforcement in local dev
          req.headers = req.headers || {};
          if (!req.headers['X-Forwarded-Proto']) {
            req.headers['X-Forwarded-Proto'] = 'https';
          }
          return req;
        },
      });
    </script>
  </body>
</html>`;

// GET /docs
// TIP: If you host behind a subpath, adjust the spec URL accordingly.
docs.get('/docs', (c) => c.html(swaggerHtml('/openapi.json')));
