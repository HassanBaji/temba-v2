import { initials } from "@repo/domain/initials";
import { useState } from "react";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { SearchField } from "../primitives/search-field";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import {
  CreateTeamCard,
  CreateTeamPillButton,
  CreateTeamTile,
} from "./create-team-parts";

const SEARCH_MIN_LENGTH = 2;

/** On Temba: find someone by name, username, email or phone and invite them. */
export function CreateTeamTembaSearch({
  listedUserIds,
  full,
  disabled,
  onInvite,
}: {
  listedUserIds: readonly string[];
  full: boolean;
  disabled: boolean;
  onInvite: (user: { id: string; name: string }) => void;
}) {
  const m = useMessages();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const searching = trimmed.length >= SEARCH_MIN_LENGTH;
  const search = api.teams.searchLookupUsers.useQuery(
    { query: trimmed },
    { enabled: searching },
  );
  const rows = searching ? (search.data ?? []) : [];

  return (
    <View style={{ gap: 8 }}>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={m.team.addPlayers.searchLabel}
        accessibilityLabel={m.team.addPlayers.searchLabel}
        editable={!disabled}
      />
      <View accessibilityLiveRegion="polite">
        {search.error ? (
          <Text size="meta" weight="medium">
            {search.error.message}
          </Text>
        ) : searching && search.data?.length === 0 ? (
          <Text size="eyebrow" tone="muted">
            {m.team.addPlayers.searchEmpty}
          </Text>
        ) : null}
      </View>
      {rows.length > 0 ? (
        <CreateTeamCard emphasis>
          {rows.map((row, index) => {
            const listed = listedUserIds.includes(row.id);
            return (
              <View key={row.id}>
                {index > 0 ? <Hairline /> : null}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <CreateTeamTile
                    tone={listed ? "invited" : "plain"}
                    size="md"
                    initials={initials(row.name)}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text weight="semibold" numberOfLines={1}>
                      {row.name}
                    </Text>
                    {row.username ? (
                      <Text size="eyebrow" tone="muted" numberOfLines={1}>
                        {row.username}
                      </Text>
                    ) : null}
                  </View>
                  {listed ? (
                    <Text size="eyebrow" tone="muted">
                      {m.team.addPlayers.invitedMark}
                    </Text>
                  ) : (
                    <CreateTeamPillButton
                      label={m.team.create.lookup.invite}
                      accessibilityLabel={m.team.create.lookup.inviteA11y(
                        row.name,
                      )}
                      disabled={disabled || full}
                      onPress={() => onInvite(row)}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </CreateTeamCard>
      ) : null}
    </View>
  );
}
