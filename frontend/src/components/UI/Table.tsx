'use client';

import React from 'react';

export function Table({ children, className, ...props }: React.HTMLAttributes<HTMLTableElement> & { children: React.ReactNode }) {
  return (
    <table className={`min-w-full divide-y divide-gray-200 ${className ?? ''}`} {...props}>
      {children}
    </table>
  );
}

export function TableHeader({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & { children: React.ReactNode }) {
  return (
    <thead className={className} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & { children: React.ReactNode }) {
  return (
    <tbody className={`divide-y divide-gray-200 ${className ?? ''}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { children: React.ReactNode }) {
  return (
    <tr className={className} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className ?? ''}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode }) {
  return (
    <td className={`px-4 py-3 text-sm text-gray-900 ${className ?? ''}`} {...props}>
      {children}
    </td>
  );
}


