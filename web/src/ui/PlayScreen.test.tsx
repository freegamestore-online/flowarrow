import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PlayScreen } from "./PlayScreen";

// jsdom has no Web Animations API. Record calls so the feel wiring can be checked.
const animate = vi.fn((_frames: Keyframe[] | PropertyIndexedKeyframes, _options?: number | KeyframeAnimationOptions) => ({ finished: Promise.resolve() }));

beforeEach(() => {
  Object.defineProperty(Element.prototype, "animate", { configurable: true, value: animate });
  animate.mockClear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function arrow(label: string): HTMLElement {
  return screen.getByRole("button", { name: label });
}

describe("PlayScreen: tapping", () => {
  it("slides a free arrow off, animates it and counts no mistake", () => {
    render(<PlayScreen target={{ id: "t1", rows: ["R.."] }} onMenu={() => {}} />);
    fireEvent.click(arrow("Arrow pointing right"));

    expect(screen.getByRole("status").textContent).toMatch(/^Cleared in \d+:\d{2}$/);
    // The exit animation runs once, for the arrow that left.
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it("bumps a blocked arrow: counts a mistake and plays one shake", () => {
    render(<PlayScreen target={{ id: "t2", rows: ["R.U", "..."] }} onMenu={() => {}} />);
    fireEvent.click(arrow("Arrow pointing right"));

    expect(screen.getByRole("status").textContent).toBe("Mistakes 1 of 3");
    // The bump shake is the only animation so far.
    expect(animate).toHaveBeenCalledTimes(1);
    const keyframes = animate.mock.calls[0]?.[0] as Keyframe[] | undefined;
    expect(keyframes?.some((frame) => String(frame.transform).includes("px"))).toBe(true);
  });

  it("loses the level after three bumps and offers a retry", () => {
    render(<PlayScreen target={{ id: "t3", rows: ["R.U", "..."] }} onMenu={() => {}} />);
    for (let i = 0; i < 3; i++) fireEvent.click(arrow("Arrow pointing right"));

    expect(screen.getByRole("status").textContent).toBe("Out of mistakes");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("undo puts a slid arrow back on the board", () => {
    render(<PlayScreen target={{ id: "t4", rows: ["R..", "..U"] }} onMenu={() => {}} />);
    fireEvent.click(arrow("Arrow pointing right"));
    expect(screen.getAllByRole("button", { name: "Cleared" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByRole("button", { name: "Cleared" })).toBeNull();
    expect(screen.getByRole("button", { name: "Arrow pointing right" })).toBeTruthy();
  });

  it("marks the hint on one free arrow, then disables the hint button", () => {
    render(<PlayScreen target={{ id: "t5", rows: ["R.U", "..."] }} onMenu={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Hint" }));

    const hinted = document.querySelectorAll(".tile.is-hint");
    expect(hinted).toHaveLength(1);
    expect((screen.getByRole("button", { name: "Hint used" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("saves progress when a board is cleared", () => {
    render(<PlayScreen target={{ id: "saved-level", rows: ["R."] }} onMenu={() => {}} />);
    fireEvent.click(arrow("Arrow pointing right"));

    expect(JSON.parse(localStorage.getItem("flowarrow:progress:v1:saved-level") ?? "null")).toMatchObject({
      solved: true,
      stars: 3,
    });
  });
});
