import { QueryClient, QueryCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function onQueryError(error) {
  // A 401 means the stored token is missing/expired — client.js has already
  // cleared it. Send the user back to the login screen instead of leaving
  // the query to retry (and refetch on every window focus) forever.
  if (error?.status === 401 && window.location.pathname !== "/") {
    window.location.href = "/";
  }
}

const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => error?.status !== 401 && failureCount < 3,
      },
    },
    queryCache: new QueryCache({ onError: onQueryError }),
  });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
  return router;
};
export { getRouter };
