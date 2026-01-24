import { createTRPCReact } from "@trpc/react-query";
import { type AppRouter } from "@/server/api/root";

export const trpc = createTRPCReact<AppRouter>();

// infer the types yea
export type RouterInputs = import("@trpc/server").inferRouterInputs<AppRouter>;
export type RouterOutputs = import("@trpc/server").inferRouterOutputs<AppRouter>;