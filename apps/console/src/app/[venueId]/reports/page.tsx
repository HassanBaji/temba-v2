import { ConsolePage } from "~/components/console/console-page";
import { PageHeader } from "~/components/console/page-header";

export default function Page() {
  return (
    <ConsolePage>
      <PageHeader
        title="Reports"
        description="This section arrives with its screen ticket."
      />
    </ConsolePage>
  );
}
