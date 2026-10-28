import { ConsolePage } from "~/components/console/console-page";
import { PageHeader } from "~/components/console/page-header";
import { DetailsForm } from "~/components/details/details-form";

export default function Page() {
  return (
    <ConsolePage>
      <PageHeader
        title="Venue details"
        description="Contact details, description, booking notes and logo, as players see them."
      />
      <DetailsForm />
    </ConsolePage>
  );
}
