import { View } from "react-native";

import { Block } from "../home/slot-block";
import { useMessages } from "../i18n/locale-provider";
import { ScreenHeader } from "../primitives/screen-header";
import { ProfileAllTimeCard } from "./all-time-card";
import { ProfileFormCard } from "./form-card";
import { ProfileHeader } from "./profile-header";
import type { ProfileModel } from "./profile-model";
import { ProfileLevelCard } from "./level-card";
import { ProfileSettings, type ProfileDestination } from "./settings";
import type { PreferredPosition } from "@repo/domain/preferred-position";

const SECTION_GAP = 26;

export function ProfileView({
  model,
  selectedPosition,
  savingPosition,
  changingPhoto,
  signingOut,
  onChangePhoto,
  onSelectPosition,
  onOpen,
  onSignOut,
  onRetry,
}: {
  model: ProfileModel;
  selectedPosition: PreferredPosition | null;
  savingPosition: boolean;
  changingPhoto: boolean;
  signingOut: boolean;
  onChangePhoto: () => void;
  onSelectPosition: (value: PreferredPosition) => void;
  onOpen: (destination: ProfileDestination) => void;
  onSignOut: () => void;
  onRetry: () => void;
}) {
  const m = useMessages();
  const { allTime } = model;

  return (
    <View style={{ gap: SECTION_GAP }}>
      <ScreenHeader title={m.common.profile} />
      <ProfileHeader
        name={model.name}
        imageUri={model.imageUri}
        position={selectedPosition}
        firstMatchAt={
          allTime.status === "ready" ? allTime.value.firstMatchAt : null
        }
        changingPhoto={changingPhoto}
        onChangePhoto={onChangePhoto}
      />
      <Block
        slot={model.level}
        title={m.common.level}
        skeletonHeight={200}
        onRetry={onRetry}
      >
        {(input) => (input ? <ProfileLevelCard input={input} /> : null)}
      </Block>
      <Block
        slot={model.recentForm}
        title={m.mobileHome.recentForm.title}
        skeletonHeight={90}
        onRetry={onRetry}
      >
        {(form) => <ProfileFormCard form={form} />}
      </Block>
      <Block
        slot={allTime}
        title={m.profile.player.allTime}
        skeletonHeight={240}
        onRetry={onRetry}
      >
        {(input) => <ProfileAllTimeCard input={input} />}
      </Block>
      <ProfileSettings
        position={model.position}
        selectedPosition={selectedPosition}
        savingPosition={savingPosition}
        teamCount={model.teamCount}
        pendingInviteCount={model.pendingInviteCount}
        checklistIncomplete={model.checklistIncomplete}
        signingOut={signingOut}
        onSelectPosition={onSelectPosition}
        onOpen={onOpen}
        onSignOut={onSignOut}
        onRetry={onRetry}
      />
    </View>
  );
}
