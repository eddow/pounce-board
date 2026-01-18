# Architecture Overview

## 1. High-Level Architecture
```
┌───────────────────────────────────────────────────────┐
│                     Client Side                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   React     │    │   Svelte     │    │   Vanilla   │  │
│  │  Components │    │  Components │    │   JS/TS     │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│               ┌───────────────────────┐               │
│               │       Pounce Client    │               │
│               │   - API Client         │               │
│               │   - SSR Hydration      │               │
│               │   - Query Management   │               │
│               └───────────────────────┘               │
└───────────────────────────────┬───────────────────────┘
                                │
                                │ HTTP/JSON
                                ▼
┌───────────────────────────────────────────────────────┐
│                     Server Side                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │                 Pounce Core                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │  │
│  │  │  Router     │  │  Middleware │  │  Handlers │  │  │
│  │  │  - Route    │  │  - Auth     │  │  - GET    │  │  │
│  │  │  - Matching │  │  - Validation│  │  - POST  │  │  │
│  │  │  - SSR      │  │  - Caching  │  │  - PUT   │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────┘  │  │
│  │                                                     │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │               Data Layer                    │  │  │
│  │  │  - Database Connections                     │  │  │
│  │  │  - External API Proxies                     │  │  │
│  │  │  - Cache Systems                           │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │               Framework Adapters                │  │
│  │  - Express/Koa/Fastify                         │  │
│  │  - Serverless (Vercel/Netlify)                 │  │
│  │  - Edge Workers                               │  │
│  └─────────────────────────────────────────────────┘  │
52: └───────────────────────────────────────────────────────┘
```

## 2. Key Components

### 2.1 Router
- **File-based routing**: Automatically maps filesystem to URLs
- **Dynamic segments**: `[param]` syntax for dynamic routes
- **Route matching**: Supports RESTful conventions
- **SSR integration**: Handles server-side rendering paths

### 2.2 Middleware System
- **Stack-based execution**: Middleware runs in sequence
- **Context passing**: Shared context between middleware
- **Short-circuiting**: Middleware can terminate the chain
- **Scoping**: Middleware applies to route and descendants

### 2.3 API Client
- **Universal interface**: Works on server and client
- **Type safety**: Full TypeScript support
- **SSR awareness**: Detects server-side rendering
- **Response caching**: Built-in caching support

### 2.4 SSR Engine
- **Data injection**: Embeds API responses in HTML
- **Hydration**: Client-side data recovery
- **Fallback handling**: Network requests if SSR data missing
- **Performance**: Minimizes client-side requests

### 2.5 External API Proxy
- **Type generation**: Creates TypeScript types from API specs
- **Request transformation**: Modifies requests before sending
- **Response transformation**: Normalizes external API responses
- **Error handling**: Consistent error formats

## 3. Data Flow

### 3.1 Client-Side Data Flow
```
┌───────────┐    ┌───────────┐    ┌─────────────────┐
│   UI      │───▶│ API Client│───▶│ Query Management │
│           │    │           │    │                  │
└───────────┘    └───────────┘    └─────────────────┘
       ▲               │                   │
       │               ▼                   ▼
┌──────┴───────┐ ┌─────────────┐    ┌─────────────┐
│ SSR Data     │ │ Network      │    │ Cache        │
│ (script tags)│ │ Requests     │    │ (optional)   │
└──────────────┘ └─────────────┘    └─────────────┘
```

### 3.2 Server-Side Data Flow
```
┌───────────┐    ┌─────────────────┐    ┌─────────────┐
│ Incoming  │───▶│ Middleware Stack│───▶│ Route       │
│ Request   │    │ - Authentication │    │ Handler     │
└───────────┘    │ - Validation     │    │ - Business  │
                 │ - Caching        │    │   Logic    │
                 └─────────────────┘    └─────────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Response Generation  │
                 │ - Data serialization │
                 │ - SSR data injection│
                 │ - Headers           │
                 └─────────────────────┘
                            │
                            ▼
                     ┌───────────┐
                     │ HTML/JSON │
                     │ Response  │
                     └───────────┘
```

## 4. Type System Architecture
```
┌───────────────────────────────────────────────────────┐
│                     Type Layer                         │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Route       │    │ API         │    │ External     │  │
│  │ Types       │    │ Response    │    │ API          │  │
│  │ - Params    │    │ Types       │    │ Types       │  │
│  │ - Context   │    │ - Success    │    │ - Request   │  │
│  │ - Return    │    │ - Error      │    │ - Response  │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │               Shared Types                      │  │
│  │  - User                                        │  │
│  │  - Product                                     │  │
│  │  - Common DTOs                                 │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │               Type Utilities                    │  │
│  │  - Zod validation                              │  │
│  │  - Type guards                                  │  │
│  │  - Type transformations                         │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

## 5. Performance Considerations

### 5.1 Caching Strategy
- **Client-side**: React Query/SWR caching
- **Server-side**: Response caching middleware
- **CDN**: Cache static assets and API responses
- **Database**: Implement query caching

### 5.2 Bundle Optimization
- **Code splitting**: Route-level code splitting
- **Tree shaking**: Remove unused code
- **Compression**: Gzip/Brotli compression
- **Minification**: Production builds

### 5.3 Network Optimization
- **Payload size**: Minimize response sizes
- **Connection reuse**: HTTP/2 connection pooling
- **Preloading**: Critical resource preloading
- **Lazy loading**: Non-critical resources

## 6. Security Architecture

### 6.1 Defense Layers
```
┌───────────────────────────────────────────────────────┐
│                     Security Layers                  │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Network     │    │ Application │    │ Data        │  │
│  │ - DDoS      │    │ - Auth      │    │ - Validation│  │
│  │   Protection│    │ - Input     │    │ - Sanitization│
│  │ - Firewall  │    │   Validation│    │ - Encryption│  │
│  │ - Rate      │    │ - CSRF      │    │ - Access    │  │
│  │   Limiting  │    │   Protection│    │   Control  │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │               Monitoring                         │  │
│  │  - Logging                                     │  │
│  │  - Anomaly Detection                           │  │
│  │  - Alerting                                    │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### 6.2 Security Headers
Implement security headers in your server adapter:
```ts
// Security middleware
export const securityMiddleware: Middleware = async (ctx, next) => {
  const response = await next();

  // Add security headers
  response.headers.set("Content-Security-Policy", "default-src 'self'");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=()");

  return response;
};
```

