<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ServiceTermsTemplate;

class ServiceTermsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $serviceTerms = [
            [
                'title' => '',
                'content' => '<div style="font-family: Arial, sans-serif; color: #003366; font-size: 11px; line-height: 1.3; position: relative;">
<div style="margin-bottom: 15px;">
<h1 style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #003366;">HOSPITALITY | TECHNOLOGY TERMS & CONDITIONS</h1>
</div>

<div style="margin-bottom: 15px;">
<h2 style="font-size: 12px; font-weight: bold; margin-bottom: 6px; color: #003366;">Payment Terms:</h2>
<p style="margin-bottom: 4px; line-height: 1.3; font-size: 11px; color: #003366;">100% of Total to be paid upon confirmation.</p>
<p style="margin-bottom: 4px; line-height: 1.3; font-size: 11px; color: #003366;">The foreign exchange rate will be applying the TT selling rate on the date of issuing the invoice. Customers are responsible for all applicable taxes and duties.</p>
<p style="margin-bottom: 4px; line-height: 1.3; font-size: 11px; color: #003366;">Payment must be made as specified on the Invoice. The invoice amount is due and payable net of any bank charges which may be levied by either the originating bank or receiving bank.</p>
<p style="margin-bottom: 4px; line-height: 1.3; font-size: 11px; color: #003366;">Support Fee shall be due and payable annually in advance immediately upon receipt of invoice. A copy of the Service Level Agreement (SLA) will be provided to the customer to describe the support services provided.</p>
</div>

<div style="margin-bottom: 15px;">
<p style="margin-bottom: 4px; line-height: 1.3; font-size: 11px; color: #003366;">HOSPITALITY | TECHNOLOGY reserves the right to make technical changes and to correct errors in the quotation.</p>
<p style="margin-bottom: 4px; line-height: 1.3; font-size: 11px; color: #003366;">The above proposal is only preliminary and subject to confirmation by signing below proposal by Customer</p>
</div>

<div style="margin-bottom: 15px;">
<h2 style="font-size: 12px; font-weight: bold; margin-bottom: 6px; color: #003366;">Important Notes:</h2>
<ol style="margin-left: 15px; line-height: 1.3; font-size: 11px;">
<li style="margin-bottom: 4px; color: #003366;">Please see accompanied Standard Engagement Terms for the services to be provided.</li>
<li style="margin-bottom: 4px; color: #003366;">The products proposed are subject to the Terms & Conditions from each of the Principal\'s, which the customer may be required to sign separately</li>
</ol>
</div>

<div style="margin-bottom: 15px;">
<p style="margin-bottom: 4px; line-height: 1.3; font-size: 11px; color: #003366;">Payment can be made through these Bank Accounts:</p>
<div style="margin-left: 15px; line-height: 1.3; font-size: 11px;">
<p style="margin-bottom: 2px; color: #003366;"><strong>Bank Name:</strong> Bank of Maldives</p>
<p style="margin-bottom: 2px; color: #003366;"><strong>Branch Name:</strong> Main Branch</p>
<p style="margin-bottom: 2px; color: #003366;"><strong>Bank Address:</strong> No. 11 Boduthakurufaanu Magu, Male 20094</p>
<p style="margin-bottom: 2px; color: #003366;"><strong>Bank Phone Number:</strong> +960 333 0137</p>
<p style="margin-bottom: 2px; color: #003366;"><strong>Account Name:</strong> HOSPITALITY TECHNOLOGY PVT LTD</p>
<p style="margin-bottom: 2px; color: #003366;"><strong>A/C No.:</strong> 773 00000 14265 (USD)</p>
<p style="margin-bottom: 2px; color: #003366;"><strong>SWIFT CODE:</strong> MALBMVMV</p>
</div>
</div>

<!-- Acceptance/Offer sections with dark blue color -->
<table style="width: 100%; margin: 30px 0; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; color: #003366; line-height: 1.3;">
<tr>
<td style="width: 50%; padding: 0 20px 0 0; vertical-align: top;">
<h2 style="font-size: 13px; font-weight: bold; margin: 0 0 15px 0; color: #003366;">Acceptance :</h2>
<p style="margin: 0 0 4px 0; line-height: 1.3; font-size: 11px; color: #003366;">We hereby accept this offer subject to the above terms and</p>
<p style="margin: 0 0 4px 0; line-height: 1.3; font-size: 11px; color: #003366;">conditions and authorize HOSPITALITY TECHNOLOGY PVT</p>
<p style="margin: 0 0 20px 0; line-height: 1.3; font-size: 11px; color: #003366;">LTD to treat this as our official purchase order.</p>

<p style="margin: 0 0 8px 0; line-height: 1.3; font-size: 11px; color: #003366;">Signature & Company Stamp</p>
<p style="margin: 0 0 8px 0; line-height: 1.3; font-size: 11px; color: #003366;">Name / Title :</p>
<p style="margin: 0 0 4px 0; line-height: 1.3; font-size: 11px; color: #003366;">Date :</p>
</td>
<td style="width: 50%; padding: 0 0 0 20px; vertical-align: top;">
<h2 style="font-size: 13px; font-weight: bold; margin: 0 0 15px 0; color: #003366;">Offer :</h2>
<p style="margin: 0 0 4px 0; line-height: 1.3; font-size: 11px; color: #003366;">For and on behalf of</p>
<p style="margin: 0 0 20px 0; line-height: 1.3; font-size: 11px; color: #003366;">HOSPITALITY TECHNOLOGY PVT LTD</p>

<p style="margin: 0 0 8px 0; line-height: 1.3; font-size: 11px; color: #003366;">Signature :</p>
<p style="margin: 0 0 4px 0; line-height: 1.3; font-size: 11px; color: #003366;">Name / Title: Feri Kurniawan</p>
<p style="margin: 0 0 8px 0; line-height: 1.3; font-size: 11px; color: #003366;">Managing Director</p>
<p style="margin: 0 0 4px 0; line-height: 1.3; font-size: 11px; color: #003366;">Date :</p>
</td>
</tr>
</table>

<!-- Page number footer -->
<div style="position: fixed; bottom: 20px; right: 20px; font-family: Arial, sans-serif; font-size: 10px; color: #003366;">
Page 1
</div>
</div>',
                'is_default' => true,
                'is_active' => true,
                'display_order' => 1,
                'page_number' => 1,
            ],
        ];

        foreach ($serviceTerms as $term) {
            ServiceTermsTemplate::updateOrCreate(
                [
                    'is_default' => $term['is_default'],
                    'display_order' => $term['display_order'],
                ],
                $term
            );
        }

        $this->command->info('Service Terms and Conditions seeded successfully!');
    }
}