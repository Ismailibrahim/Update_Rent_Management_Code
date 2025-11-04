import React, { forwardRef, useState, useEffect } from 'react';

interface QuotationPrintViewSparePartsProps {
  quotation: any;
  companySettings: any;
  currentUser: any;
  serviceTerms?: any[];
  customTerms?: string[];
  customClosingStatement?: string;
  hardwareRepairDetails?: any;
}

const QuotationPrintViewSpareParts = forwardRef<HTMLDivElement, QuotationPrintViewSparePartsProps>(
  ({ quotation, companySettings, currentUser, serviceTerms = [], customTerms, customClosingStatement, hardwareRepairDetails }, ref) => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const [sparePartsTemplate, setSparePartsTemplate] = useState<any>(null);

    // Get primary contact or first contact
    const primaryContact = quotation.customer?.contacts?.find((contact: any) => contact.is_primary) || quotation.customer?.contacts?.[0];

    // Fetch spare parts template from API
    useEffect(() => {
      const fetchSparePartsTemplate = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/terms-conditions/spare-parts-template`);
          if (response.ok) {
            const template = await response.json();
            setSparePartsTemplate(template);
          }
        } catch (error) {
          console.error('Error fetching spare parts template:', error);
        }
      };

      fetchSparePartsTemplate();
    }, [quotation.id]); // Use quotation.id as dependency to ensure it runs when quotation changes

    // Calculate tax percentage from tax_amount and subtotal
    const taxPercentage = quotation.subtotal > 0 
      ? ((quotation.tax_amount / quotation.subtotal) * 100).toFixed(0)
      : '8';

    // Default terms and conditions (fallback)
    const defaultTerms = [
      'All prices are quoted in US Dollar',
      'The above rate is assigned for the job listed/sparepart listed on the proposal only.',
      'No trouble shooting for 3rd party application.',
      'Delivery is 3 weeks upon receipt of PO/Signed and Returned quotation.',
      'The Validity of this quote is 30 days from date of quotation.',
      'Terms of payment is 100% up on PO unless otherwise stated.',
      'Once Signed Quote or PO (if any) received, any part of the order can\'t be cancelled.'
    ];

    const defaultClosingStatement = 'We trust that the above is satisfactory and therefore look forward to your kind approval.\nPlease do not hesitate to contact us at 332 3377 if you have any queries. Please endorse and return the same for our administration. Thank you.';

    // Use custom terms if provided, otherwise use database template, otherwise use defaults
    let termsAndConditionsContent: string;

    if (customTerms && customTerms.length > 0) {
      // Convert custom terms array to formatted string
      termsAndConditionsContent = customTerms.map(term => `• ${term}`).join('\n\n') + '\n\n' + (customClosingStatement || defaultClosingStatement);
    } else if (sparePartsTemplate && sparePartsTemplate.content) {
      // Use the exact content from database, preserving all formatting
      termsAndConditionsContent = sparePartsTemplate.content;
    } else {
      // Use default formatted content
      termsAndConditionsContent = defaultTerms.map(term => `• ${term}`).join('\n\n') + '\n\n' + defaultClosingStatement;
    }

    return (
      <div ref={ref} style={{ 
        padding: '40px 40px 20px 40px', 
        fontFamily: 'Arial, sans-serif', 
        fontSize: '10px', 
        lineHeight: '1.2',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Main Content Container */}
        <div style={{ flex: '1' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ 
              fontSize: '18px', 
              margin: '0 0 10px 0', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              <span style={{ color: '#d32f2f' }}>HOSPITALITY</span> | <span style={{ color: '#1976d2' }}>TECHNOLOGY</span>
            </h1>
          </div>

        {/* Customer and Quotation Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '10px' }}>
          {/* Customer Information */}
          <div style={{ width: '45%' }}>
            <div style={{ marginBottom: '4px' }}><strong>To:</strong> {primaryContact?.contact_person || 'N/A'}</div>
            <div style={{ marginBottom: '4px' }}><strong>Company/Resort:</strong> {quotation.customer?.resort_name || quotation.customer?.company_name || 'N/A'}</div>
            <div style={{ marginBottom: '4px' }}><strong>Email:</strong> {primaryContact?.email || 'N/A'}</div>
            <div style={{ marginBottom: '4px' }}><strong>Customer Address:</strong> {quotation.customer?.address || 'N/A'}</div>
          </div>

          {/* Quotation Details */}
          <div style={{ width: '45%', paddingLeft: '60px' }}>
            <div style={{ marginBottom: '4px' }}><strong>Sent By:</strong> {currentUser?.name || currentUser?.full_name || 'N/A'}</div>
            <div style={{ marginBottom: '4px' }}><strong>Company:</strong> {companySettings?.company_name || 'Hospitality Technology Pvt Ltd'}</div>
            <div style={{ marginBottom: '4px' }}><strong>Telephone:</strong> {companySettings?.phone || '960 332 3377'}</div>
            <div style={{ marginBottom: '4px' }}><strong>Date:</strong> {new Date(quotation.created_at).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
            <div style={{ marginBottom: '4px' }}><strong>Validity:</strong> {new Date(quotation.valid_until).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
            <div style={{ marginBottom: '4px' }}><strong>Quote Ref:</strong> {quotation.quotation_number}</div>
          </div>
        </div>

        {/* Subject and Introduction */}
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
            Subject: Quotation for Support Service/Repair/Spare Parts
          </h3>
          <p style={{ marginBottom: '8px', fontSize: '10px' }}>
            {companySettings?.company_name || 'Hospitality Technology Pvt Ltd'} is pleased to provide you with the following quotation for your esteemed organization:
          </p>
          <p style={{ marginBottom: '8px', fontSize: '10px', fontWeight: 'bold' }}>
            HARDWARE/SOFTWARE/REPAIR
          </p>
          <p style={{ marginBottom: '15px', fontSize: '10px', fontWeight: 'bold' }}>
            SERIAL NUMBER: {hardwareRepairDetails?.serial_numbers ? 
              hardwareRepairDetails.serial_numbers
                .split('\n')
                .filter(serialNumber => serialNumber.trim())
                .map(serialNumber => serialNumber.trim())
                .join(', ') 
              : ''}
          </p>
        </div>

        {/* Items Table */}
        <table style={{
          width: '100%', 
          borderCollapse: 'collapse', 
          marginBottom: '15px',
          fontSize: '10px',
          tableLayout: 'fixed'
        }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold', width: '5%' }}>No.</th>
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 'bold', width: '10%' }}>Part Number</th>
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 'bold', width: '45%' }}>Description</th>
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold', width: '10%' }}>Qty</th>
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 'bold', width: '15%' }}>Unit Price</th>
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', fontWeight: 'bold', width: '15%' }}>Item Total</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items?.filter((item: any) => !item.is_amc_line).map((item: any, index: number) => (
              <tr key={item.id}>
                <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '5%' }}>
                  {index + 1}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', width: '10%' }}>
                  {item.product?.name || 'N/A'}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', width: '45%' }}>
                  {item.description}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '10%' }}>
                  {Number(item.quantity || 0).toFixed(2)}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', width: '15%' }}>
                  {Number(item.unit_price || 0).toFixed(2)}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', width: '15%' }}>
                  {Number(item.item_total || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 15px 3px 3px', textAlign: 'left' }} colSpan={5}>
                <strong>Labour Charges:</strong>
              </td>
              <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right', fontWeight: 'bold' }} colSpan={1}>
                {hardwareRepairDetails?.labour_inclusive ? 'Inclusive' : (hardwareRepairDetails?.labour_charges ? `${Number(hardwareRepairDetails.labour_charges).toFixed(2)}` : '')}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 15px 3px 3px', textAlign: 'left' }} colSpan={5}>
                <strong>Duty & Freight:</strong>
              </td>
              <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right', fontWeight: 'bold' }} colSpan={1}>
                {(() => {
                  // Calculate total import duty from quotation items
                  const items = quotation.items || [];
                  const totalImportDuty = items.reduce((sum: number, item: any) => {
                    // Only include items that don't have import_duty_inclusive checked
                    if (!item.import_duty_inclusive && item.import_duty) {
                      return sum + Number(item.import_duty || 0);
                    }
                    return sum;
                  }, 0);
                  
                  // Check if all items with import duty have it marked as inclusive
                  const itemsWithImportDuty = items.filter((item: any) => 
                    (item.import_duty && Number(item.import_duty) > 0) || item.import_duty_inclusive
                  );
                  const allInclusive = itemsWithImportDuty.length > 0 && 
                    itemsWithImportDuty.every((item: any) => item.import_duty_inclusive);
                  
                  if (allInclusive && itemsWithImportDuty.length > 0) {
                    return 'Inclusive';
                  } else if (totalImportDuty > 0) {
                    return Number(totalImportDuty).toFixed(2);
                  } else {
                    return '';
                  }
                })()}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 15px 3px 3px', textAlign: 'left' }} colSpan={5}>
                <strong>Subtotal USD:</strong>
              </td>
              <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right', fontWeight: 'bold' }} colSpan={1}>
                {Number(quotation.subtotal || 0).toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 15px 3px 3px', textAlign: 'left' }} colSpan={5}>
                <strong>GST{taxPercentage}% :</strong>
              </td>
              <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right', fontWeight: 'bold' }} colSpan={1}>
                {Number(quotation.tax_amount || 0).toFixed(2)}
              </td>
            </tr>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <td style={{ border: '1px solid #000', padding: '3px 15px 3px 3px', textAlign: 'left' }} colSpan={5}>
                <strong>Total USD:</strong>
              </td>
              <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right', fontWeight: 'bold' }} colSpan={1}>
                {(() => {
                  // Calculate total: Subtotal + Labour + Import Duty + GST
                  const items = quotation.items || [];
                  
                  // Items subtotal
                  const subtotal = Number(quotation.subtotal || 0);
                  
                  // Labour charges (only if not inclusive)
                  const labourCharges = hardwareRepairDetails?.labour_inclusive 
                    ? 0 
                    : Number(hardwareRepairDetails?.labour_charges || 0);
                  
                  // Import duty from items (only non-inclusive)
                  const importDuty = items.reduce((sum: number, item: any) => {
                    if (!item.import_duty_inclusive && item.import_duty) {
                      return sum + Number(item.import_duty || 0);
                    }
                    return sum;
                  }, 0);
                  
                  // GST tax
                  const gst = Number(quotation.tax_amount || 0);
                  
                  // Total = Subtotal + Labour + Import Duty + GST
                  const total = subtotal + labourCharges + importDuty + gst;
                  
                  return Number(total).toFixed(2);
                })()}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Case Numbers Section */}
        {hardwareRepairDetails?.case_numbers && (
          <div style={{ marginTop: '15px', marginBottom: '15px', fontSize: '10px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
              Case Numbers
            </h3>
            <div style={{ lineHeight: '1.2' }}>
              {hardwareRepairDetails.case_numbers
                .split('\n')
                .filter(caseNumber => caseNumber.trim())
                .map((caseNumber, index) => `${index + 1}. ${caseNumber.trim()}`)
                .join(', ')}
            </div>
          </div>
        )}

        {/* Notes / Terms & Conditions */}
        <div style={{ marginBottom: '15px', fontSize: '10px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
            Notes / Terms & Conditions
          </h3>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.2' }}>
            {termsAndConditionsContent}
          </div>
        </div>

        {/* Acceptance and Offer Sections - Table Format */}
        <div style={{ marginTop: '20px', fontSize: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {/* Text Row */}
              <tr>
                <td style={{ padding: '10px', width: '50%', verticalAlign: 'top', fontSize: '9px' }}>
                  <strong>Acceptance</strong><br/>
                  We hereby accept the above proposal based on the aforesaid terms and conditions, and authorize Hospitality Technology Pvt Ltd to treat this as our official purchase order
                </td>
                <td style={{ padding: '10px', width: '50%', verticalAlign: 'top', fontSize: '9px' }}>
                  <strong>Offer</strong><br/>
                  For and behalf of Hospitality Technology Pvt Ltd
                </td>
              </tr>
              
              {/* Empty Row */}
              <tr>
                <td style={{ padding: '0px', width: '50%', height: '40px' }}></td>
                <td style={{ padding: '0px', width: '50%', height: '40px' }}></td>
              </tr>
              
              {/* Signature Row */}
              <tr>
                <td style={{ padding: '10px', verticalAlign: 'top' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ borderTop: '1px solid #000', width: 'fit-content', paddingTop: '10px', marginBottom: '15px' }}>
                      <strong>Authorised Signature / Company Stamp</strong>
                    </div>
                  </div>
                  <div style={{ marginBottom: '4px' }}>Name: _____________________</div>
                  <div>Designation: _____________________</div>
                </td>
                <td style={{ padding: '10px', verticalAlign: 'top' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ borderTop: '1px solid #000', width: 'fit-content', paddingTop: '10px', marginBottom: '15px' }}>
                      <strong>Authorised Signature / Company Stamp</strong>
                    </div>
                  </div>
                  <div style={{ marginBottom: '4px' }}>Name: Feri Kurniawan</div>
                  <div>Designation: General Manager</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: 'auto',
          paddingTop: '20px', 
          fontSize: '9px', 
          textAlign: 'center',
          color: '#333',
          borderTop: '1px solid #ddd'
        }}>
          <div style={{ marginBottom: '3px', fontWeight: 'bold' }}>
            Hospitality Technology Pvt Ltd
          </div>
          <div style={{ marginBottom: '3px' }}>
            9th Floor G. Finivilu | Dhonadharaadha Hingun | Malé 20109 | Republic of Maldives
          </div>
          <div style={{ marginBottom: '8px' }}>
            TIN: 105332GST501 | Phone 960.332 3377 | www.hospitalitytechnology.com.mv
          </div>
          <div style={{ fontSize: '8px', color: '#666' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    );
  }
);

QuotationPrintViewSpareParts.displayName = 'QuotationPrintViewSpareParts';

export default QuotationPrintViewSpareParts;

