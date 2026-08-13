import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Vec3NumericInputGroup } from "@/components/molecules/Vec3NumericInputGroup";

const VALUE = { x: 1, y: 2, z: 3 };

describe("Vec3NumericInputGroup", () => {
  it("commits a typed exact value on blur regardless of any external snap value (AC-11)", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<Vec3NumericInputGroup legend="Position" value={VALUE} onCommit={onCommit} />);

    const xInput = screen.getByLabelText("x");
    await user.clear(xInput);
    await user.type(xInput, "1.37");
    await user.tab();

    expect(onCommit).toHaveBeenCalledWith({ x: 1.37, y: 2, z: 3 });
  });

  it("editing one axis leaves the other two untouched (AC-12)", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<Vec3NumericInputGroup legend="Rotation" value={VALUE} onCommit={onCommit} />);

    const yInput = screen.getByLabelText("y");
    await user.clear(yInput);
    await user.type(yInput, "9");
    await user.tab();

    expect(onCommit).toHaveBeenCalledWith({ x: 1, y: 9, z: 3 });
  });

  it("reverts to the last committed value on blur with no throw for non-numeric/empty input (NFR-4)", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<Vec3NumericInputGroup legend="Scale" value={VALUE} onCommit={onCommit} />);

    const zInput = screen.getByLabelText("z") as HTMLInputElement;
    await user.clear(zInput);
    await user.tab();

    expect(onCommit).not.toHaveBeenCalled();
    expect(zInput.value).toBe("3");
  });

  it("commits on Enter as well as blur", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<Vec3NumericInputGroup legend="Position" value={VALUE} onCommit={onCommit} />);

    const xInput = screen.getByLabelText("x");
    await user.clear(xInput);
    await user.type(xInput, "5{Enter}");

    expect(onCommit).toHaveBeenCalledWith({ x: 5, y: 2, z: 3 });
  });
});
