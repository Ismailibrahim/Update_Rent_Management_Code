// API Types
export interface QuotationData {
  quotation_number: string;
  customer_id?: number;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  valid_until?: string;
  notes?: string;
}

export interface CreateQuotationData {
  customer_id: number;
  currency?: string;
  valid_until?: string;
  notes?: string;
  discount_type?: 'value' | 'percentage';
  discount_amount?: number;
  items: QuotationItemData[];
}

export interface QuotationItemData {
  item_type: 'product' | 'service' | 'amc';
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  item_total: number;
  tax_rate?: number;
  import_duty?: number;
  import_duty_inclusive?: boolean;
}

export interface CustomerData {
  resort_code?: string;
  resort_name: string;
  holding_company?: string;
  address?: string;
  country?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  website?: string;
  notes?: string;
}

export interface ProductData {
  name: string;
  description?: string;
  category_id?: number;
  pricing_model: 'one_time' | 'recurring';
  unit_price: number;
  total_man_days?: number;
  amc_unit_price?: number;
  amc_description_id?: number;
  is_active: boolean;
}

export interface CategoryData {
  name: string;
  description?: string;
  parent_id?: number;
  category_type: 'hardware' | 'services' | 'software' | 'spare_parts';
  is_active: boolean;
}

export interface ServiceTaskData {
  product_id: number;
  task_description: string;
  estimated_man_days?: number;
  sequence_order?: number;
  is_active?: boolean;
}

export interface BulkTaskData {
  product_id: number;
  tasks: {
    task_description: string;
    estimated_man_days: number;
    sequence_order: number;
  }[];
}

export interface TermsConditionsData {
  title: string;
  content: string;
  category_type: 'general' | 'hardware' | 'service' | 'amc';
  sub_category_id?: number;
  is_default?: boolean;
  is_active?: boolean;
}
