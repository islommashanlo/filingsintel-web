import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type Column } from "./DataTable";

type Row = { id: number; name: string; value: number };
const rows: Row[] = [
  { id: 1, name: "Alpha", value: 10 },
  { id: 2, name: "Beta", value: 20 },
];
const columns: Column<Row>[] = [
  { key: "name", label: "Name", sort: "name", render: (r) => r.name },
  { key: "value", label: "Value", sort: "value", num: true, render: (r) => r.value },
  { key: "note", label: "Note", render: () => "n/a" },
];

describe("DataTable", () => {
  it("renders rows with card-mode labels on every cell after the first", () => {
    render(<DataTable caption="Sample" columns={columns} rows={rows} rowKey={(r) => r.id} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    const cell = screen.getByText("20");
    expect(cell).toHaveAttribute("data-label", "Value");
    expect(screen.getByText("Alpha")).not.toHaveAttribute("data-label");
  });

  it("exposes the current sort through aria-sort", () => {
    render(<DataTable caption="Sample" columns={columns} rows={rows} rowKey={(r) => r.id} sort="-value" onSort={() => {}} />);
    expect(screen.getByRole("columnheader", { name: /Value/ })).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute("aria-sort", "none");
    expect(screen.getByRole("columnheader", { name: "Note" })).not.toHaveAttribute("aria-sort");
  });

  it("requests descending first, then toggles to ascending", async () => {
    const onSort = vi.fn();
    const { rerender } = render(<DataTable caption="Sample" columns={columns} rows={rows} rowKey={(r) => r.id} sort="name" onSort={onSort} />);
    await userEvent.click(screen.getByRole("button", { name: /Value/ }));
    expect(onSort).toHaveBeenLastCalledWith("-value");
    rerender(<DataTable caption="Sample" columns={columns} rows={rows} rowKey={(r) => r.id} sort="-value" onSort={onSort} />);
    await userEvent.click(screen.getByRole("button", { name: /Value/ }));
    expect(onSort).toHaveBeenLastCalledWith("value");
  });
});
