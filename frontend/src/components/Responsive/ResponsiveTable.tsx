'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '../UI/Card';
import { Button } from '../UI/Button';

interface ResponsiveTableProps<T> {
  data: T[];
  columns: {
    header: string | React.ReactNode;
    accessor: keyof T | ((row: T) => React.ReactNode);
    mobileLabel?: string;
    mobilePriority?: 'high' | 'medium' | 'low'; // High = always shown, Low = hidden on small screens
    className?: string;
  }[];
  keyExtractor: (row: T) => string | number;
  actions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  className?: string;
}

/**
 * ResponsiveTable - Automatically shows table on desktop and cards on mobile
 * 
 * Usage:
 * <ResponsiveTable
 *   data={currencies}
 *   keyExtractor={(item) => item.id}
 *   columns={[
 *     { header: 'ID', accessor: 'id', mobileLabel: 'ID' },
 *     { header: 'Code', accessor: 'code', mobileLabel: 'Currency Code' },
 *   ]}
 *   actions={(row) => <Button>Edit</Button>}
 * />
 */
export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  actions,
  emptyMessage = 'No data available',
  emptyIcon,
  emptyAction,
  className = '',
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        {emptyIcon}
        <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
        <p className="mt-1 text-sm text-gray-500">{emptyMessage}</p>
        {emptyAction && (
          <div className="mt-6">
            {emptyAction}
          </div>
        )}
      </div>
    );
  }

  const getValue = (row: T, accessor: keyof T | ((row: T) => React.ReactNode)): React.ReactNode => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return row[accessor] ?? '-';
  };

  // Memoize filtered columns for mobile (hide low priority columns on very small screens)
  const mobileColumns = useMemo(() => 
    columns.filter(col => col.mobilePriority !== 'low'),
    [columns]
  );

  return (
    <div className={className}>
      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden md:block">
        <Card className="bg-white shadow-md border border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((column, index) => (
                      <th
                        key={index}
                        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                      >
                        {column.header}
                      </th>
                    ))}
                    {actions && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((row) => (
                    <tr key={keyExtractor(row)} className="hover:bg-gray-50 transition-colors">
                      {columns.map((column, index) => (
                        <td
                          key={index}
                          className={`px-4 py-4 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}
                        >
                          {getValue(row, column.accessor)}
                        </td>
                      ))}
                      {actions && (
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {actions(row)}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Card View - Hidden on desktop */}
      <div className="md:hidden space-y-3">
        {data.map((row) => (
          <Card key={keyExtractor(row)} className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {mobileColumns.map((column, index) => {
                  const value = getValue(row, column.accessor);
                  const label = column.mobileLabel || (typeof column.header === 'string' ? column.header : '');
                  
                  return (
                    <div key={index} className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {label}
                      </span>
                      <span className="text-sm text-gray-900 text-right flex-1">
                        {value}
                      </span>
                    </div>
                  );
                })}
                
                {actions && (
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-end gap-2">
                    {actions(row)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

