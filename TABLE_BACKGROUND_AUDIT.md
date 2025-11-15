# Table Background Color Audit

## Pages with `bg-white` on Card/Table Wrapper ✅

1. **Assets** (`/assets/page.tsx`)
   - Card: `bg-white border border-gray-200` ✅

2. **Roles** (`/roles/page.tsx`)
   - Card: `bg-white border border-gray-200` ✅

3. **Payment Types** (`/payment-types/page.tsx`)
   - Card: `bg-white border border-gray-200` ✅

4. **Payment Modes** (`/payment-modes/page.tsx`)
   - Card: `bg-white border border-gray-200` ✅

5. **Employees** (`/employees/page.tsx`)
   - Card: `bg-white border border-gray-200` ✅

## Pages WITHOUT `bg-white` on Card/Table Wrapper ❌

1. **Properties** (`/properties/page.tsx`)
   - Card: `shadow-md border border-gray-200` ❌ (Missing `bg-white`)

2. **Tenants** (`/tenants/page.tsx`)
   - Card: No explicit background class ❌ (Just `<Card>` with default styling)

3. **Rental Units** (`/rental-units/page.tsx`)
   - Card: `shadow-md border border-gray-200` ❌ (Missing `bg-white`)

4. **Invoices** (`/invoices/page.tsx`)
   - Card: `flex-1 overflow-hidden` ❌ (Missing `bg-white`)

5. **Rent Invoices** (`/rent-invoices/page.tsx`)
   - Card: `w-full` ❌ (Missing `bg-white`)

6. **Tenant Ledger** (`/tenant-ledger/page.tsx`)
   - Card: `p-4 md:p-6` ❌ (Missing `bg-white`)

7. **Properties Detail** (`/properties/[id]/page.tsx`)
   - Table wrapper: No explicit background ❌

## Summary

- **With `bg-white`**: 5 pages
- **Without `bg-white`**: 7 pages

## Recommendation

All main table containers should have `bg-white` for consistency. The pages that need updating:
1. Properties
2. Tenants  
3. Rental Units
4. Invoices
5. Rent Invoices
6. Tenant Ledger
7. Properties Detail

