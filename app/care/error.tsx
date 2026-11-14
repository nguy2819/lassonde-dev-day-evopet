"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export default function CareError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      className="bg-white/70"
      title="We couldn't load this view"
      description="The data service may be unavailable. No member data was changed."
      action={
        <Button onClick={reset} size="sm">
          <RotateCcw /> Try again
        </Button>
      }
    />
  );
}
