# Evolve courts into Venue

The leftover courts table is already a place (name, geo, city, country, phone, website, logo URL). Games, coaches, and coaching sessions require a foreign key to that row with ON DELETE CASCADE. We evolve that table into **Venue** (same ids) and add a child **Court** table for named playing surfaces. Game, coach, and coaching-session foreign keys stay on the Venue row until a later Game-create slice. Named Courts must not cascade-delete Games.

**Considered Options**: a parallel Venue table leaving courts untouched. Rejected: two place concepts would fight the moment Game create chooses “Court 3.”
