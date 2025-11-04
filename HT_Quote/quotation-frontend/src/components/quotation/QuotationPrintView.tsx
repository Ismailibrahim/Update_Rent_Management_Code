"use client";

import React from "react";

interface QuotationItem {
  id: number;
  quotation_id: number;
  product_id: number;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  currency: string;
  discount_percentage: number;
  discount_amount: number;
  tax_rate: number;
  item_total: number;
  cost_price?: number;
  total_cost?: number;
  profit?: number;
  parent_item_id?: number;
  is_amc_line: boolean;
  amc_description_used?: string;
  import_duty?: number;
  import_duty_inclusive?: boolean;
  is_service_item?: boolean;
  man_days?: number;
  created_at: string;
  updated_at: string;
  product?: {
    id: number;
    name: string;
    description: string;
  };
  amcItems?: QuotationItem[];
}

interface Quotation {
  id: number;
  quotation_number: string;
  customer_id: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  valid_until: string;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  tax_amount: number;
  total_amount: number;
  total_cost?: number;
  total_profit?: number;
  profit_margin?: number;
  notes?: string;
  terms_conditions?: string;
  selected_tc_templates?: number[];
  created_by?: number;
  sent_date?: string;
  accepted_date?: string;
  rejected_date?: string;
  created_at: string;
  updated_at: string;
  import_duty?: number;
  import_duty_inclusive?: boolean;
  customer?: {
    id: number;
    resort_name: string;
    holding_company?: string;
    contact_person: string;
    email: string;
    phone: string;
    fax?: string;
    address?: string;
    country?: string;
    contacts?: Array<{
      id: number;
      contact_person: string;
      designation?: string;
      email?: string;
      phone?: string;
      mobile?: string;
      is_primary: boolean;
      contact_type: string;
    }>;
  };
  items?: QuotationItem[];
  created_by_user?: {
    name: string;
    email: string;
  };
}

interface QuotationPrintViewProps {
  quotation: Quotation;
  companySettings?: {
    resort_name?: string;
    company_address?: string;
    company_logo?: string;
    company_phone?: string;
    company_email?: string;
    company_tax_number?: string;
  };
  currentUser?: {
    name: string;
    email: string;
  };
  serviceTerms?: Array<{
    id: number;
    title: string;
    content: string;
    page_number: number;
    display_order: number;
  }>;
}

