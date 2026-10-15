import { Settings } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";

export default function ManageSettingsPage() {
  return (
    <EmptyState
      icon={Settings}
      title="Settings are coming"
      description="Details, Courts, Opening hours, pricing and the Cancellation policy will be managed here."
    />
  );
}
