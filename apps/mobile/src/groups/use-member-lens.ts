import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  GroupMemberFilter,
  GroupMemberSort,
} from "@repo/domain/group-members-table";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  EMPTY_MEMBER_LENS,
  readMemberLens,
  writeMemberLens,
  type StoredMemberLens,
} from "./members-lens-store";

/** The Members tab sort and filter, remembered per Group on this device. */
export function useMemberLens(groupId: string) {
  const [lens, setLens] = useState<StoredMemberLens>(EMPTY_MEMBER_LENS);
  const chosen = useRef(false);

  useEffect(() => {
    let live = true;
    chosen.current = false;
    setLens(EMPTY_MEMBER_LENS);
    void readMemberLens(AsyncStorage, groupId).then((stored) => {
      if (live && !chosen.current) {
        setLens(stored);
      }
    });
    return () => {
      live = false;
    };
  }, [groupId]);

  const latest = useRef(lens);
  latest.current = lens;

  const update = useCallback(
    (patch: Partial<StoredMemberLens>) => {
      chosen.current = true;
      const next = { ...latest.current, ...patch };
      latest.current = next;
      setLens(next);
      void writeMemberLens(AsyncStorage, groupId, next);
    },
    [groupId],
  );

  return {
    lens,
    setSort: useCallback((sort: GroupMemberSort) => update({ sort }), [update]),
    setFilter: useCallback(
      (filter: GroupMemberFilter) => update({ filter }),
      [update],
    ),
  };
}