## 7. Scalability Patterns

### 7.1 Horizontal Scaling
- **Stateless design**: Middleware and handlers should be stateless
- **Session management**: Use centralized session storage
- **Load balancing**: Distribute traffic across instances
- **Auto-scaling**: Scale based on load metrics

### 7.2 Database Scaling
- **Read replicas**: For read-heavy workloads
- **Sharding**: For write-heavy workloads
- **Caching layer**: Redis/Memcached for frequent queries
- **Connection pooling**: Manage database connections

### 7.3 Microservices Integration
```
┌───────────────────────────────────────────────────────┐
│                     Microservices                    │
│                                                       │
│  ┌─────────────┐       ┌─────────────┐       ┌───────┐│
│  │ Auth        │───────│ Users       │───────│ Orders││
│  │ Service     │       │ Service     │       │Service││
│  └─────────────┘       └─────────────┘       └───────┘│
│          ▲                  ▲                 ▲      │
│          │                  │                 │      │
│  ┌───────┴───────┐    ┌──────┴──────┐    ┌──────┴──────┐│
│  │ API Gateway   │    │ Message    │    │ Event      ││
│  │ (Pounce)     │    │ Broker     │    │ Bus        ││
│  └───────────────┘    └────────────┘    └────────────┘│
└───────────────────────────────────────────────────────┘
```

## 8. Deployment Architectures

### 8.1 Traditional Server
```
┌───────────────────────────────────────────────────────┐
│                     Server Deployment                 │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Load        │    │ App         │    │ Database    │  │
│  │ Balancer    │───▶│ Servers     │───▶│ Cluster     │  │
│  └─────────────┘    │ (Pounce)    │    └─────────────┘  │
│                     └─────────────┘                   │
│  ┌─────────────────────────────────────────────────┐  │
│  │               Monitoring                       │  │
│  │  - Log Aggregation                             │  │
│  │  - Metrics Collection                          │  │
│  │  - Alerting                                    │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### 8.2 Serverless
```
┌───────────────────────────────────────────────────────┐
│                     Serverless                      │
│                                                       │
│  ┌─────────────┐    ┌─────────────────────────────┐  │
│  │ API         │    │ Cloud Functions            │  │
│  │ Gateway     │───▶│ (Pounce handlers)          │  │
│  └─────────────┘    │ - Auto-scaling              │  │
│                     │ - Pay-per-use               │  │
│                     └─────────────────────────────┘  │
│                                                       │
│  ┌─────────────┐    ┌─────────────────────────────┐  │
│  │ Database    │    │ Storage                    │  │
│  │ (Serverless)│    │ - Blobs                    │  │
│  │ (Serverless)│    │ - Files                    │  │
│  └─────────────┘    └─────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### 8.3 Edge Computing
```
┌───────────────────────────────────────────────────────┐
│                     Edge Deployment                   │
│                                                       │
│  ┌─────────────┐    ┌─────────────────────────────┐  │
│  │ CDN         │    │ Edge Workers               │  │
│  │ - Caching   │───▶│ (Pounce running at edge)   │  │
│  │ - Static     │    │ - Low latency             │  │
│  │   Assets    │    │ - Global distribution     │  │
│  └─────────────┘    └─────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │               Origin Servers                    │  │
│  │  - Dynamic content                             │  │
│  │  - Database access                             │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

## 9. Development Workflow

### 9.1 Local Development
```
┌───────────────────────────────────────────────────────┐
│                     Dev Environment                   │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Frontend    │    │ Backend     │    │ Database    │  │
│  │ - Hot       │    │ - Watch     │    │ - Local     │  │
│  │   Reload    │    │   Mode      │    │   Instance │  │
│  │ - Fast      │    │ - Auto      │    │ - Seed     │  │
│  │   Refresh   │    │   Restart   │    │   Data    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │               Tooling                            │  │
│  │  - ESLint                                      │  │
│  │  - Prettier                                    │  │
│  │  - TypeScript                                  │  │
│  │  - Jest/Vitest                                 │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### 9.2 Testing Strategy
```
┌───────────────────────────────────────────────────────┐
│                     Testing Pyramid                   │
│                                                       │
│  ┌─────────────┐                                    │  │
│  │ Unit Tests   │                                    │  │
│  │ - Fast       │                                    │  │
│  │ - Isolated   │                                    │  │
│  └─────────────┘                                    │  │
│                                                       │  │
│  ┌─────────────────────┐                          │  │
│  │ Integration Tests    │                          │  │
│  │ - API endpoints      │                          │  │
│  │ - Middleware stacks  │                          │  │
│  └─────────────────────┘                          │  │
│                                                       │  │
│  ┌─────────────────────────────────┐              │  │
│  │ E2E Tests                      │              │  │
│  │ - User journeys                │              │  │
│  │ - Critical paths               │              │  │
│  └─────────────────────────────────┘              │  │
│                                                       │  │
│  ┌───────────────────────────────────────────────┐│  │
│  │               Testing Tools                     ││  │
│  │  - Vitest/Jest                                ││  │
│  │  - Playwright/Cypress                         ││  │
│  │  - MSW for API mocking                        ││  │
│  └───────────────────────────────────────────────┘│  │
└───────────────────────────────────────────────────────┘
```

