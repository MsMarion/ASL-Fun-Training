// types/player.ts
import { type RouterOutputs } from "~/trpc/react";

export type Player = RouterOutputs["player"]["getById"];
export type CommonMistake = {
  key1: string;
  key2: string;
  hits: number;
};