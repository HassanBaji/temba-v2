import { radii, sizes } from "@repo/design-tokens";
import { A4_POINTS, jpegToPdf } from "@repo/domain/image-pdf";
import {
  STANDING_PDF_PAGE,
  STANDING_SQUARE_SIZE,
  standingShareCard,
  standingShareCsv,
  standingShareFileName,
  standingShareFormatOptions,
  standingSharePreview,
  standingShareTable,
  standingShareWhat,
  type StandingShareAction,
  type StandingShareFormat,
  type StandingShareInput,
} from "@repo/domain/standing-share";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import {
  FileText,
  Link as LinkIcon,
  Share as ShareIcon,
  Smartphone,
  Square,
  Table2,
} from "lucide-react-native";
import { useRef, useState, type ComponentType } from "react";
import { Pressable, View, type ColorValue } from "react-native";
import { captureRef } from "react-native-view-shot";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { useErrorMessage } from "../lib/use-error-message";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { SwitchRow } from "../profile-settings/settings-rows";
import {
  STORY_HEIGHT,
  STORY_WIDTH,
  ScaledCanvas,
} from "../share-result/story-canvas";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import {
  StandingPdfPage,
  StandingSquareCard,
  StandingStoryCard,
} from "./standing-share-cards";

type Icon = ComponentType<{ size: number; color: ColorValue }>;

const FORMAT_ICONS: Record<StandingShareFormat, Icon> = {
  story: Smartphone,
  square: Square,
  pdf: FileText,
  csv: Table2,
  link: LinkIcon,
};

/** The design's preview tile: 72 wide, each format at its own shape. */
const THUMB_WIDTH = 72;
const RADIO = 20;

function canvasSize(format: "story" | "square" | "pdf") {
  return format === "story"
    ? { width: STORY_WIDTH, height: STORY_HEIGHT }
    : format === "square"
      ? { width: STANDING_SQUARE_SIZE, height: STANDING_SQUARE_SIZE }
      : STANDING_PDF_PAGE;
}

function bytesFromBase64(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function Thumbnail({
  format,
  input,
  canvasRef,
}: {
  format: StandingShareFormat;
  input: StandingShareInput;
  canvasRef: React.RefObject<View | null>;
}) {
  const locale = useLocale();
  const colors = useColors();
  if (format === "csv" || format === "link") {
    const FormatIcon = FORMAT_ICONS[format];
    return (
      <View
        style={{
          width: THUMB_WIDTH,
          height: THUMB_WIDTH,
          borderRadius: radii.lg,
          backgroundColor: colors.wash,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FormatIcon size={24} color={colors.ink} />
      </View>
    );
  }
  const size = canvasSize(format);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: THUMB_WIDTH,
        overflow: "hidden",
        borderRadius: format === "pdf" ? 4 : radii.sm,
        borderWidth: format === "pdf" ? hairline : 0,
        borderColor: colors.rule,
      }}
    >
      <ScaledCanvas
        canvasRef={canvasRef}
        canvasWidth={size.width}
        canvasHeight={size.height}
      >
        {format === "story" ? (
          <StandingStoryCard card={standingShareCard(input, "story", locale)} />
        ) : format === "square" ? (
          <StandingSquareCard
            card={standingShareCard(input, "square", locale)}
          />
        ) : (
          <StandingPdfPage table={standingShareTable(input, locale)} />
        )}
      </ScaledCanvas>
    </View>
  );
}

/**
 * Design "Group standings" 2a: one sheet that shares the lens and view on
 * screen as an image, a PDF, a CSV or a link.
 */