## 10. Monitoring and Observability

### 10.1 Monitoring Architecture
```
┌───────────────────────────────────────────────────────┐
│                     Observability Stack               │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Logging     │    │ Metrics      │    │ Tracing      │  │
│  │ - Structured│    │ - Performance│    │ - Distributed│  │
│  │ - Centralized│  │ - Business  │    │ - Request   │  │
│  │ - Searchable│    │   Metrics  │    │   Flow      │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│          ▲               ▲                   ▲         │
│          │               │                   │         │
│  ┌───────┴───────┐ ┌──────┴──────┐    ┌───────┴───────┐  │
│  │ Log          │ │ Metrics     │    │ Tracing      │  │
│  │ Aggregator   │ │ Collector   │    │ Collector   │  │
│  └──────────────┘ └─────────────┘    └──────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │               Visualization                     │  │
│  │  - Dashboards                                  │  │
│  │  - Alerts                                     │  │
│  │  - Anomaly Detection                          │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### 10.2 Key Metrics to Track
- **Performance**:
  - Request latency (p50, p90, p99)
  - Throughput (requests/sec)
  - Error rates
  - Database query times

- **Business**:
  - API usage by endpoint
  - User activity patterns
  - Conversion funnels
  - Feature adoption

- **Infrastructure**:
  - CPU/Memory usage
  - Network latency
  - Database connections
  - Cache hit rates

## 11. CI/CD Pipeline

### 11.1 Pipeline Stages
```
┌───────────────────────────────────────────────────────┐
│                     CI/CD Pipeline                   │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Build       │───▶│ Test         │───▶│ Deploy      │  │
│  │ - Install   │    │ - Unit       │    │ - Staging   │  │
│  │   Deps      │    │ - Integration│    │ - Production│  │
│  │ - Type      │    │ - E2E        │    │ - Rollback  │  │
│  │   Check     │    │ - Security   │    │   Plan      │  │
│  │ - Build     │    └─────────────┘    └─────────────┘  │
│  └─────────────┘                                    │  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │               Quality Gates                     │  │
│  │  - Test Coverage ≥ 80%                          │  │
│  │  - No Critical Vulnerabilities                 │  │
│  │  - Performance Budgets                         │  │
│  │  - Approval for Production                      │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### 11.2 Deployment Strategies
1. **Blue-Green Deployment**:
   - Maintain two identical production environments
   - Switch traffic between them
   - Minimal downtime

2. **Canary Releases**:
   - Gradually roll out to small percentage of users
   - Monitor metrics
   - Gradually increase rollout

3. **Feature Flags**:
   - Deploy code behind feature flags
   - Enable gradually
   - Easy rollback

4. **Rollback Plan**:
   - Automated rollback on critical failures
   - Versioned releases
   - Database migration rollback scripts

## 12. Framework Extensibility

### 12.1 Extension Points
1. **Server Adapters**:
   - Implement adapters for different servers (Express, Fastify, etc.)
   - Standard interface for request/response handling

2. **Middleware**:
   - Add custom middleware to the stack
   - Modify existing middleware behavior

3. **API Clients**:
   - Custom transport layers
   - Alternative serialization formats

4. **SSR Engines**:
   - Custom data injection strategies
   - Alternative hydration methods

5. **Type System**:
   - Custom type generators
   - Additional validation layers

### 12.2 Creating Plugins
```ts
// Example plugin structure
interface PouncePlugin {
  name: string;
  setup?: (app: PounceApp) => void;
  middleware?: Middleware[];
  clientExtensions?: (client: ApiClient) => void;
}

// Usage
const myPlugin: PouncePlugin = {
  name: "my-plugin",
  setup: (app) => {
    // Modify app configuration
  },
  middleware: [
    async (ctx, next) => {
      // Add custom middleware
      return next();
    }
  ],
  clientExtensions: (client) => {
    // Extend API client
    client.customMethod = () => {};
  }
};

// Register plugin
app.use(myPlugin);
```

### 12.3 Custom Server Adapters
```ts
// Example Express adapter
import express from "express";
import { createPounceHandler } from "pounce/http";

export function createExpressAdapter() {
  const app = express();

  // Convert Express request to Pounce request
  app.use((req, res, next) => {
    const pounceHandler = createPounceHandler({
      request: req,
      response: res,
      // Convert Express-specific features
    });

    pounceHandler(req, res, next);
  });

  return app;
}
```

