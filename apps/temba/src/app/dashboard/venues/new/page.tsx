"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { parseOptionalCoord } from "~/lib/parse-optional-coord";
import { api } from "~/trpc/react";

const FIELD_IDS = {
  name: "venue-name",
  city: "venue-city",
  country: "venue-country",
  latitude: "venue-latitude",
  longitude: "venue-longitude",
};

export default function NewVenuePage() {
  const router = useRouter();
  const utils = api.useUtils();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [latitude, setLatitude] = React.useState("");
  const [longitude, setLongitude] = React.useState("");

  const createVenue = api.venues.create.useMutation({
    onSuccess: async (venue) => {
      toast.success("Venue created");
      await utils.venues.list.invalidate();
      router.push(`/dashboard/venues/${venue.id}`);
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(error, FIELD_IDS, summaryRef.current);
    },
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createVenue.isPending) {
      return;
    }
    createVenue.mutate({
      name,
      city,
      country,
      latitude: parseOptionalCoord(latitude),
      longitude: parseOptionalCoord(longitude),
    });
  }

  const error = createVenue.error;

  return (
    <DashboardShell
      title="Create Venue"
      description="A physical site starts with no Courts. Name, city, and country are required."
    >
      <Card variant="outlined" className="w-full">
        <form onSubmit={onSubmit} className="space-y-6">
          <FormErrorSummary
            ref={summaryRef}
            message={globalFormErrorMessage(error)}
          />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="venue-name">Name</FieldLabel>
              <Input
                id="venue-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={255}
                aria-invalid={
                  fieldErrorMessage(error, "name") ? true : undefined
                }
                aria-describedby={
                  fieldErrorMessage(error, "name")
                    ? "venue-name-error"
                    : undefined
                }
              />
              <FieldError id="venue-name-error">
                {fieldErrorMessage(error, "name")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="venue-city">City</FieldLabel>
              <Input
                id="venue-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                required
                maxLength={255}
                aria-invalid={
                  fieldErrorMessage(error, "city") ? true : undefined
                }
                aria-describedby={
                  fieldErrorMessage(error, "city")
                    ? "venue-city-error"
                    : undefined
                }
              />
              <FieldError id="venue-city-error">
                {fieldErrorMessage(error, "city")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="venue-country">Country</FieldLabel>
              <Input
                id="venue-country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                required
                maxLength={255}
                aria-invalid={
                  fieldErrorMessage(error, "country") ? true : undefined
                }
                aria-describedby={
                  fieldErrorMessage(error, "country")
                    ? "venue-country-error"
                    : undefined
                }
              />
              <FieldError id="venue-country-error">
                {fieldErrorMessage(error, "country")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="venue-latitude">Latitude</FieldLabel>
              <Input
                id="venue-latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                aria-invalid={
                  fieldErrorMessage(error, "latitude") ? true : undefined
                }
                aria-describedby={
                  fieldErrorMessage(error, "latitude")
                    ? "venue-latitude-error"
                    : "venue-latitude-help"
                }
              />
              <FieldDescription id="venue-latitude-help">
                Optional. Range −90 to 90. Blank persists as null.
              </FieldDescription>
              <FieldError id="venue-latitude-error">
                {fieldErrorMessage(error, "latitude")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="venue-longitude">Longitude</FieldLabel>
              <Input
                id="venue-longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                aria-invalid={
                  fieldErrorMessage(error, "longitude") ? true : undefined
                }
                aria-describedby={
                  fieldErrorMessage(error, "longitude")
                    ? "venue-longitude-error"
                    : "venue-longitude-help"
                }
              />
              <FieldDescription id="venue-longitude-help">
                Optional. Range −180 to 180. Blank persists as null.
              </FieldDescription>
              <FieldError id="venue-longitude-error">
                {fieldErrorMessage(error, "longitude")}
              </FieldError>
            </Field>
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={createVenue.isPending}>
              {createVenue.isPending ? "Creating…" : "Create Venue"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/venues">Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
