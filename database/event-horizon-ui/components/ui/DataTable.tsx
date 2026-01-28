"use client";

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    density?: "normal" | "compact";
}

export function DataTable<TData, TValue>({
    columns,
    data,
    density = "normal",
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState({});

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            rowSelection,
        },
    });

    return (
        <div className={cn("w-full h-full flex flex-col", density === "normal" && "space-y-4")}>
            <div className={cn("flex-1 overflow-auto", density === "normal" && "rounded-md border border-white/10")}>
                <table className="w-full text-sm text-left border-collapse">
                    <thead className={cn(
                        "text-xs text-gray-400 sticky top-0 z-10 shadow-sm border-b border-[#333] bg-[#0d0d0d]",
                        density === "compact" ? "" : "bg-white/5"
                    )}>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <th key={header.id} className={cn(
                                            "font-medium border-r border-[#333] whitespace-nowrap bg-[#1a1a1a]",
                                            density === "compact" ? "px-4 py-2" : "px-6 py-3"
                                        )}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody className={cn("divide-y divide-[#333]", density === "compact" ? "bg-transparent" : "bg-transparent")}>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className={cn(
                                        "transition-colors group hover:bg-[#1a1a1a]",
                                        density === "compact" ? "" : ""
                                    )}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className={cn(
                                            "whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] border-b border-r border-[#262626]",
                                            density === "compact"
                                                ? "px-4 py-1.5 text-gray-300 text-[11px] font-mono antialiased"
                                                : "px-6 py-4 text-sm font-mono"
                                        )}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="h-24 text-center text-gray-500">
                                    No results.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {density === "normal" && (
                <div className="flex items-center justify-end space-x-2 py-4">
                    <button
                        className="p-2 border border-white/10 rounded hover:bg-white/10 disabled:opacity-50"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        className="p-2 border border-white/10 rounded hover:bg-white/10 disabled:opacity-50"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
