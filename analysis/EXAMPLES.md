# Example Applications

## 1. Blog Application

### File Structure
```
routes/
├── posts/
│   ├── [id]/
│   │   ├── index.tsx
│   │   ├── index.ts
│   │   ├── types.d.ts
│   │   └── common.ts
│   ├── new/
│   │   └── index.tsx
│   └── common.ts
├── auth/
│   ├── login/
│   │   ├── index.tsx
│   │   └── index.ts
│   └── common.ts
└── api/
    └── external.ts
```

### Post Route (`routes/posts/[id]/index.ts`)
```ts
import type { GetRequest, DeleteRequest } from "pounce/http";
import { middleware } from "./common";

export async function get({ params, context }: GetRequest<{ id: string }>) {
  const post = await db.post.findUnique({
    where: { id: params.id },
    include: { author: true }
  });

  if (!post) {
    return { status: 404, error: "Post not found" };
  }

  return {
    status: 200,
    data: {
      ...post,
      canEdit: context.user?.id === post.authorId
    }
  };
}

export async function del({ params, context }: DeleteRequest<{ id: string }>) {
  if (!context.user) {
    return { status: 401, error: "Unauthorized" };
  }

  const post = await db.post.findUnique({
    where: { id: params.id }
  });

  if (post?.authorId !== context.user.id) {
    return { status: 403, error: "Forbidden" };
  }

  await db.post.delete({ where: { id: params.id } });
  return { status: 200, data: { success: true } };
}
```

### Post Middleware (`routes/posts/[id]/common.ts`)
```ts
import type { Middleware } from "pounce/http";

export const middleware: Middleware[] = [
  async (ctx, next) => {
    // Authentication
    ctx.user = await getUserFromSession(ctx.request);
    if (!ctx.user) {
      return new Response("Unauthorized", { status: 401 });
    }
    return next();
  },

  async (ctx, next) => {
    // Post existence check
    const post = await db.post.findUnique({
      where: { id: ctx.params.id }
    });

    if (!post) {
      return new Response("Not Found", { status: 404 });
    }

    ctx.post = post;
    return next();
  }
];
```

### Post Page (`routes/posts/[id]/index.tsx`)
```tsx
import { api } from "pounce/http/client";
import { getSSRData } from "pounce/ssr/utils";
import { useQuery } from "@tanstack/react-query";

export default function PostPage({ params }) {
  const initialData = getSSRData<Post>(`api-response-posts-${params.id}`);

  const { data: post } = useQuery({
    queryKey: ["post", params.id],
    queryFn: () => api("./posts/[id]").get({ id: params.id }),
    initialData
  });

  if (!post) return <div>Loading...</div>;

  return (
    <article>
      <h1>{post.title}</h1>
      <p>By {post.author.name} on {new Date(post.createdAt).toLocaleDateString()}</p>
      <div>{post.content}</div>

      {post.canEdit && (
        <button onClick={async () => {
          await api("./posts/[id]").del({ id: params.id });
          window.location.href = "/posts";
        }}>
          Delete Post
        </button>
      )}
    </article>
  );
}
```

### Posts Common Middleware (`routes/posts/common.ts`)
```ts
import type { Middleware } from "pounce/http";

export const middleware: Middleware[] = [
  async (ctx, next) => {
    // Rate limiting for all post routes
    const ip = ctx.request.headers.get("x-forwarded-for") || "unknown";
    const key = `rate-limit:posts:${ip}`;

    const requests = await redis.incr(key);
    if (requests > 100) {
      return new Response("Too Many Requests", { status: 429 });
    }

    await redis.expire(key, 60);
    return next();
  }
];
```

## 2. E-commerce Store

### Product Route (`routes/products/[id]/index.ts`)
```ts
import { middleware } from "./common";

export async function get({ params }) {
  const product = await db.product.findUnique({
    where: { id: params.id },
    include: { reviews: true }
  });

  if (!product) {
    return { status: 404, error: "Product not found" };
  }

  return {
    status: 200,
    data: {
      ...product,
      averageRating: calculateAverageRating(product.reviews)
    }
  };
}
```

### Product Middleware (`routes/products/[id]/common.ts`)
```ts
import type { Middleware } from "pounce/http";

export const middleware: Middleware[] = [
  async (ctx, next) => {
    // Track product views
    await db.productView.create({
      data: {
        productId: ctx.params.id,
        userId: ctx.user?.id || null,
        ipAddress: ctx.request.headers.get("x-forwarded-for") || "unknown"
      }
    });
    return next();
  }
];
```