## 13. Performance Optimization Guide

### 13.1 Critical Rendering Path
1. **SSR Optimization**:
   - Minimize server-side processing time
   - Implement streaming responses
   - Use edge caching for static content

2. **Client-Side**:
   - Code splitting by route
   - Lazy load non-critical components
   - Preload critical resources

3. **Data Loading**:
   - Parallelize data fetching
   - Implement stale-while-revalidate
   - Use optimistic UI updates

### 13.2 Bundle Analysis
- Use `@rollup/plugin-visualizer` or `webpack-bundle-analyzer`
- Identify large dependencies
- Consider alternative lighter libraries
- Implement dynamic imports

### 13.3 API Performance
- Implement response compression
- Use efficient serialization (e.g., `devalue` instead of `JSON`)
- Add ETags and Cache-Control headers
- Implement pagination for large datasets

```ts
// Compression middleware
export const compressionMiddleware: Middleware = async (ctx, next) => {
  const response = await next();

  // Compress responses
  if (response.headers.get("content-type") === "application/json") {
    const body = await response.text();
    const compressed = await compress(body);

    return new Response(compressed, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
        "Content-Encoding": "gzip",
        "Content-Length": compressed.length.toString()
      }
    });
  }

  return response;
};
```

### 13.4 Database Optimization
- Implement connection pooling
- Use prepared statements
- Add database indexes
- Implement query caching
- Consider read replicas

```ts
// Database connection pooling
import { createPool } from "mysql2/promise";

const pool = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware to attach DB to context
export const dbMiddleware: Middleware = async (ctx, next) => {
  ctx.db = pool;
  return next();
};
```

## 14. Security Hardening

### 14.1 Security Checklist
- [ ] Implement proper authentication
- [ ] Use HTTPS with HSTS
- [ ] Validate all inputs
- [ ] Sanitize all outputs
- [ ] Implement CSRF protection
- [ ] Set secure cookies
- [ ] Implement rate limiting
- [ ] Use security headers
- [ ] Regular dependency updates
- [ ] Security scanning in CI
- [ ] Implement CORS properly
- [ ] Secure error handling
- [ ] Database security
- [ ] File upload protection
- [ ] Logging without sensitive data

### 14.2 Security Middleware
```ts
// Comprehensive security middleware
export const securityMiddleware: Middleware = async (ctx, next) => {
  // 1. CORS
  if (ctx.request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGINS,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  // 2. Security headers
  const response = await next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()");

  return response;
};
```

### 14.3 Input Validation
```ts
// Comprehensive validation middleware
import { z } from "zod";

export function createValidator(schema: z.ZodSchema): Middleware {
  return async (ctx, next) => {
    try {
      // Validate path parameters
      if (Object.keys(ctx.params).length > 0) {
        ctx.params = schema.parse(ctx.params);
      }

      // Validate query parameters
      const query = Object.fromEntries(ctx.request.url.searchParams);
      if (Object.keys(query).length > 0) {
        ctx.query = schema.parse(query);
      }

      // Validate body for POST/PUT
      if (["POST", "PUT", "PATCH"].includes(ctx.request.method)) {
        const body = await ctx.request.json();
        ctx.body = schema.parse(body);
      }

      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(JSON.stringify({
          error: "Validation failed",
          details: error.errors
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      throw error;
    }
  };
}
```

## 15. Advanced Patterns

### 15.1 Plugin System
```ts
// Plugin system implementation
interface Plugin {
  name: string;
  setup?: (app: PounceApp) => void | Promise<void>;
  middleware?: Middleware | Middleware[];
  routes?: Record<string, RouteHandler>;
  clientExtensions?: (client: ApiClient) => void;
}

class PounceApp {
  private plugins: Plugin[] = [];

  use(plugin: Plugin) {
    this.plugins.push(plugin);
  }

  async initialize() {
    // Initialize all plugins
    for (const plugin of this.plugins) {
      if (plugin.setup) {
        await plugin.setup(this);
      }

      if (plugin.middleware) {
        const middlewares = Array.isArray(plugin.middleware)
          ? plugin.middleware
          : [plugin.middleware];
        this.middleware.push(...middlewares);
      }

      if (plugin.routes) {
        Object.entries(plugin.routes).forEach(([path, handler]) => {
          this.router.addRoute(path, handler);
        });
      }
    }
  }

  // ... rest of the implementation
}
```

### 15.2 Event System
```ts
// Event system for cross-cutting concerns
type EventName = "request:start" | "request:end" | "error" | string;

class EventEmitter {
  private listeners: Map<EventName, Function[]> = new Map();

  on(event: EventName, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  emit(event: EventName, ...args: any[]) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }
}

// Usage in middleware
export const eventMiddleware: Middleware = async (ctx, next) => {
  const start = Date.now();
  emitter.emit("request:start", { path: ctx.request.url, method: ctx.request.method });

  try {
    const response = await next();
    emitter.emit("request:end", {
      path: ctx.request.url,
      method: ctx.request.method,
      duration: Date.now() - start,
      status: response.status
    });
    return response;
  } catch (error) {
    emitter.emit("error", {
      path: ctx.request.url,
      method: ctx.request.method,
      error,
      duration: Date.now() - start
    });
    throw error;
  }
};
```

