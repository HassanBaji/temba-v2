-- The board's colour setting follows the glossary (Color scheme, ADR-0064) and
-- its Standings screen is called table in code, as the Americano table is.
ALTER TYPE "public"."live_board_theme" RENAME TO "live_board_color_scheme";--> statement-breakpoint
ALTER TABLE "live_boards" RENAME COLUMN "theme" TO "color_scheme";--> statement-breakpoint
ALTER TYPE "public"."live_board_screen" RENAME VALUE 'standings' TO 'table';
