import { sizes } from "@repo/design-tokens";
import { colors } from "@repo/design-tokens";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { Button } from "../primitives/button";
import { PartnersCard } from "../profile/profile-sections";
import { SectionHead } from "../profile/profile-parts";
import type {
  PlayerProfileModel,
  ProfileMatchRow,
} from "./player-profile-model";
import {
  EarlyDaysCard,
  FormMarks,
  MatchList,
  PositionCard,
  StatsGrid,
  StreakTiles,
  WithViewerCard,
} from "./profile-sections";

const TIGHT = 14;

/**
 * Everything under the hero, in the design's order: early days or streaks,
 * position, Overall, you and them, partners, then the games.
 */
export function PlayerProfileBody({
  model,
  onOpenRow,
  onOpenPlayer,
  onSeeAll,
}: {
  model: PlayerProfileModel;
  onOpenRow: (target: NonNullable<ProfileMatchRow["target"]>) => void;
  onOpenPlayer: (userId: string) => void;
  onSeeAll: () => void;
}) {
  const m = useMessages();
  const page = m.profile.playerPage;
  return (
    <>
      <View style={{ gap: TIGHT }}>
        {model.early ? (
          <EarlyDaysCard view={model.early} form={model.form} />
        ) : null}
        {model.streaks ? (
          <StreakTiles
            view={model.streaks}
            labels={{ current: page.currentStreak, best: page.bestStreak }}
          />
        ) : null}
        <PositionCard view={model.position} />
      </View>
      <View style={{ gap: TIGHT }}>
        <StatsGrid
          title={m.profile.player.overall}
          meta={m.profile.player.allTime}
          tiles={model.stats}
        />
        {model.withViewer ? (
          <WithViewerCard
            view={model.withViewer}
            playerName={model.name}
            playerImage={model.imageUri}
          />
        ) : null}
      </View>
      {model.partners ? (
        <PartnersCard
          title={model.partners.title}
          meta={model.partners.meta}
          rows={model.partners.rows}
          empty=""
          onOpen={onOpenPlayer}
        />
      ) : null}
      {model.rows.length > 0 ? (
        <View style={{ gap: TIGHT }}>
          <View style={{ gap: 12 }}>
            <SectionHead title={model.form.title} meta={model.form.record} />
            {model.early ? null : <FormMarks form={model.form} />}
          </View>
          <MatchList rows={model.rows} onOpen={onOpenRow} />
          {model.seeAll ? (
            <Button
              label={model.seeAll}
              variant="outline"
              icon={
                <ChevronRight
                  size={sizes.iconAction}
                  color={colors.ink}
                  style={mirrorInRtl}
                />
              }
              iconPlacement="trailing"
              onPress={onSeeAll}
            />
          ) : null}
        </View>
      ) : null}
    </>
  );
}