export function StandingShareSheet({
  visible,
  onClose,
  groupId,
  input,
}: {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  /** Everything but Highlight me, which the sheet owns. */
  input: Omit<StandingShareInput, "highlight">;
}) {
  const locale = useLocale();
  const m = useMessages().group.standing.share;
  const colors = useColors();
  const toast = useToast();
  const errorText = useErrorMessage();
  const utils = api.useUtils();
  const canvasRef = useRef<View | null>(null);
  const [format, setFormat] = useState<StandingShareFormat>("story");
  const [highlight, setHighlight] = useState(false);
  const [pending, setPending] = useState<StandingShareAction | null>(null);
  const share = { ...input, highlight };
  const preview = standingSharePreview(format, highlight, locale);
  // The system share sheet holds Save to Files on both platforms, so a file
  // format keeps the one button that opens it.
  const secondary =
    preview.secondary?.action === "save-image" ? preview.secondary : null;

  async function imageUri() {
    const size = canvasSize(format === "square" ? "square" : "story");
    return captureRef(canvasRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
      width: size.width,
      height: size.height,
    });
  }

  async function fileUri(): Promise<{
    uri: string;
    mimeType: string;
    UTI: string;
  }> {
    if (format === "csv") {
      const csv = standingShareCsv(standingShareTable(share, locale), locale);
      const target = new File(Paths.cache, standingShareFileName(share, "csv"));
      target.write(csv);
      return {
        uri: target.uri,
        mimeType: "text/csv",
        UTI: "public.comma-separated-values-text",
      };
    }
    const jpeg = await captureRef(canvasRef, {
      format: "jpg",
      quality: 0.92,
      result: "base64",
      width: STANDING_PDF_PAGE.width,
      height: STANDING_PDF_PAGE.height,
    });
    const pdf = jpegToPdf(bytesFromBase64(jpeg), STANDING_PDF_PAGE, A4_POINTS);
    const target = new File(Paths.cache, standingShareFileName(share, "pdf"));
    target.write(pdf);
    return {
      uri: target.uri,
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
    };
  }

  async function openShareSheet(file: {
    uri: string;
    mimeType: string;
    UTI: string;
  }) {
    if (!(await Sharing.isAvailableAsync())) {
      toast.show(m.toasts.sharingUnavailable);
      return;
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: file.mimeType,
      UTI: file.UTI,
      dialogTitle: m.title,
    });
  }

  function run(action: StandingShareAction) {
    if (pending) {
      return;
    }
    setPending(action);
    const task = async () => {
      switch (action) {
        case "copy-link": {
          const { url } = await utils.groups.standingLink.fetch({
            groupId,
            seasonId: input.season?.id ?? null,
            view: input.view,
          });
          await Clipboard.setStringAsync(url);
          toast.show(m.toasts.linkCopied);
          return;
        }
        case "share-image":
          await openShareSheet({
            uri: await imageUri(),
            mimeType: "image/png",
            UTI: "public.png",
          });
          return;
        case "save-image": {
          const permission = await MediaLibrary.requestPermissionsAsync(true);
          if (!permission.granted) {
            toast.show(m.toasts.permissionRefused);
            return;
          }
          await MediaLibrary.Asset.create(await imageUri());
          toast.show(m.toasts.savedToPhotos);
          return;
        }
        case "share-file":
        case "save-file":
          await openShareSheet(await fileUri());
          return;
      }
    };
    void task()
      .catch((error: unknown) => {
        toast.show(error instanceof Error ? errorText(error) : m.toasts.failed);
      })
      .finally(() => setPending(null));
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={m.title}
      subtitle={`${m.onScreen} ${standingShareWhat(input.season, input.view, locale)}`}
      closeButton
      tall
      footer={
        <View style={{ gap: 8 }}>
          <Button
            label={preview.primary.label}
            size="lg"
            pending={pending === preview.primary.action}
            disabled={pending != null}
            icon={
              <ShareIcon size={sizes.iconAction} color={colors.onControl} />
            }
            onPress={() => run(preview.primary.action)}
          />
          {secondary ? (
            <Button
              label={secondary.label}
              size="lg"
              variant="outline"
              pending={pending === secondary.action}
              disabled={pending != null}
              onPress={() => run(secondary.action)}
            />
          ) : null}
        </View>
      }
    >
      <View style={{ gap: 18 }}>
        <View
          style={{
            minHeight: 130,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 14,
            borderWidth: hairline,
            borderColor: colors.rule,
            borderRadius: radii.card,
          }}
        >
          <Thumbnail format={format} input={share} canvasRef={canvasRef} />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text weight="semibold">{preview.title}</Text>
            <Text size="eyebrow" tone="muted">
              {preview.description}
            </Text>
          </View>
        </View>

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={m.formatLabel}
          style={{
            borderWidth: hairline,
            borderColor: colors.rule,
            borderRadius: radii.card,
            overflow: "hidden",
          }}
        >
          {standingShareFormatOptions(locale).map((option, index) => {
            const selected = option.format === format;
            const FormatIcon = FORMAT_ICONS[option.format];
            return (
              <View key={option.format}>
                {index > 0 ? <Hairline /> : null}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={option.title}
                  accessibilityHint={option.description}
                  onPress={() => setFormat(option.format)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor:
                      selected || pressed ? colors.wash : colors.paper,
                  })}
                >
                  <FormatIcon size={18} color={colors.ink} />
                  <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                    <Text weight="semibold">{option.title}</Text>
                    <Text size="eyebrow" tone="muted">
                      {option.description}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: RADIO,
                      height: RADIO,
                      borderRadius: RADIO / 2,
                      borderWidth: hairline,
                      borderColor: selected ? colors.ink : colors.muted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected ? (
                      <View
                        style={{
                          width: RADIO / 2,
                          height: RADIO / 2,
                          borderRadius: RADIO / 4,
                          backgroundColor: colors.ink,
                        }}
                      />
                    ) : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        {preview.highlights ? (
          <View
            style={{
              borderWidth: hairline,
              borderColor: colors.rule,
              borderRadius: radii.card,
            }}
          >
            <SwitchRow
              title={m.highlight.label}
              sub={m.highlight.description}
              value={highlight}
              onChange={setHighlight}
            />
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}
