// types/song.ts
import { type RouterOutputs } from "@/trpc/client";

export type Song = RouterOutputs["song"]["getAll"][number];
export type Interaction = Song["interactions"][number];