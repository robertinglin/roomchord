import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PersonalProductivityPanel } from "./PersonalProductivityPanel";
import { usePersonalProductivity } from "../model/usePersonalProductivity";

function TestPanel({ live }: { live: ReturnType<typeof fixture>["live"] }) {
  const productivity = usePersonalProductivity(live);
  return <PersonalProductivityPanel productivity={productivity} />;
}

function fixture() {
  const bookmarks = [{ id: "bookmark-1", messageId: "message-1" }];
  const reminders = [{ id: "reminder-1", messageId: "message-1", label: "Follow up" }];
  const personal = {
    load: vi.fn().mockResolvedValue({}),
    bookmarks: vi.fn().mockResolvedValue(bookmarks),
    reminders: vi.fn().mockResolvedValue(reminders),
    removeBookmark: vi.fn().mockResolvedValue(undefined),
    markReminderRead: vi.fn().mockResolvedValue(undefined),
    completeReminder: vi.fn().mockResolvedValue(undefined),
    removeReminder: vi.fn().mockResolvedValue(undefined)
  };
  return { live: { personal }, personal };
}

describe("PersonalProductivityPanel", () => {
  it("lists authoritative records and refreshes after management actions", async () => {
    const user = userEvent.setup();
    const { live, personal } = fixture();
    render(<TestPanel live={live} />);

    await user.click(screen.getByText("Bookmarks & reminders"));
    await waitFor(() => expect(screen.getByText("Saved message")).toBeInTheDocument());
    await waitFor(() => expect(personal.bookmarks.mock.calls.length).toBeGreaterThan(1));
    await user.click(screen.getByRole("button", { name: "Remove bookmark" }));
    await user.click(screen.getByRole("button", { name: "Mark read" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));
    await user.click(screen.getByRole("button", { name: "Remove reminder" }));
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(personal.removeBookmark).toHaveBeenCalledWith("bookmark-1");
    expect(personal.markReminderRead).toHaveBeenCalledWith("reminder-1");
    expect(personal.completeReminder).toHaveBeenCalledWith("reminder-1");
    expect(personal.removeReminder).toHaveBeenCalledWith("reminder-1");
    expect(personal.bookmarks.mock.calls.length).toBeGreaterThan(1);
  });

  it("shows controller errors instead of inventing local records", async () => {
    const user = userEvent.setup();
    const { live, personal } = fixture();
    personal.bookmarks.mockRejectedValue(new Error("personal data unavailable"));
    render(<TestPanel live={live} />);

    await user.click(screen.getByText("Bookmarks & reminders"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("personal data unavailable"));
    expect(screen.getByText("No bookmarks yet.")).toBeInTheDocument();
  });
});