### 15.3 Dependency Injection
```ts
// DI container for services
class Container {
  private services = new Map<string, any>();

  register(name: string, service: any) {
    this.services.set(name, service);
  }

  get<T>(name: string): T {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} not found`);
    }
    return this.services.get(name);
  }
}

// Middleware to attach container to context
export const diMiddleware: Middleware = async (ctx, next) => {
  ctx.container = new Container();

  // Register common services
  ctx.container.register("db", await createDbConnection());
  ctx.container.register("logger", createLogger());
  ctx.container.register("cache", createCache());

  return next();
};
```

### 15.4 GraphQL Integration
```ts
// GraphQL adapter
import { graphqlHTTP } from "express-graphql";
import { buildSchema } from "graphql";

export function createGraphQLMiddleware(schema: string, resolvers: any) {
  const graphqlSchema = buildSchema(schema);

  return async (ctx, next) => {
    if (ctx.request.url.pathname === "/graphql") {
      const result = await graphqlHTTP({
        schema: graphqlSchema,
        rootValue: resolvers,
        context: ctx,
        graphiql: process.env.NODE_ENV === "development"
      })(ctx.request);

      return new Response(result, {
        headers: { "Content-Type": "application/json" }
      });
    }

    return next();
  };
}
```

### 15.5 WebSocket Support
```ts
// WebSocket integration
import { WebSocketServer } from "ws";

export function createWebSocketServer(httpServer: any) {
  const wss = new WebSocketServer({ server: httpServer });

  return {
    middleware: () => {
      // Store WebSocket server in context
      return async (ctx, next) => {
        ctx.wss = wss;
        return next();
      };
    },
    wss
  };
}

