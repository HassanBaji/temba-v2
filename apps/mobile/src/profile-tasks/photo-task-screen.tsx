import { useUser } from "@clerk/expo";
import { Camera, Images } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AuthScreen } from "../auth/auth-screen";
import { FormErrorSummary } from "../auth/form-error-summary";
import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { CachedImage } from "../primitives/cached-image";
import { Hatch } from "../primitives/hatch";
import { hairline } from "../primitives/hairline-width";
import { initialsFor } from "../primitives/initials";
import { Text } from "../primitives/text";
import {
  useProfilePhoto,
  type PhotoSource,
  type PickedPhoto,
} from "../profile/use-profile-photo";
import { useColors } from "../theme/theme-provider";
import { backToChecklist } from "./task-navigation";

const CIRCLE = 168;
const ICON = 18;

export function PhotoTaskScreen() {
  const m = useMessages();
  const colors = useColors();
  const t = m.mobileHome.photoTask;
  const { user } = useUser();
  const { pickPhoto, savePhoto, pending } = useProfilePhoto();
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const name = user?.fullName ?? user?.firstName ?? m.common.you;
  const initials = initialsFor(name);

  async function onPick(source: PhotoSource) {
    setError(null);
    const picked = await pickPhoto(source);
    if (!picked.ok) {
      setError(picked.message);
      return;
    }
    if (picked.value) {
      setPhoto(picked.value);
    }
  }

  async function onSave() {
    if (!photo) {
      return;
    }
    setError(null);
    const saved = await savePhoto(photo);
    if (!saved.ok) {
      setError(saved.message);
      return;
    }
    backToChecklist();
  }

  return (
    <AuthScreen
      onBack={backToChecklist}
      meta={t.meta}
      title={t.title}
      description={t.description}
      action={
        <>
          <Button
            label={t.save}
            size="lg"
            pending={pending && photo !== null}
            disabled={!photo || pending}
            onPress={() => void onSave()}
          />
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            disabled={pending}
            onPress={backToChecklist}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text
              tone="muted"
              style={{ textAlign: "center", textDecorationLine: "underline" }}
            >
              {m.mobileHome.tasks.notNow}
            </Text>
          </Pressable>
        </>
      }
    >
      <FormErrorSummary message={error} />
      <View style={{ alignItems: "center", gap: 14 }}>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={photo ? t.newPhotoSpoken : t.noPhotoSpoken}
          style={{
            width: CIRCLE,
            height: CIRCLE,
            borderRadius: CIRCLE / 2,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: hairline,
            borderColor: colors.rule,
          }}
        >
          {photo ? (
            <CachedImage
              uri={photo.uri}
              style={{ width: CIRCLE, height: CIRCLE }}
            />
          ) : (
            <>
              <Hatch radius={CIRCLE / 2} bordered={false} />
              <Text size="eyebrow" tone="muted" mono uppercase>
                {t.placeholder}
              </Text>
            </>
          )}
        </View>
        <Text size="meta" tone="muted">
          {t.untilThen(initials)}
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        <Button
          label={t.takePhoto}
          size="lg"
          variant="outline"
          disabled={pending}
          icon={<Camera size={ICON} color={colors.ink} />}
          onPress={() => void onPick("camera")}
        />
        <Button
          label={t.chooseFromLibrary}
          size="lg"
          variant="outline"
          disabled={pending}
          icon={<Images size={ICON} color={colors.ink} />}
          onPress={() => void onPick("library")}
        />
      </View>
    </AuthScreen>
  );
}
