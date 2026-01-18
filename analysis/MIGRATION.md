# Migration Guide

## From Express APIs

### 1. Route Conversion
**Before (Express):**
```js
// routes/users.js
router.get("/:id", async (req, res) => {
  const user = await db.user.findUnique({ where: { id: req.params.id } });
  res.json(user);
});
```

**After (Pounce):**
```ts
// routes/users/[id]/index.ts
export async function get({ params }) {
  const user = await db.user.findUnique({ where: { id: params.id } });
  return {
    status: 200,
    data: user
  };
}
```

### 2. Middleware Conversion
**Before (Express):**
```js
// middleware/auth.js
function auth(req, res, next) {
  if (!req.user) return res.status(401).send("Unauthorized");
  next();
}

router.use("/protected", auth);
```

**After (Pounce):**
```ts
// routes/protected/common.ts
import type { Middleware } from "pounce/http";

export const middleware: Middleware[] = [
  async (ctx, next) => {
    if (!ctx.user) {
      return new Response("Unauthorized", { status: 401 });
    }
    return next();
  }
];
```

### 3. Error Handling
**Before (Express):**
```js
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal Server Error");
});
```

**After (Pounce):**
```ts
// routes/common.ts
import type { Middleware } from "pounce/http";

export const middleware: Middleware[] = [
  async (ctx, next) => {
    try {
      return await next();
    } catch (error) {
      console.error(error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
];
```

## From Next.js

### 1. API Routes
**Before (Next.js):**
```js
// pages/api/users/[id].js
export default async function handler(req, res) {
  const { id } = req.query;
  const user = await db.user.findUnique({ where: { id } });
  res.status(200).json(user);
}
```

**After (Pounce):**
```ts
// routes/users/[id]/index.ts
export async function get({ params }) {
  const user = await db.user.findUnique({ where: { id: params.id } });
  return {
    status: 200,
    data: user
  };
}
```

### 2. getServerSideProps
**Before (Next.js):**
```js
// pages/users/[id].js
export async function getServerSideProps({ params }) {
  const user = await db.user.findUnique({ where: { id: params.id } });
  return { props: { user } };
}
```

**After (Pounce):**
```tsx
// routes/users/[id]/index.tsx
import { api, getSSRData, getSSRId } from "pounce/http/client";

export default function UserPage({ params }) {
  const ssrId = getSSRId(`./users/${params.id}`);
  const initialData = getSSRData<User>(ssrId);

  // ... render user
}
```

### 3. Middleware
**Before (Next.js):**
```js
// middleware.js
export function middleware(request) {
  const user = request.cookies.get("user");
  if (!user) return Response.redirect(new URL("/login", request.url));
}
```

**After (Pounce):**
```ts
// routes/common.ts
import type { Middleware } from "pounce/http";

export const middleware: Middleware[] = [
  async (ctx, next) => {
    if (!ctx.user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" }
      });
    }
    return next();
  }
];
```

## From SvelteKit

### 1. Endpoints
**Before (SvelteKit):**
```js
// src/routes/users/[id].js
export async function get({ params }) {
  const user = await db.user.findUnique({ where: { id: params.id } });
  return { body: user };
}
```

**After (Pounce):**
```ts
// routes/users/[id]/index.ts
export async function get({ params }) {
  const user = await db.user.findUnique({ where: { id: params.id } });
  return {
    status: 200,
    data: user
  };
}
```

### 2. Load Functions
**Before (SvelteKit):**
```js
// src/routes/users/[id].svelte
export async function load({ params }) {
  const user = await db.user.findUnique({ where: { id: params.id } });
  return { props: { user } };
}
```

**After (Pounce):**
```tsx
// routes/users/[id]/index.tsx
import { api, getSSRData, getSSRId } from "pounce/http/client";

export default function UserPage({ params }) {
  const ssrId = getSSRId(`./users/${params.id}`);
  const user = getSSRData(ssrId);

  if (!user) return <p>Loading...</p>;
  
  return (
      <>
        <h1>{user.name}</h1>
        <p>{user.email}</p>
      </>
  );
}
```