// Usage in routes
export async function get({ wss, params }) {
  if (wss) {
    // Handle WebSocket upgrade
    if (params.action === "subscribe") {
      // Implement WebSocket subscription logic
    }
  }
  return { status: 200, data: { message: "OK" } };
}
```

### 15.6 Server-Sent Events
```ts
// SSE support
export async function sse({ request, params }) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();

  // Set headers for SSE
  const response = new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });

  // Send initial data
  writer.write(`data: ${JSON.stringify({ init: true })}\n\n`);

  // Set up event listeners or intervals
  const interval = setInterval(() => {
    writer.write(`data: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);
  }, 1000);

  // Clean up on client disconnect
  request.signal.addEventListener("abort", () => {
    clearInterval(interval);
    writer.close();
  });

  return response;
}
```

### 15.7 Background Jobs
```ts
// Background job system
interface Job {
  name: string;
  data: any;
  options?: {
    delay?: number;
    priority?: number;
  };
}

class JobQueue {
  private queue: Job[] = [];
  private workers = new Set<Promise<void>>();

  add(job: Job) {
    this.queue.push(job);
    this.process();
  }

  private async process() {
    if (this.workers.size >= 5) return; // Limit concurrent workers

    const job = this.queue.shift();
    if (!job) return;

    const worker = (async () => {
      try {
        if (job.options?.delay) {
          await new Promise(resolve => setTimeout(resolve, job.options.delay));
        }

        // Process job
        await processJob(job);

        this.workers.delete(worker);
        this.process(); // Process next job
      } catch (error) {
        console.error("Job failed:", error);
        this.workers.delete(worker);
        this.process();
      }
    })();

    this.workers.add(worker);
  }
}

// Middleware to attach job queue
export const jobQueueMiddleware: Middleware = async (ctx, next) => {
  ctx.jobQueue = new JobQueue();
  return next();
};
```

### 15.8 Feature Flags
```ts
// Feature flag system
class FeatureFlags {
  private flags: Record<string, boolean> = {};
  private defaultFlags: Record<string, boolean>;

  constructor(defaultFlags: Record<string, boolean> = {}) {
    this.defaultFlags = defaultFlags;
  }

  async loadFromDatabase(userId: string) {
    // Load user-specific feature flags from database
    const userFlags = await db.featureFlags.findUnique({
      where: { userId }
    });

    this.flags = { ...this.defaultFlags, ...userFlags };
  }

  isEnabled(flag: string): boolean {
    return this.flags[flag] ?? this.defaultFlags[flag] ?? false;
  }
}

// Middleware to attach feature flags
export const featureFlagsMiddleware: Middleware = async (ctx, next) => {
  ctx.featureFlags = new FeatureFlags({
    newDashboard: false,
    experimentalApi: false
  });

  if (ctx.user) {
    await ctx.featureFlags.loadFromDatabase(ctx.user.id);
  }

  return next();
};
```

### 15.9 A/B Testing
```ts
// A/B testing framework
class ABTest {
  private experiments: Record<string, {
    variants: string[];
    weights: number[];
  }> = {};

  registerExperiment(name: string, variants: string[], weights: number[]) {
    this.experiments[name] = { variants, weights };
  }

  getVariant(name: string, userId: string): string {
    const experiment = this.experiments[name];
    if (!experiment) return "control";

    // Consistent assignment based on userId
    const hash = simpleHash(userId + name);
    const totalWeight = experiment.weights.reduce((a, b) => a + b, 0);
    let cumulative = 0;

    for (let i = 0; i < experiment.variants.length; i++) {
      cumulative += experiment.weights[i];
      if (hash % totalWeight < cumulative) {
        return experiment.variants[i];
      }
    }

    return experiment.variants[0];
  }
}

// Middleware to attach AB testing
export const abTestMiddleware: Middleware = async (ctx, next) => {
  ctx.abTest = new ABTest();

  // Register experiments
  ctx.abTest.registerExperiment("new-ui", ["control", "variant-a", "variant-b"], [50, 25, 25]);

  if (ctx.user) {
    // Store assigned variants in context
    ctx.variant = {
      ui: ctx.abTest.getVariant("new-ui", ctx.user.id)
    };
  }

  return next();
};
```

### 15.10 Audit Logging
```ts
// Comprehensive audit logging
interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  timestamp: Date;
  ipAddress?: string;
}

class AuditLogger {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async log(event: Omit<AuditLog, "id" | "timestamp">) {
    await this.db.auditLog.create({
      data: {
        id: generateId(),
        timestamp: new Date(),
        ...event
      }
    });
  }
}

// Middleware to attach audit logger
export const auditMiddleware: Middleware = async (ctx, next) => {
  ctx.audit = new AuditLogger(ctx.db);

  const response = await next();

  // Log the request
  await ctx.audit.log({
    userId: ctx.user?.id,
    action: ctx.request.method,
    entityType: "request",
    entityId: ctx.request.url,
    metadata: {
      status: response.status,
      userAgent: ctx.request.headers.get("user-agent")
    },
    ipAddress: ctx.request.headers.get("x-forwarded-for")
  });

  return response;
};
```

## 16. Troubleshooting Guide

### 16.1 Common Issues and Solutions

| Issue | Possible Causes | Solutions |
|-------|-----------------|-----------|
| **404 Not Found** | Incorrect route path, missing file | Verify file structure matches URL, check for typos |
| **Type Errors** | Missing type definitions, incorrect imports | Ensure `.d.ts` files exist, check import paths |
| **Middleware not running** | Incorrect `common.ts` location, missing export | Verify file is named `common.ts`, check exports |
| **SSR data not loading** | Script tags not injected, ID mismatch | Check HTML for script tags, verify IDs match |
| **CORS errors** | Missing CORS headers | Add CORS middleware, configure allowed origins |
| **Authentication failures** | Invalid tokens, missing user context | Verify auth middleware, check token validation |
| **Slow responses** | Unoptimized queries, missing indexes | Add database indexes, implement caching |
| **Memory leaks** | Unclosed connections, circular references | Audit resource cleanup, use weak references |
| **Type mismatches** | Incorrect API responses | Validate response shapes, update type definitions |
| **Hydration errors** | SSR/client mismatch | Ensure consistent data between server and client |

### 16.2 Debugging Techniques

1. **Middleware Debugging**:
```ts
// Debug middleware
export const debugMiddleware: Middleware = async (ctx, next) => {
  console.log(`[DEBUG] ${ctx.request.method} ${ctx.request.url}`);
  console.log("[DEBUG] Context:", {
    params: ctx.params,
    user: ctx.user ? "present" : "missing",
    other: Object.keys(ctx).filter(k => !["params", "user", "request"].includes(k))
  });

  const start = Date.now();
  const response = await next();
  const duration = Date.now() - start;

  console.log(`[DEBUG] Response: ${response.status} (${duration}ms)`);

  return response;
};
```

2. **API Client Debugging**:
```ts
// Debug API client
const debugApi = api(path);

debugApi.get = async (params) => {
  console.log(`[API DEBUG] GET ${path}`, { params });
  const start = Date.now();
  const result = await originalGet(params);
  const duration = Date.now() - start;
  console.log(`[API DEBUG] Response (${duration}ms):`, result);
  return result;
};
```

3. **SSR Debugging**:
```html
<!-- Debug script tags -->
<script>
  window.__pounceDebug = {
    ssrData: {},
    hydrated: false
  };

  document.querySelectorAll('script[type="application/json"]').forEach(script => {
    if (script.id.startsWith('api-response-')) {
      window.__pounceDebug.ssrData[script.id] = JSON.parse(script.textContent);
    }
  });

  window.__pounceDebug.hydrated = true;
</script>
```

### 16.3 Performance Profiling

1. **Middleware Timing**:
```ts
// Timing middleware
export const timingMiddleware: Middleware = async (ctx, next) => {
  const start = process.hrtime();
  const response = await next();
  const diff = process.hrtime(start);
  const time = diff[0] * 1e3 + diff[1] * 1e-6;

  response.headers.set("X-Response-Time", `${time.toFixed(2)}ms`);
  return response;
};
```

2. **Memory Profiling**:
```ts
// Memory tracking
let lastMemoryUsage = process.memoryUsage();

setInterval(() => {
  const current = process.memoryUsage();
  console.log({
    rss: current.rss - lastMemoryUsage.rss,
    heapTotal: current.heapTotal - lastMemoryUsage.heapTotal,
    heapUsed: current.heapUsed - lastMemoryUsage.heapUsed,
    external: current.external - lastMemoryUsage.external
  });
  lastMemoryUsage = current;
}, 5000);
```

3. **Database Query Logging**:
```ts
// Query logging middleware
export const queryLoggingMiddleware: Middleware = async (ctx, next) => {
  const originalQuery = ctx.db.query;
  ctx.db.query = async (sql, params) => {
    const start = Date.now();
    const result = await originalQuery(sql, params);
    const duration = Date.now() - start;

    if (duration > 100) { // Log slow queries
      console.warn(`Slow query (${duration}ms):`, { sql, params });
    }

    return result;
  };

  return next();
};
```

## 17. Upgrade Guide

### 17.1 Versioning Strategy
Pounce follows **Semantic Versioning** (SemVer):
- **MAJOR**: Breaking changes
- **MINOR**: Backwards-compatible new features
- **PATCH**: Backwards-compatible bug fixes

### 17.2 Upgrade Paths

#### From v1.x to v2.x
1. **Breaking Changes**:
   - Route file naming changed from `[id].ts` to `index.ts` in folders
   - Middleware signature updated to include `context` parameter
   - SSR data injection format changed

2. **Migration Steps**:
```bash
# 1. Update package
npm install pounce-framework@latest

# 2. Rename route files
mv routes/users/[id].ts routes/users/[id]/index.ts

# 3. Update middleware
# Change from: (req, res, next) => {}
# To: (ctx, next) => {}

# 4. Update SSR data access
# Change from: window.__DATA__
# To: getSSRData(id)
```

3. **Configuration Updates**:
```ts
// Update pounce.config.ts
export default {
  // New required version field
  version: 2,

  // Updated SSR configuration
  ssr: {
    injectScriptTags: true, // New option
    scriptIdPrefix: "api-response" // New option
  }
};
```

#### From v2.x to v3.x
1. **Breaking Changes**:
   - TypeScript 4.5+ now required
   - External API proxy system rewritten
   - Middleware context type changes

2. **Migration Steps**:
```ts
# 1. Update TypeScript
npm install typescript@latest

# 2. Update external API proxies
# Change from defineExternalApi() to defineProxy()

# 3. Update context types
interface MyContext extends PounceContext {
  // Your custom properties
}
```

### 17.3 Deprecation Policy
- Features marked as deprecated in a MINOR version
- Removed in the next MAJOR version
- Deprecation warnings in development mode

### 17.4 Backward Compatibility
- Major versions maintain compatibility within their line
- Migration guides provided for breaking changes
- Codemods available for common migrations

## 18. Contribution Guide

### 18.1 Development Setup
```bash
# Clone repository
git clone https://github.com/yourorg/pounce.git
cd pounce

# Install dependencies
npm install

# Build packages
npm run build

# Run tests
npm test

# Start dev server
npm run dev
```

### 18.2 Project Structure
```
pounce/
├── packages/
│   ├── core/          # Core framework
│   ├── http/          # HTTP utilities
│   ├── ssr/           # SSR utilities
│   └── cli/           # Command line tools
├── examples/          # Example projects
├── docs/              # Documentation
└── tests/             # Test suites
```

### 18.3 Coding Standards
- **TypeScript**: Strict typing everywhere
- **Formatting**: Prettier with default settings
- **Linting**: ESLint with recommended rules
- **Testing**: Jest with high coverage
- **Commits**: Conventional Commits format
- **Documentation**: JSDoc for all public APIs

### 18.4 Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Run test suite
6. Submit PR with clear description
7. Address review comments
8. Merge after approval

### 18.5 Release Process
1. Update CHANGELOG.md
2. Bump version in package.json
3. Create Git tag
4. Publish to npm
5. Update documentation site
6. Announce release

## 19. FAQ

### 19.1 General Questions

**Q: How does Pounce compare to Next.js?**
A: Pounce is more lightweight and focused on explicit patterns rather than magic conventions. It provides more control over middleware and type safety while maintaining similar SSR capabilities.

**Q: Can I use Pounce with my existing backend?**
A: Yes! Pounce can be incrementally adopted. You can start with just the client-side features and gradually migrate your backend.

**Q: What frameworks does Pounce work with?**
A: Pounce works with React, Svelte, and vanilla JS/TS. The backend can run on Node.js, Deno, or edge environments.

### 19.2 Technical Questions

**Q: How does the type system work across client and server?**
A: Pounce uses shared `.d.ts` files that are imported by both client and server code. The build system ensures these types stay in sync.

**Q: Can I use Pounce with GraphQL?**
A: Yes! While Pounce is REST-first, you can add GraphQL support via plugins or integrate with existing GraphQL servers.

**Q: How does Pounce handle authentication?**
A: Authentication is handled via middleware. You can use any auth system (JWT, sessions, etc.) by adding the appropriate middleware to your `common.ts`.

**Q: What about file uploads?**
A: Pounce supports file uploads through standard FormData. The API client automatically handles multipart requests when it detects File objects.

### 19.3 Troubleshooting

**Q: I'm getting type errors when importing routes.**
A: Make sure you have:
1. A `types.d.ts` file in your route directory
2. Proper type exports in that file
3. Correct import paths in your frontend code

**Q: My middleware isn't running.**
A: Verify:
1. The `common.ts` file exists in the correct directory
2. You're exporting a `middleware` array
3. The middleware is properly typed

**Q: SSR data isn't being injected.**
A: Check:
1. Your server is calling `injectApiResponses`
2. The script tags have the correct IDs
3. The client is using `getSSRData` with matching IDs

**Q: API calls are failing in production.**
A: Common issues:
1. Missing environment variables
2. CORS configuration
3. Network/firewall restrictions
4. HTTPS vs HTTP mismatches

### 19.4 Performance

**Q: How can I improve my Pounce app's performance?**
A: Key optimizations:
1. Implement caching at multiple levels
2. Use code splitting for large bundles
3. Optimize your database queries
4. Enable compression
5. Use CDN for static assets

**Q: Is Pounce suitable for large applications?**
A: Yes! Pounce is designed to scale:
- File-based routing works for hundreds of routes
- Middleware system is efficient
- Type system helps maintain large codebases
- Performance optimizations are built-in

### 19.5 Deployment

**Q: What platforms can I deploy Pounce to?**
A: Pounce works on:
- Traditional Node.js servers
- Serverless platforms (Vercel, Netlify, AWS Lambda)
- Edge networks (Cloudflare Workers, Deno Edge)
- Containerized environments (Docker, Kubernetes)

**Q: How do I configure my server for Pounce?**
A: Pounce provides adapters for popular servers:
```ts
// Express example
import { createExpressAdapter } from "pounce/adapters/express";
import express from "express";

const app = express();
createExpressAdapter(app, {
  // Your Pounce configuration
});
```

**Q: Can I use Pounce with a monorepo?**
A: Absolutely! Pounce works well with:
- npm/yarn workspaces
- Turborepo
- Nx
- Lerna

Just ensure your routes are properly configured in each package.

## 20. Glossary

| Term | Definition |
|------|-----------|
| **Route Handler** | A function that handles HTTP requests for a specific route |
| **Middleware** | Functions that process requests before they reach route handlers |
| **SSR** | Server-Side Rendering - rendering pages on the server |
| **Hydration** | The process of "booting up" JavaScript on the client after SSR |
| **API Proxy** | A typed interface to external APIs |
| **Context** | An object passed through middleware containing request information |
| **Dynamic Route** | A route with parameters (e.g., `/users/[id]`) |
| **Common File** | A `common.ts` file containing middleware for a route and its children |
| **Script Tag Injection** | The process of embedding API responses in HTML during SSR |
| **Type Safety** | Ensuring type correctness across client and server code |
| **External API** | Third-party APIs integrated via Pounce's proxy system |
| **Middleware Stack** | The ordered collection of middleware for a route |
| **Route Matching** | The process of determining which route handler should process a request |
| **Payload** | The data sent in an API request or response |
| **HMR** | Hot Module Replacement - updating code without full page reloads |
| **Edge Function** | Serverless functions running at the edge of the network |

## 21. Roadmap

### 21.1 Short-Term (Next 3 Months)
- [ ] Improved TypeScript inference for API responses
- [ ] Official Vercel/Netlify adapters
- [ ] GraphQL integration guide
- [ ] WebSocket support enhancement
- [ ] Performance benchmarking suite

### 21.2 Medium-Term (Next 6 Months)
- [ ] React Native support
- [ ] Improved devtools integration
- [ ] Automatic OpenAPI/Swagger generation
- [ ] Database ORM integration
- [ ] Internationalization (i18n) support

### 21.3 Long-Term (Next Year)
- [ ] Visual route editor
- [ ] AI-assisted code generation
- [ ] Expanded plugin ecosystem
- [ ] WebAssembly support
- [ ] Real-time collaboration features

### 21.4 Version Plan
| Version | Focus Areas | ETA |
|---------|------------|-----|
| 3.0 | Stability, performance, documentation | Q1 2024 |
| 3.1 | Plugin system, improved DX | Q2 2024 |
| 3.5 | Edge rendering, expanded adapters | Q3 2024 |
| 4.0 | Major architecture improvements | Q1 2025 |

## 22. Community

### 22.1 Getting Help
- **GitHub Discussions**: [github.com/yourorg/pounce/discussions](https://github.com/yourorg/pounce/discussions)
- **Discord**: [discord.gg/pounce](https://discord.gg/pounce)
- **Stack Overflow**: Use tag `pounce-framework`

### 22.2 Contributing
We welcome contributions! See our [Contribution Guide](#18-contribution-guide) for details.

### 22.3 Code of Conduct
We follow the [Contributor Covenant](https://www.contributor-covenant.org/). Be kind and respectful!

### 22.4 Governance
Pounce is maintained by a core team with community contributions. Major decisions are made through RFCs (Request for Comments).

### 22.5 RFC Process
1. Open an issue with the "RFC" label
2. Discuss the proposal with the community
3. Submit a formal RFC document
4. Core team reviews and approves
5. Implementation begins

### 22.6 Meetups and Events
- **Monthly Community Call**: First Tuesday of each month
- **Annual Conference**: PounceConf (planned for 2025)
- **Local Meetups**: Organized by community members worldwide

### 22.7 Sponsorship
Pounce is an open-source project that relies on community support. Consider:
- [GitHub Sponsors](https://github.com/sponsors/yourorg)
- [Open Collective](https://opencollective.com/pounce)
- Corporate sponsorships

## 23. License

Pounce is licensed under the **MIT License**.

### 23.1 Full License Text
```
MIT License

Copyright (c) [year] [your organization]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 23.2 Usage Rights
- Free for commercial and non-commercial use
- Modification allowed
- Distribution allowed
- Attribution required
- No liability or warranty

### 23.3 Attribution
When using Pounce, please include:
- A copy of the LICENSE file in your project
- Credit in your documentation (e.g., "Built with Pounce Framework")

### 23.4 Third-Party Licenses
Pounce includes code from these open-source projects:
- TypeScript (Apache-2.0)
- Zod (MIT)
- React Query (MIT)
- Other dependencies (see package.json for details)
