import { describe, expect, it, vi } from "vitest";
import { directThreadActions } from "./directThreadActions";

function setup() {
  const live = {
    reserveDirectThread: vi.fn().mockResolvedValue({ threadId: "reserved", userIds: ["alice", "bob"] }),
    createDirectThread: vi.fn().mockResolvedValue({ threadId: "group", userIds: ["alice", "bob", "carol"], name: "Project" }),
    addDirectThreadMembers: vi.fn().mockResolvedValue(undefined),
    removeDirectThreadMembers: vi.fn().mockResolvedValue(undefined),
    leaveDirectThread: vi.fn().mockResolvedValue(undefined),
    renameDirectThread: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined)
  };
  return { actions: directThreadActions({ live } as never), live };
}

describe("direct thread actions", () => {
  it("delegates reservation and group creation to Matterhorn", async () => {
    const { actions, live } = setup();
    await expect(actions.reserveDirectThread(["alice", "bob"])).resolves.toEqual({ threadId: "reserved", userIds: ["alice", "bob"] });
    await expect(actions.createDirectThread({ userIds: ["alice", "bob", "carol"], name: "Project" })).resolves.toMatchObject({ threadId: "group" });
    expect(live.reserveDirectThread).toHaveBeenCalledWith({ userIds: ["alice", "bob"] , topicKey: undefined });
    expect(live.createDirectThread).toHaveBeenCalledWith({ userIds: ["alice", "bob", "carol"], name: "Project" });
    expect(live.refresh).toHaveBeenCalledTimes(1);
  });

  it("delegates membership, rename, and leave operations without local projections", async () => {
    const { actions, live } = setup();
    await actions.addDirectThreadMembers({ threadId: "group", userIds: ["dana"] });
    await actions.removeDirectThreadMembers({ threadId: "group", userIds: ["dana"] });
    await actions.renameDirectThread({ threadId: "group", name: "Renamed" });
    await actions.leaveDirectThread("group");
    expect(live.addDirectThreadMembers).toHaveBeenCalledWith({ threadId: "group", userIds: ["dana"] });
    expect(live.removeDirectThreadMembers).toHaveBeenCalledWith({ threadId: "group", userIds: ["dana"] });
    expect(live.renameDirectThread).toHaveBeenCalledWith({ threadId: "group", name: "Renamed" });
    expect(live.leaveDirectThread).toHaveBeenCalledWith("group");
    expect(live.refresh).toHaveBeenCalledTimes(4);
  });
});