### 3. Hooks
**Before (SvelteKit):**
```js
// src/hooks.js
export async function handle({ event, resolve }) {
  event.locals.user = await getUser(event);
  return resolve(event);
}
```

**After (Pounce):**
```ts
// routes/common.ts
import type { Middleware } from "pounce/http";

export const middleware: Middleware[] = [
  async (ctx, next) => {
    ctx.user = await getUserFromRequest(ctx.request);
    return next();
  }
];
```

## From NestJS

### 1. Controllers
**Before (NestJS):**
```ts
@Controller('users')
export class UsersController {
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
```

**After (Pounce):**
```ts
// routes/users/[id]/index.ts
export async function get({ params }) {
  const user = await db.user.findUnique({ where: { id: params.id } });
  return {
    status: 200,
    data: user
  };
}
```

### 2. Guards
**Before (NestJS):**
```ts
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.user != null;
  }
}
```

**After (Pounce):**
```ts
// routes/protected/common.ts
import type { Middleware } from "pounce/http";

export const middleware: Middleware[] = [
  async (ctx, next) => {
    if (!ctx.user) {
      return new Response("Unauthorized", { status: 401 });
    }
    return next();
  }
];
```

### 3. Interceptors
**Before (NestJS):**
```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before...');
    return next.handle().pipe(tap(() => console.log('After...')));
  }
}
```

**After (Pounce):**
```ts
// routes/common.ts
import type { Middleware } from "pounce/http";

export const middleware: Middleware[] = [
  async (ctx, next) => {
    console.log(`Request to ${ctx.request.url}`);
    const start = Date.now();
    const response = await next();
    console.log(`Response for ${ctx.request.url} took ${Date.now() - start}ms`);
    return response;
  }
];
```

## Common Migration Patterns

### 1. Authentication
**Pattern:** Move auth logic from framework-specific middleware to Pounce middleware

**Example:**
```ts
// routes/common.ts
export const middleware: Middleware[] = [
  async (ctx, next) => {
    const token = ctx.request.headers.get("authorization");
    if (!token) return new Response("Unauthorized", { status: 401 });

    try {
      ctx.user = await verifyToken(token.split(" ")[1]);
      return next();
    } catch (error) {
      return new Response("Forbidden", { status: 403 });
    }
  }
];
```

### 2. Validation
**Pattern:** Replace framework validation with middleware or handler validation

**Example:**
```ts
// routes/users/[id]/common.ts
import { z } from "zod";

const userIdSchema = z.string().uuid();

export const middleware: Middleware[] = [
  async (ctx, next) => {
    const result = userIdSchema.safeParse(ctx.params.id);
    if (!result.success) {
      return new Response(JSON.stringify(result.error), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    return next();
  }
];
```

### 3. Error Handling
**Pattern:** Centralize error handling in middleware

**Example:**
```ts
// routes/common.ts
export const middleware: Middleware[] = [
  async (ctx, next) => {
    try {
      return await next();
    } catch (error) {
      console.error(error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: error.status || 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
];
```

### 4. Data Loading
**Pattern:** Replace framework-specific data loading with SSR injection

**Example:**
```tsx
// Before (Next.js getServerSideProps)
export async function getServerSideProps() {
  const data = await fetchData();
  return { props: { data } };
}

// After (Pounce SSR)
const ssrId = getSSRId("./data");
const initialData = getSSRData<MyData>(ssrId);
const { data } = useQuery(["data"], () => api("./data").get(), {
  initialData
});
```

## Migration Checklist

1. [ ] Set up Pounce project structure
2. [ ] Convert API routes to Pounce handlers
3. [ ] Move middleware to `common.ts` files
4. [ ] Update frontend to use `api()` client
5. [ ] Implement SSR data injection
6. [ ] Set up external API proxies
7. [ ] Update build and deployment configurations
8. [ ] Test all routes and middleware
9. [ ] Optimize performance (caching, compression)
10. [ ] Set up monitoring and error tracking
