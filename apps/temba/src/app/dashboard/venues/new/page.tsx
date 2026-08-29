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
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { parseOptionalCoord } from "~/lib/parse-optional-coord";
import { api } from "~/trpc/react";

export default function NewVenuePage() {
  const router = useRouter();
  const utils = api.useUtils();
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
      toast.error(error.message);
    },
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createVenue.mutate({
      name,
      city,
      country,
      latitude: parseOptionalCoord(latitude),
      longitude: parseOptionalCoord(longitude),
    });
  }

  return (
    <DashboardShell
      title="Create Venue"
      description="A physical site starts with no Courts. Name, city, and country are required."
    >
      <Card variant="outlined" className="mx-auto w-full max-w-lg">
        <form onSubmit={onSubmit} className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="venue-name">Name</FieldLabel>
              <Input
                id="venue-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Club house name"
                required
                maxLength={255}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="venue-city">City</FieldLabel>
              <Input
                id="venue-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Lisbon"
                required
                maxLength={255}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="venue-country">Country</FieldLabel>
              <Input
                id="venue-country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder="Portugal"
                required
                maxLength={255}
              />
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
                placeholder="Optional"
              />
              <FieldDescription>Optional. Range −90 to 90.</FieldDescription>
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
                placeholder="Optional"
              />
              <FieldDescription>Optional. Range −180 to 180.</FieldDescription>
            </Field>
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              className="min-h-11"
              disabled={createVenue.isPending}
            >
              {createVenue.isPending ? "Creating…" : "Create Venue"}
            </Button>
            <Button variant="outline" className="min-h-11" asChild>
              <Link href="/dashboard/venues">Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
