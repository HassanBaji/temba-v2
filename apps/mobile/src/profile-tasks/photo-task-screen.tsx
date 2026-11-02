import { useUser } from "@clerk/expo";
import { colors } from "@repo/design-tokens";
import { Camera, Images } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AuthScreen } from "../auth/auth-screen";
import { FormErrorSummary } from "../auth/form-error-summary";
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
import { backToChecklist } from "./task-navigation";

const CIRCLE = 168;
const ICON = 18;

export function PhotoTaskScreen() {
  const { user } = useUser();
  const { pickPhoto, savePhoto, pending } = useProfilePhoto();
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const name = user?.fullName ?? user?.firstName ?? "You";
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
      meta="Profile / Photo"
      title="Add a photo"
      description="A clear face shot helps organizers spot you at the court. Shown to group members and people in your games."
      action={
        <>
          <Button
            label="Save photo"
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
              Not now
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
          accessibilityLabel={photo ? "Your new profile photo" : "No photo yet"}
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
                Profile photo
              </Text>
            </>
          )}
        </View>
        <Text size="meta" tone="muted">
          Until then you show as {initials}
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        <Button
          label="Take a photo"
          size="lg"
          variant="outline"
          disabled={pending}
          icon={<Camera size={ICON} color={colors.ink} />}
          onPress={() => void onPick("camera")}
        />
        <Button
          label="Choose from library"
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
