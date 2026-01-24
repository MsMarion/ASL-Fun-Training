import { createTRPCReact } from "@trpc/react-query";
import { type AppRouter } from "@/server/api/root";

export const trpc = createTRPCReact<AppRouter>();

// Type helpers to infer types from your tRPC router
export type RouterInputs = import("@trpc/server").inferRouterInputs<AppRouter>;
export type RouterOutputs = import("@trpc/server").inferRouterOutputs<AppRouter>;