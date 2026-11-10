import { ConsolePage } from "~/components/console/console-page";
import { PageHeader } from "~/components/console/page-header";
import { DetailsForm } from "~/components/details/details-form";
import { getRequestMessages } from "~/lib/request-locale";

export default async function Page() {
  const m = (await getRequestMessages()).consoleVenue.details;
  return (
    <ConsolePage>
      <PageHeader title={m.title} description={m.description} />
      <DetailsForm />
    </ConsolePage>
  );
}
