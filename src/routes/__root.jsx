import { jsx, jsxs } from "react/jsx-runtime";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
} from "@tanstack/react-router";
import { AuthProvider } from "@/auth/AuthProvider";
import { Nav } from "@/components/Nav";
import appCss from "../styles.css?url";
function NotFoundComponent() {
  return /* @__PURE__ */ jsx("div", {
    className: "flex min-h-screen items-center justify-center bg-background px-4",
    children: /* @__PURE__ */ jsxs("div", {
      className: "max-w-md text-center",
      children: [
        /* @__PURE__ */ jsx("h1", {
          className: "text-7xl font-bold text-foreground",
          children: "404",
        }),
        /* @__PURE__ */ jsx("h2", {
          className: "mt-4 text-xl font-semibold text-foreground",
          children: "Page not found",
        }),
        /* @__PURE__ */ jsx("p", {
          className: "mt-2 text-sm text-muted-foreground",
          children: "The page you're looking for doesn't exist or has been moved.",
        }),
        /* @__PURE__ */ jsx("div", {
          className: "mt-6",
          children: /* @__PURE__ */ jsx(Link, {
            to: "/",
            className:
              "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
            children: "Go home",
          }),
        }),
      ],
    }),
  });
}
function ErrorComponent({ error, reset }) {
  console.error(error);
  const router = useRouter();
  return /* @__PURE__ */ jsx("div", {
    className: "flex min-h-screen items-center justify-center bg-background px-4",
    children: /* @__PURE__ */ jsxs("div", {
      className: "max-w-md text-center",
      children: [
        /* @__PURE__ */ jsx("h1", {
          className: "text-xl font-semibold tracking-tight text-foreground",
          children: "This page didn't load",
        }),
        /* @__PURE__ */ jsx("p", {
          className: "mt-2 text-sm text-muted-foreground",
          children: "Something went wrong on our end. You can try refreshing or head back home.",
        }),
        /* @__PURE__ */ jsxs("div", {
          className: "mt-6 flex flex-wrap justify-center gap-2",
          children: [
            /* @__PURE__ */ jsx("button", {
              onClick: () => {
                router.invalidate();
                reset();
              },
              className:
                "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
              children: "Try again",
            }),
            /* @__PURE__ */ jsx("a", {
              href: "/",
              className:
                "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
              children: "Go home",
            }),
          ],
        }),
      ],
    }),
  });
}
const Route = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NO AGE Tour and Travel" },
      {
        name: "description",
        content: "Book safaris across Kenya's national parks and reserves.",
      },
      { name: "author", content: "NO AGE Tour and Travel" },
      { property: "og:title", content: "NO AGE Tour and Travel" },
      {
        property: "og:description",
        content: "Book safaris across Kenya's national parks and reserves.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <HeadContent />
      <AuthProvider>
        <Nav />
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
export { Route };
