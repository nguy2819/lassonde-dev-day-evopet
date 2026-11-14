import type { Metadata } from "next";
import { CircleView } from "./circle-view";

export const metadata: Metadata = { title: "Support circle" };

export default function CirclePage() {
  return <CircleView />;
}
