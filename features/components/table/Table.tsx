
import React, {useEffect} from 'react'
import { useTable, useFilters, useGlobalFilter, useAsyncDebounce, useSortBy, usePagination } from 'react-table'
import { TableButton, PageButton } from 'features/components/table/TableButton'
import { SortIcon, SortUpIcon, SortDownIcon } from 'features/components/table/TableIcons'
import {HiChevronDoubleLeft, HiChevronDoubleRight, HiChevronLeft, HiChevronRight} from "react-icons/hi";
import clsx from "clsx";

// Define a default UI for filtering
function GlobalFilter({
                          preGlobalFilteredRows,
                          globalFilter,
                          setGlobalFilter,
                      }) {
    const count = preGlobalFilteredRows.length
    const [value, setValue] = React.useState(globalFilter)
    const onChange = useAsyncDebounce(value => {
        setGlobalFilter(value || undefined)
    }, 200)

    return (
        <label className="flex gap-x-2 items-baseline">
            <span className="text-gray-700">Search: </span>
            <input
                type="text"
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={value || ""}
                onChange={e => {
                    setValue(e.target.value);
                    onChange(e.target.value);
                }}
                placeholder={`${count} records...`}
            />
        </label>
    )
}

// This is a custom filter UI for selecting
// a unique option from a list
export function SelectColumnFilter({
                                       column: { filterValue, setFilter, preFilteredRows, id, render },
                                   }) {
    // Calculate the options for filtering
    // using the preFilteredRows
    const options = React.useMemo(() => {
        const options = new Set()
        preFilteredRows.forEach(row => {
            options.add(row.values[id])
        })
        return [...options.values()]
    }, [id, preFilteredRows])

    // Render a multi-select box
    return (
        <label className="flex gap-x-2 items-baseline">
            <span className="text-gray-700">{render("Header")}: </span>
            <select
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                name={id}
                id={id}
                value={filterValue}
                onChange={e => {
                    setFilter(e.target.value || undefined)
                }}
            >
                <option value="">All</option>
                {options.map((option, i) => (
                    <option key={i} value={option as string}>
                        {option as string}
                    </option>
                ))}
            </select>
        </label>
    )
}

const defaultPropGetter:any = (row, cell, j, className) => ({className})

function Table({ columns, data , defaultPageSize=50, getCellProps=defaultPropGetter, rowProps= (row) => ({})}) {
    // Use the state and functions returned from useTable to build your UI
    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        prepareRow,
        page, // Instead of using 'rows', we'll use page,
        // which has only the rows for the active page

        // The rest of these things are super handy, too ;)
        canPreviousPage,
        canNextPage,
        pageOptions,
        pageCount,
        gotoPage,
        nextPage,
        previousPage,
        setPageSize,
        state,
        preGlobalFilteredRows,
        setGlobalFilter,
    } = useTable({
            columns,
            data,
        },
        useFilters, // useFilters!
        useGlobalFilter,
        useSortBy,
        usePagination,  // new
    )

    useEffect(() => {
        setPageSize(defaultPageSize);
    }, []);

    // Render the UI for your table
    return (
        <>
            <div className="sm:flex sm:gap-x-2">
                <GlobalFilter
                    preGlobalFilteredRows={preGlobalFilteredRows}
                    globalFilter={state.globalFilter}
                    setGlobalFilter={setGlobalFilter}
                />
                {headerGroups.map((headerGroup) =>
                    headerGroup.headers.map((column) =>
                        column.Filter ? (
                            <div className="mt-2 sm:mt-0" key={column.id}>
                                {column.render("Filter")}
                            </div>
                        ) : null
                    )
                )}
            </div>
            {/* table */}
            <div className="mt-4 flex flex-col">
                <div className="-my-2 overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                            <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                {headerGroups.map((headerGroup, i) => (
                                    <tr {...headerGroup.getHeaderGroupProps()} key={i}>
                                        {headerGroup.headers.map((column, j) => (
                                            // Add the sorting props to control sorting. For this example
                                            // we can add them into the header props
                                            <th key={j}
                                                scope="col"
                                                className={clsx(i === 0? "text-base" : "text-xs", "group px-2 py-1 font-medium text-gray-500 ")}
                                                {...column.getHeaderProps(column.getSortByToggleProps())}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="font-bold text-center grow">{column.render('Header')}</div>
                                                    {/* Add a sort direction indicator */}
                                                    <span>
                              {column.isSorted
                                  ? column.isSortedDesc
                                      ? <SortDownIcon className="w-4 h-4 text-gray-400" />
                                      : <SortUpIcon className="w-4 h-4 text-gray-400" />
                                  : (
                                      <SortIcon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                                  )}
                                                    </span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                                </thead>
                                <tbody
                                    {...getTableBodyProps()}
                                    className="bg-white divide-y divide-gray-200"
                                >
                                {page.map((row, i) => {  // new
                                    prepareRow(row)
                                    return (
                                        <tr {...row.getRowProps(rowProps(row))} key={i}>
                                            {row.cells.map((cell,j) => {
                                                return (
                                                    <td key={j}
                                                        {...cell.getCellProps()}
                                                        {...getCellProps(row, cell, j, "px-2 py-1 text-sm text-gray-500")}
                                                        role="cell"
                                                    >
                                                        {cell.column.Cell.name === "defaultRenderer"
                                                            ? <div>{cell.render('Cell')}</div>
                                                            : cell.render('Cell')
                                                        }
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            {/* Pagination */}
            <div className="py-3 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                    <TableButton onClick={() => previousPage()} disabled={!canPreviousPage}>Previous</TableButton>
                    <TableButton onClick={() => nextPage()} disabled={!canNextPage}>Next</TableButton>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="flex gap-x-2 items-baseline">
                        <span className="text-sm text-gray-700">
                            Page <span className="font-medium">{state.pageIndex + 1}</span> of <span className="font-medium">{pageOptions.length}</span>
                        </span>
                        <label>
                            <span className="sr-only">Items Per Page</span>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                value={state.pageSize}
                                onChange={e => {
                                    setPageSize(Number(e.target.value))
                                }}
                            >
                                {[50, 100, 1000].map(pageSize => (
                                    <option key={pageSize} value={pageSize}>
                                        Show {pageSize}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <PageButton
                                className="rounded-l-md"
                                onClick={() => gotoPage(0)}
                                disabled={!canPreviousPage}
                            >
                                <span className="sr-only">First</span>
                                <HiChevronDoubleLeft className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </PageButton>
                            <PageButton
                                onClick={() => previousPage()}
                                disabled={!canPreviousPage}
                            >
                                <span className="sr-only">Previous</span>
                                <HiChevronLeft className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </PageButton>
                            <PageButton
                                onClick={() => nextPage()}
                                disabled={!canNextPage
                                }>
                                <span className="sr-only">Next</span>
                                <HiChevronRight className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </PageButton>
                            <PageButton
                                className="rounded-r-md"
                                onClick={() => gotoPage(pageCount - 1)}
                                disabled={!canNextPage}
                            >
                                <span className="sr-only">Last</span>
                                <HiChevronDoubleRight className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </PageButton>
                        </nav>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Table;