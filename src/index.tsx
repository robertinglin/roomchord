// TEMPORARY: mount the standalone design review for side-by-side comparison
// against chat.html. Restore the previous `mountMatterhornApp` export to
// return to the real chat app.
import React from "react";
import { createRoot } from "react-dom/client";
import { DesignReview } from "@shared/ui/design";

const target = typeof document !== "undefined"
  ? document.getElementById("matterhorn-mosh-root")
  : null;

if (target) {
  const root = createRoot(target);
  root.render(<DesignReview />);
}
