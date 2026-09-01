import { type db } from "~/server/db";

type DbClient = typeof db;

export async function listVenues(database: DbClient) {
  return database.query.venues.findMany({
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: (table, { asc }) => [
      asc(table.name),
      asc(table.city),
      asc(table.country),
    ],
  });
}