### Cart API (`routes/api/cart.ts`)
```ts
import { middleware } from "./common";

export async function get({ context }) {
  if (!context.user) {
    return { status: 401, error: "Unauthorized" };
  }

  const cart = await db.cart.findUnique({
    where: { userId: context.user.id },
    include: { items: { include: { product: true } } }
  });

  return {
    status: 200,
    data: cart || { items: [] }
  };
}

export async function post({ context, body }) {
  if (!context.user) {
    return { status: 401, error: "Unauthorized" };
  }

  const cart = await db.cart.upsert({
    where: { userId: context.user.id },
    create: {
      userId: context.user.id,
      items: {
        create: body.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      }
    },
    update: {
      items: {
        create: body.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      }
    }
  });

  return { status: 200, data: cart };
}
```

### External Payment API (`routes/api/payment.ts`)
```ts
import { defineProxy } from "pounce/http";

export default defineProxy({
  baseUrl: "https://payment-gateway.example.com",

  request: async (init) => ({
    ...init,
    headers: {
      ...init.headers,
      "Authorization": `Bearer ${await getPaymentApiKey()}`
    }
  }),

  endpoints: {
    createPayment: {
      method: "POST",
      path: "/payments",
      prepare: (body) => ({
        amount: body.amount * 100, // Convert to cents
        currency: body.currency || "USD",
        customer: {
          email: body.email,
          name: body.name
        },
        metadata: {
          orderId: body.orderId
        }
      }),
      transform: (data) => ({
        paymentId: data.id,
        status: data.status,
        amount: data.amount / 100, // Convert back to dollars
        receiptUrl: data.receipt_url
      })
    },

    getPaymentStatus: {
      method: "GET",
      path: "/payments/{id}",
      transform: (data) => ({
        status: data.status,
        amount: data.amount / 100,
        createdAt: new Date(data.created_at * 1000).toISOString()
      })
    }
  }
});
```

### Checkout Page (`routes/checkout/index.tsx`)
```tsx
import { api } from "pounce/http/client";
import { useMutation } from "@tanstack/react-query";

export default function CheckoutPage() {
  const { mutate: createPayment, isPending } = useMutation({
    mutationFn: (paymentData) =>
      api("/api/payment").createPayment(paymentData)
  });

  const handleSubmit = async (formData) => {
    const payment = await createPayment({
      amount: cart.total,
      currency: "USD",
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      orderId: cart.id
    });

    if (payment.status === "succeeded") {
      window.location.href = `/order/${cart.id}/success`;
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Payment form fields */}
      <button type="submit" disabled={isPending}>
        {isPending ? "Processing..." : "Complete Purchase"}
      </button>
    </form>
  );
}
```

## 3. Admin Dashboard

### Admin Middleware (`routes/admin/common.ts`)
```ts
import type { Middleware } from "pounce/http";

export const middleware: Middleware[] = [
  async (ctx, next) => {
    // Admin authentication
    if (!ctx.user?.isAdmin) {
      return new Response("Forbidden", { status: 403 });
    }
    return next();
  },

  async (ctx, next) => {
    // Audit logging
    console.log(`Admin ${ctx.user.id} accessed ${ctx.request.url}`);
    return next();
  }
];
```

### Users Management (`routes/admin/users/index.ts`)
```ts
import { middleware } from "../common";

export async function get({ context }) {
  const users = await db.user.findMany({
    where: context.user.isSuperAdmin
      ? {}
      : { createdBy: context.user.id },
    orderBy: { createdAt: "desc" }
  });

  return {
    status: 200,
    data: users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }))
  };
}

export async function post({ context, body }) {
  if (!context.user.isSuperAdmin && body.role === "ADMIN") {
    return { status: 403, error: "Cannot create admin users" };
  }

  const user = await db.user.create({
    data: {
      ...body,
      password: await hashPassword(body.password),
      createdBy: context.user.id
    }
  });

  return {
    status: 201,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}
```

### Admin Layout (`routes/admin/common.tsx`)
```tsx
import { Outlet, NavLink } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="admin-dashboard">
      <nav className="admin-nav">
        <NavLink to="/admin/users">Users</NavLink>
        <NavLink to="/admin/products">Products</NavLink>
        <NavLink to="/admin/orders">Orders</NavLink>
        <NavLink to="/admin/settings">Settings</NavLink>
      </nav>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
```

### User Management Page (`routes/admin/users/index.tsx`)
```tsx
import { api } from "pounce/http/client";
import { useQuery, useMutation, queryClient } from "@tanstack/react-query";

export default function UserManagement() {
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api("/admin/users").get()
  });

  const { mutate: createUser } = useMutation({
    mutationFn: (userData) => api("/admin/users").post(userData),
    onSuccess: () => queryClient.invalidateQueries(["admin-users"])
  });

  return (
    <div>
      <h1>User Management</h1>

      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        createUser(Object.fromEntries(formData));
      }}>
        {/* User creation form */}
      </form>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users?.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <button onClick={() => {
                  // Edit user
                }}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```
