import { common } from "./common";
import { game } from "./game";
import { createGame } from "./create-game";
import { level } from "./level";
import { dates } from "./dates";
import { tournament } from "./tournament";
import { football } from "./football";
import { group } from "./group";
import { invite } from "./invite";
import { team } from "./team";
import { home } from "./home";
import { profile } from "./profile";
import { onboarding } from "./onboarding";
import { booking } from "./booking";
import { notification } from "./notification";
import { marks } from "./marks";
import { auth } from "./auth";
import { webGame } from "./web-game";
import { webTournament } from "./web-tournament";
import { webDashboard } from "./web-dashboard";
import { webGroup } from "./web-group";
import { webUi } from "./web-ui";
import { webAuth } from "./web-auth";
import { mobileGroup } from "./mobile-group";
import { mobileGameDetails } from "./mobile-game-details";
import { mobileCreateGame } from "./mobile-create-game";
import { mobileBooking } from "./mobile-booking";
import { mobileTournament } from "./mobile-tournament";
import { mobileHome } from "./mobile-home";
import { mobilePlayer } from "./mobile-player";
import { you } from "./you";
import { mobileYou } from "./mobile-you";
import { mobileInvite } from "./mobile-invite";
import { mobileTeam } from "./mobile-team";
import { mobileMarks } from "./mobile-marks";
import { webYou } from "./web-you";

import type { en } from "../en/index";

type Messages = typeof en;

export const ar: Messages = {
  common,
  game,
  createGame,
  level,
  dates,
  tournament,
  football,
  group,
  invite,
  team,
  home,
  profile,
  onboarding,
  booking,
  notification,
  marks,
  auth,
  webGame,
  webTournament,
  webDashboard,
  webGroup,
  webUi,
  webAuth,
  mobileGroup,
  mobileGameDetails,
  mobileCreateGame,
  mobileBooking,
  mobileTournament,
  mobileHome,
  mobilePlayer,
  you,
  mobileYou,
  webYou,
  mobileInvite,
  mobileTeam,
  mobileMarks,
};