export const QuotationPrintView = React.forwardRef<HTMLDivElement, QuotationPrintViewProps>(
  ({ quotation, companySettings, currentUser, serviceTerms }, ref) => {
  const API_BASE_URL = 'http://127.0.0.1:8000';

    // Calculate tax percentage from tax_amount and subtotal
    const taxPercentage = quotation.subtotal > 0
      ? ((quotation.tax_amount / quotation.subtotal) * 100).toFixed(0)
      : '0';

    // Calculate total import duty from items
    const totalImportDuty = quotation.items?.reduce((sum, item) => {
      return sum + (Number(item.import_duty) || 0);
    }, 0) || 0;

    // Helper function to parse service item description and extract tasks
    const parseServiceDescription = (description: string): { serviceName: string; tasks: string[] } => {
      const parts = description.split('\n\nService Tasks:\n');
      if (parts.length === 2) {
        const serviceName = parts[0];
        const tasks = parts[1].split('\n').filter(t => t.trim());
        return { serviceName, tasks };
      }
      return { serviceName: description, tasks: [] };
    };

    // Flatten items to include AMC items inline
    const flattenedItems: QuotationItem[] = [];
    quotation.items?.forEach(item => {
      // Check if this item has a parent_item_id (meaning it's an AMC item)
      if (item.parent_item_id) {
        // This is an AMC item - mark it as such
        flattenedItems.push({ ...item, is_amc_line: true, product: undefined });
      } else {
        // This is a regular item (including service items)
        flattenedItems.push(item);
        // Also check for nested amcItems
        if (item.amcItems && item.amcItems.length > 0) {
          item.amcItems.forEach(amcItem => {
            const cleanAmcItem = { ...amcItem };
            delete cleanAmcItem.product;
            cleanAmcItem.is_amc_line = true;
            flattenedItems.push(cleanAmcItem);
          });
        }
      }
    });

    return (
      <div ref={ref} className="bg-white text-black" style={{ padding: '40px 40px 120px 40px', fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
        <style>
          {`
            @media print {
              @page {
                size: A4;
                margin: 0.5cm 0.5cm 1.5cm 0.5cm;
                @bottom-right {
                  content: "Page " counter(page);
                  font-size: 10px;
                  color: #003366;
                  margin-right: 10px;
                  margin-bottom: 10px;
                }
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
              .page-break {
                page-break-before: always;
              }
            }

            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }

            .print-table th,
            .print-table td {
              border: 1px solid #ccc;
              padding: 4px 6px;
              text-align: left;
              font-size: 12px;
              line-height: 1.2;
            }

            .print-table th {
              background-color: #f0f0f0;
              font-weight: bold;
              text-align: center;
              font-size: 11px;
              padding: 3px 6px;
            }

            .text-right {
              text-align: right !important;
            }

            .text-left {
              text-align: left !important;
            }

            .text-center {
              text-align: center !important;
            }

            /* Force right alignment for numeric columns */
            .text-right {
              text-align: right !important;
            }

            /* Alternative approach - target specific table cells */
            .print-table tbody td:nth-child(4),
            .print-table tbody td:nth-child(5),
            .print-table tbody td:nth-child(6) {
              text-align: right !important;
            }

            /* Force alignment with attribute selector */
            td[class*="text-right"] {
              text-align: right !important;
            }

            /* Force specific numeric columns to right align */
            .print-table tr td:nth-child(4),
            .print-table tr td:nth-child(5),
            .print-table tr td:nth-child(6) {
              text-align: right !important;
            }

            .font-bold {
              font-weight: bold;
            }

            .totals-table {
              margin-left: auto;
              margin-top: 10px;
            }

            .totals-table td {
              padding: 4px 10px;
              border: 1px solid #ccc;
            }

            .totals-table tr:last-child td {
              font-weight: bold;
            }

            .page-break {
              page-break-before: always;
            }

            .service-terms-page {
              page-break-before: always !important;
            }

            .service-terms-page > div:first-child {
              page-break-before: always !important;
            }

            .service-terms-page > div:not(:first-child) {
              page-break-before: always !important;
            }

            @media print {
              .page-break {
                page-break-before: always;
              }
              
              .service-terms-page {
                page-break-before: always !important;
              }
              
              .service-terms-page > div:first-child {
                page-break-before: always !important;
              }
              
              .service-terms-page > div:not(:first-child) {
                page-break-before: always !important;
              }
            }
          `}
        </style>

        {/* Header with Logo */}
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          {companySettings?.company_logo && (
            <img
              src={`${API_BASE_URL}${companySettings.company_logo}`}
              alt="Company Logo"
              style={{ height: '15px', marginBottom: '10px', objectFit: 'contain' }}
            />
          )}
        </div>

        {/* Title Section */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{
            fontSize: '14px',
            fontWeight: 'bold',
            margin: '10px 0',
            color: '#003366'
          }}>
            {companySettings?.company_name || 'Hospitality Technology Pvt Ltd'}
          </h1>
          <div style={{
            backgroundColor: '#e8e8e8',
            padding: '6px',
            marginTop: '10px'
          }}>
            <h2 style={{
              fontSize: '12px',
              fontWeight: 'bold',
              margin: 0,
              color: '#003366'
            }}>QUOTATION</h2>
          </div>
        </div>

        {/* Customer and Quotation Info - Two Columns */}
        <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '20px' }}>
                <div style={{ marginBottom: '2px', minHeight: '18px' }}>
                  <span style={{ fontWeight: 'bold', color: '#003366', display: 'inline-block', width: '80px' }}>Resort :</span>
                  <span>{quotation.customer?.resort_name}</span>
                </div>
                <div style={{ marginBottom: '2px', minHeight: '18px' }}>
                  <span style={{ fontWeight: 'bold', color: '#003366', display: 'inline-block', width: '80px' }}>Attention :</span>
                  <span>
                    {quotation.customer?.contacts && quotation.customer.contacts.length > 0
                      ? (quotation.customer.contacts.find(c => c.is_primary)?.contact_person || quotation.customer.contacts[0].contact_person)
                      : quotation.customer?.contact_person}
                  </span>
                </div>
                <div style={{ marginBottom: '2px', minHeight: '18px' }}>
                  <span style={{ fontWeight: 'bold', color: '#003366', display: 'inline-block', width: '80px' }}>Phone :</span>
                  <span>
                    {quotation.customer?.contacts && quotation.customer.contacts.length > 0
                      ? (quotation.customer.contacts.find(c => c.is_primary)?.phone || quotation.customer.contacts[0].phone || quotation.customer?.phone)
                      : quotation.customer?.phone}
                  </span>
                </div>
                <div style={{ marginBottom: '2px', minHeight: '18px' }}>
                  <span style={{ fontWeight: 'bold', color: '#003366', display: 'inline-block', width: '80px' }}>Mobile :</span>
                  <span>
                    {quotation.customer?.contacts && quotation.customer.contacts.length > 0
                      ? (quotation.customer.contacts.find(c => c.is_primary)?.mobile || quotation.customer.contacts[0].mobile || quotation.customer?.fax || '')
                      : quotation.customer?.fax || ''}
                  </span>
                </div>
                <div style={{ marginBottom: '2px', minHeight: '18px' }}>
                  <span style={{ fontWeight: 'bold', color: '#003366', display: 'inline-block', width: '80px' }}>Email :</span>
                  <span>
                    {quotation.customer?.contacts && quotation.customer.contacts.length > 0
                      ? (quotation.customer.contacts.find(c => c.is_primary)?.email || quotation.customer.contacts[0].email || quotation.customer?.email)
                      : quotation.customer?.email}
                  </span>
                </div>
                <div style={{ marginBottom: '2px', minHeight: '18px' }}>
                  <span style={{ fontWeight: 'bold', color: '#003366', display: 'inline-block', width: '80px', verticalAlign: 'top' }}>Address :</span>
                  <span style={{ whiteSpace: 'pre-wrap', display: 'inline-block' }}>
                    {quotation.customer?.address || quotation.customer?.resort_name}
                  </span>
                </div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '100px' }}>
                <div style={{ marginBottom: '2px', minHeight: '18px' }}>
                  <span style={{ fontWeight: 'bold', color: '#003366', display: 'inline-block', width: '80px' }}>Prepared by :</span>
                  <span>{quotation.created_by_user?.name || 'N/A'}</span>
                </div>
                <div style={{ marginBottom: '2px', minHeight: '18px' }}>
                  <span style={{ fontWeight: 'bold', color: '#003366', display: 'inline-block', width: '80px' }}>Date :</span>
                  <span>{new Date(quotation.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                </div>
                <div style={{ marginBottom: '2px', minHeight: '18px' }}>
                  <span style={{ fontWeight: 'bold', color: '#003366', display: 'inline-block', width: '80px' }}>Validity :</span>
                  <span>{new Date(quotation.valid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                </div>
                <div style={{ marginBottom: '2px', minHeight: '18px' }}>
                  <span style={{ fontWeight: 'bold', color: '#003366', display: 'inline-block', width: '80px' }}>Email :</span>
                  <span>{quotation.created_by_user?.email || companySettings?.company_email}</span>
                </div>
                <div style={{ marginBottom: '2px', minHeight: '18px' }}>
                  <span style={{ fontWeight: 'bold', color: '#003366', display: 'inline-block', width: '80px' }}>Currency :</span>
                  <span>{quotation.currency}</span>
                </div>
                <div style={{ marginBottom: '2px', minHeight: '18px' }}>
                  <span style={{ fontWeight: 'bold', color: '#003366', display: 'inline-block', width: '80px' }}>Quote Ref:</span>
                  <span>{quotation.quotation_number}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items Table */}
        <table className="print-table" style={{ marginTop: '20px' }}>
          <thead>
            <tr>
              <th style={{ width: '5%' }}>NO</th>
              <th style={{ width: '15%' }}>P/N</th>
              <th style={{ width: '50%' }}>DESCRIPTION</th>
              <th style={{ width: '10%' }}>QTY</th>
              <th style={{ width: '10%' }}>PRICE</th>
              <th style={{ width: '10%' }}>TOTAL PRICE</th>
            </tr>
          </thead>
          <tbody>
            {flattenedItems.map((item, index) => {
              // Only count non-AMC items for numbering
              const itemNumber = flattenedItems
                .slice(0, index)
                .filter(i => !i.is_amc_line).length + (item.is_amc_line ? 0 : 1);

              // Check if this is a service item with tasks
              const isServiceWithTasks = item.is_service_item && item.description.includes('Service Tasks:');
              let serviceName = item.description;
              let serviceTasks: string[] = [];

              if (isServiceWithTasks) {
                const parsed = parseServiceDescription(item.description);
                serviceName = parsed.serviceName;
                serviceTasks = parsed.tasks.map(task => task.replace(/^\d+\.\s*/, ''));
              }

              return (
                <tr key={item.id}>
                  <td className="text-center">{item.is_amc_line ? '' : itemNumber}</td>
                  <td>{item.is_amc_line ? 'AMC' : (item.product?.sku || '-')}</td>
                  <td style={{ paddingLeft: '8px', textAlign: 'left' }}>
                    {isServiceWithTasks ? (
                      <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '2px', fontSize: '11px' }}>{serviceName}</div>
                      <div style={{ paddingLeft: '12px' }}>
                        {serviceTasks.map((task, idx) => (
                          <div key={idx} style={{ marginBottom: '1px', fontSize: '10px' }}>• {task}</div>
                        ))}
                      </div>
                      </div>
                    ) : (
                      item.description
                    )}
                  </td>
                  <td className="text-right" style={{textAlign: 'right'}}>
                    {item.is_service_item ? 'Lot' : (item.quantity === Math.floor(item.quantity) ? item.quantity : Number(item.quantity).toFixed(2))}
                  </td>
                  <td className="text-right" style={{textAlign: 'right'}}>{Number(item.unit_price).toFixed(2)}</td>
                  <td className="text-right" style={{textAlign: 'right'}}>{Number(item.item_total).toFixed(2)}</td>
                </tr>
              );
            })}
            {/* Totals Row - OPTION 1 */}
            <tr>
              <td colSpan={3} style={{ border: 'none' }}></td>
                <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold', padding: '2px 6px', fontSize: '11px' }}>SUBTOTAL</td>
                <td className="font-bold text-right" style={{ padding: '2px 6px', textAlign: 'right', fontSize: '11px' }}>{Number(quotation.subtotal).toFixed(2)}</td>
            </tr>
            {Number(quotation.discount_amount) > 0 && (
              <tr>
                <td colSpan={3} style={{ border: 'none' }}></td>
                <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold', padding: '2px 6px', fontSize: '11px' }}>
                  DISCOUNT {Number(quotation.discount_percentage) > 0 ? `${Number(quotation.discount_percentage).toFixed(0)}%` : ''}
                </td>
                <td className="font-bold text-right" style={{ padding: '2px 6px', textAlign: 'right', fontSize: '11px' }}>-{Number(quotation.discount_amount).toFixed(2)}</td>
              </tr>
            )}
            {totalImportDuty > 0 && (
              <tr>
                <td colSpan={3} style={{ border: 'none' }}></td>
                <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold', padding: '2px 6px', fontSize: '11px' }}>IMPORT DUTY</td>
                <td className="font-bold text-right" style={{ padding: '2px 6px', textAlign: 'right', fontSize: '11px' }}>{Number(totalImportDuty).toFixed(2)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} style={{ border: 'none' }}></td>
              <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold', padding: '2px 6px', fontSize: '11px' }}>GST {taxPercentage}%</td>
              <td className="font-bold text-right" style={{ padding: '2px 6px', textAlign: 'right', fontSize: '11px' }}>{Number(quotation.tax_amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={3} style={{ border: 'none' }}></td>
              <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold', padding: '2px 6px', fontSize: '11px' }}>TOTAL</td>
              <td className="font-bold text-right" style={{ padding: '2px 6px', textAlign: 'right', fontSize: '11px' }}>{Number(quotation.total_amount).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Notes Section */}
        {quotation.notes && (
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Note:</div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '11px' }}>
              {quotation.notes}
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        {quotation.terms_conditions && (
          <div style={{ marginTop: '20px', marginBottom: '40px', pageBreakBefore: 'auto' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Terms & Conditions:</div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '11px' }}>
              {quotation.terms_conditions}
            </div>
          </div>
        )}

        {/* Service Terms Section */}
        {serviceTerms && serviceTerms.length > 0 && (
          <div className="service-terms-page">
            {serviceTerms.map((term, index) => (
              <div key={term.id} style={{ marginTop: '30px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '15px',
                    textAlign: 'center',
                    color: '#003366',
                    borderBottom: '2px solid #003366',
                    paddingBottom: '5px'
                  }}>
                    {term.title}
                  </h2>
                  <div 
                    style={{
                      fontSize: '11px',
                      lineHeight: '1.4',
                      textAlign: 'left'
                    }}
                    dangerouslySetInnerHTML={{ __html: term.content }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          position: 'fixed',
          bottom: '5px',
          left: '0',
          right: '0',
          padding: '10px',
          textAlign: 'center',
          fontSize: '10px',
          backgroundColor: 'white'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {companySettings?.company_name || 'Your Company Name'}
          </div>
          <div>{companySettings?.company_address || ''}</div>
          <div>Phone: {companySettings?.company_phone || ''} | {companySettings?.company_email || ''}</div>
          {companySettings?.company_tax_number && (
            <div>TIN: {companySettings.company_tax_number}</div>
          )}
        </div>
      </div>
    );
  }
);

QuotationPrintView.displayName = "QuotationPrintView";
