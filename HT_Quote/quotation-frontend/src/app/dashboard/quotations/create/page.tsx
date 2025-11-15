"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { customersApi, quotationsApi, api, termsConditionsApi, usersApi } from "@/lib/api";
import { TermsConditionsData, CreateQuotationData } from "@/lib/types";
import HardwareRepairCard from "@/components/quotation/HardwareRepairCard";
import { useToast } from "@/hooks/use-toast";

interface TermsConditionsTemplate {
  id: number;
  title: string;
  content: string;
  category_type: 'general' | 'hardware' | 'service' | 'amc';
  sub_category_id?: number;
  is_default: boolean;
  is_active: boolean;
  display_in_quotation: boolean;
}
import { ArrowLeft, Save, Plus, Search, X, Calculator, Mail, Phone, Smartphone, Briefcase, FileText, AlignLeft, Table, Edit, Check, User, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Customer {
  id: number;
  resort_code?: string;
  resort_name: string;
  holding_company?: string;
  address: string;
  country?: string;
  tax_number?: string;
  payment_terms?: string;
  contacts?: Array<{
    contact_person: string;
    email: string;
    phone: string;
    is_primary: boolean;
    contact_type: string;
  }>;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface QuotationItem {
  id: string;
  product_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  import_duty?: number;
  import_duty_inclusive?: boolean;
  item_type?: string;
  is_amc_line?: boolean;
  parent_item_id?: string;
  is_service_item?: boolean;
  man_days?: number;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  unit_price: number;
  description?: string;
  tax_rate?: number;
  category_type?: string;
  category?: {
    id: number;
    name: string;
    category_type: string;
  };
  has_amc_option: boolean;
  amc_unit_price?: number;
  amc_description_id?: number;
  amc_description?: {
    id: number;
    description: string;
    product_type: string;
  };
  service_tasks?: ServiceTask[];
}

interface ServiceTask {
  id: number;
  task_description: string;
  estimated_man_days: number;
  sequence_order: number;
}

export default function CreateQuotationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [termsConditions, setTermsConditions] = useState<TermsConditionsTemplate[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(8); // Default fallback to 8%
  const [importDutyPercentage, setImportDutyPercentage] = useState<number>(5); // Default fallback to 5%
  // Calculate valid_until as today + 13 days
  const getDefaultValidUntil = () => {
    const date = new Date();
    date.setDate(date.getDate() + 13);
    return date.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    customer_id: "",
    customer_contact_id: "",
    valid_until: getDefaultValidUntil(),
    notes: "",
    terms_conditions: "",
    terms_conditions_id: "",
    selected_terms_ids: [] as number[],
    currency: "USD",
    prepared_by: "",
  });
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editedTemplateContent, setEditedTemplateContent] = useState<{ [key: number]: string }>({});
  const [hardwareRepairDetails, setHardwareRepairDetails] = useState<any>(null);
  const [items, setItems] = useState<QuotationItem[]>([
    { id: "1", product_id: undefined, description: "", quantity: 1, unit_price: 0, total_price: 0, tax_rate: 8, import_duty: 0, item_type: "product" }
  ]);
  const [openProductSelect, setOpenProductSelect] = useState<string | null>(null);
  const [openTableProductSelect, setOpenTableProductSelect] = useState<string | null>(null);
  const [showAmcDialog, setShowAmcDialog] = useState(false);
  const [selectedProductForAmc, setSelectedProductForAmc] = useState<{itemId: string, product: Product} | null>(null);
  const [showServiceTasksDialog, setShowServiceTasksDialog] = useState(false);
  const [selectedProductForTasks, setSelectedProductForTasks] = useState<{itemId: string, product: Product} | null>(null);
  const [selectedServiceTasks, setSelectedServiceTasks] = useState<{[key: number]: boolean}>({});
  const [editedTaskDescriptions, setEditedTaskDescriptions] = useState<{[key: number]: string}>({});
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false);
  const [discountType, setDiscountType] = useState<'value' | 'percentage'>('percentage');
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);
  const [selectedSuggestionsWithAmc, setSelectedSuggestionsWithAmc] = useState<number[]>([]);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set());
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState<string>('');
  const [showCalculatorDialog, setShowCalculatorDialog] = useState(false);
  const [targetTotal, setTargetTotal] = useState<number>(0);
  const [showServiceDiscountDialog, setShowServiceDiscountDialog] = useState(false);
  const [serviceDiscountBreakdown, setServiceDiscountBreakdown] = useState<Array<{
    productName: string;
    unitPrice: number;
    manDays: number;
    minRate: number;
    discount: number;
  }>>([]);
  const [totalServiceDiscount, setTotalServiceDiscount] = useState<number>(0);
  const [minPerManDay, setMinPerManDay] = useState<number>(300);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [openCustomerPopover, setOpenCustomerPopover] = useState(false);
  const [openContactPopover, setOpenContactPopover] = useState(false);
  const [allImportDutyInclusive, setAllImportDutyInclusive] = useState(false);
  const [previewQuotationNumber, setPreviewQuotationNumber] = useState<string>('');

  // Helper function to format numbers with thousand separators
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Function to generate preview quotation number
  const generatePreviewQuotationNumber = async () => {
    if (!formData.customer_id) {
      toast({
        title: "Error",
        description: "Please select a customer first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await quotationsApi.previewNumber(formData.customer_id);
      setPreviewQuotationNumber(response.data.quotation_number);
      toast({
        title: "Success",
        description: `Preview quotation number: ${response.data.quotation_number}`,
      });
    } catch (error) {
      console.error('Error generating preview quotation number:', error);
      toast({
        title: "Error",
        description: "Failed to generate preview quotation number",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    // Get current user (for display purposes)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const userName = user.name || user.email || 'Unknown User';
        setCurrentUser(userName);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    loadCustomers();
    loadUsers();
    loadProducts();
    loadSettings();
    loadTermsConditions();
  }, [router]);

  // Monitor defaultTaxRate changes and update existing items
  useEffect(() => {
    // Update existing items that have 0 tax rate, no tax rate, or the old hardcoded value (6) to use the new default
    setItems(prev => prev.map(item => {
      if (item.tax_rate === 0 || !item.tax_rate || item.tax_rate === 6) {
        return { ...item, tax_rate: defaultTaxRate };
      }
      return item;
    }));
  }, [defaultTaxRate]);

  // Monitor importDutyPercentage changes and update hardware/spare parts items
  useEffect(() => {
    // Update existing hardware/spare parts items that have 0 import duty to use the new default
    setItems(prev => prev.map(item => {
      if (item.import_duty === 0 && !item.is_service_item && !item.is_amc_line) {
        // Check if this item is a hardware or spare parts product by looking at the product
        const product = products.find(p => p.id === item.product_id);
        const categoryType = product?.category_type || product?.category?.category_type;
        if (product && (categoryType === 'hardware' || categoryType === 'spare_parts')) {
          const calculatedImportDuty = item.unit_price * importDutyPercentage / 100;
          return { ...item, import_duty: calculatedImportDuty };
        }
      }
      return item;
    }));
  }, [importDutyPercentage, products]);

  const loadCustomers = async () => {
    try {
      const response = await customersApi.getAll(true); // Include contacts
      
      // Handle paginated response - Laravel returns data in response.data.data
      let customersData = [];
      if (Array.isArray(response.data)) {
        customersData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        customersData = response.data.data;
      }

      setCustomers(customersData);
      
      // Debug: Log customers with contacts
      console.log('📞 Loaded customers with contacts:', customersData.length);
      customersData.forEach(customer => {
        if (customer.contacts && customer.contacts.length > 0) {
          console.log(`📞 Customer ${customer.resort_name} has ${customer.contacts.length} contacts:`, customer.contacts);
        }
      });
    } catch (error: unknown) {
      console.error('Error loading customers:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll();
      
      // Handle paginated response - Laravel returns data in response.data.data
      let usersData = [];
      if (Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        usersData = response.data.data;
      }

      setUsers(usersData);
      
      // Set logged-in user as default prepared_by after users are loaded
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const userName = user.name || user.email || 'Unknown User';
          // Only set if not already set (to avoid overwriting user changes)
          setFormData(prev => {
            if (!prev.prepared_by) {
              return { ...prev, prepared_by: userName };
            }
            return prev;
          });
        } catch (error) {
          console.error('Error parsing user data for prepared_by:', error);
        }
      }
    } catch (error: unknown) {
      console.error('Error loading users:', error);
    }
  };

  const loadProducts = async () => {
    try {
      // Use test-products endpoint temporarily to avoid authentication issues
      const response = await api.get('/test-products');
      const productsData = response.data.products || response.data;
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await api.get('/settings');
      const settings = response.data.settings;
      
      const defaultTaxRateSetting = settings.default_tax_rate;
      if (defaultTaxRateSetting) {
        const taxRate = parseFloat(defaultTaxRateSetting.setting_value);
        setDefaultTaxRate(taxRate);
        
        // Update existing items with the default tax rate
        setItems(prev => prev.map(item => ({
          ...item,
          tax_rate: item.tax_rate === 0 ? taxRate : item.tax_rate
        })));
      }

      // Load import duty percentage
      const importDutySetting = settings.import_duty_percentage;
      if (importDutySetting) {
        const dutyPercentage = parseFloat(importDutySetting.setting_value);
        setImportDutyPercentage(dutyPercentage);
      }

      // Load minimum per man day rate
      const minPerManDaySetting = settings.min_per_man_day;
      if (minPerManDaySetting) {
        const minRate = parseFloat(minPerManDaySetting.setting_value);
        setMinPerManDay(minRate);
      }
    } catch (error: unknown) {
      console.error('Error loading settings:', error);
    }
  };

  const loadTermsConditions = async () => {
    try {
      const response = await termsConditionsApi.getAll();
      const termsData = response.data.data || response.data;
      setTermsConditions(termsData);
    } catch (error: unknown) {
      console.error('Error loading terms & conditions:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Clear customer_contact_id when customer_id changes
      if (field === 'customer_id') {
        newData.customer_contact_id = "";
      }
      
      return newData;
    });
  };

  const handleCustomerSelection = (customerId: string) => {
    setFormData(prev => {
      const newData = { ...prev, customer_id: customerId, customer_contact_id: "" };
      
      // Auto-select primary contact if available
      const customer = customers.find(c => c.id === parseInt(customerId));
      const primaryContact = customer?.contacts?.find(contact => contact.is_primary);
      if (primaryContact) {
        newData.customer_contact_id = primaryContact.contact_person;
      }
      
      return newData;
    });
  };

  const handleTermsConditionsChange = (termsId: string) => {
    setFormData(prev => ({ ...prev, terms_conditions_id: termsId }));
    
    // If a template is selected, populate the content
    if (termsId && termsId !== "custom") {
      const selectedTerms = termsConditions.find(tc => tc.id?.toString() === termsId);
      if (selectedTerms) {
        setFormData(prev => ({ 
          ...prev, 
          terms_conditions: selectedTerms.content,
          terms_conditions_id: termsId 
        }));
      }
    }
  };

  const handleTermsSelection = (termsId: number, checked: boolean) => {
    setFormData(prev => {
      const newSelectedIds = checked 
        ? [...prev.selected_terms_ids, termsId]
        : prev.selected_terms_ids.filter(id => id !== termsId);
      
      return { ...prev, selected_terms_ids: newSelectedIds };
    });
  };

  const getSelectedTerms = () => {
    return termsConditions.filter(tc => formData.selected_terms_ids.includes(tc.id));
  };

  const getTermsForQuotationTable = () => {
    return getSelectedTerms().filter(tc => tc.display_in_quotation);
  };

  const getTermsForFooter = () => {
    return getSelectedTerms().filter(tc => !tc.display_in_quotation);
  };

  const handleEditTemplate = (templateId: number, originalContent: string) => {
    setEditingTemplateId(templateId);
    if (!editedTemplateContent[templateId]) {
      setEditedTemplateContent(prev => ({ ...prev, [templateId]: originalContent }));
    }
  };

  const handleSaveTemplateEdit = (templateId: number) => {
    setEditingTemplateId(null);
  };

  const handleCancelTemplateEdit = (templateId: number) => {
    setEditingTemplateId(null);
    setEditedTemplateContent(prev => {
      const newContent = { ...prev };
      delete newContent[templateId];
      return newContent;
    });
  };

  const getTemplateContent = (template: TermsConditionsTemplate) => {
    return editedTemplateContent[template.id] || template.content;
  };

  const handleItemChange = (id: string, field: keyof QuotationItem, value: string | number | boolean) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Handle product_id changes (when selecting a different product)
        if (field === 'product_id') {
          const product = products.find(p => p.id === value);
          if (product) {
            updated.unit_price = product.unit_price || 0;
            updated.description = product.description || product.name;
            const isServiceItem = product.is_service_product || (product.service_tasks && product.service_tasks.length > 0);
            updated.is_service_item = isServiceItem;
            
            if (isServiceItem) {
              const totalManDays = (product.total_man_days ? parseFloat(product.total_man_days) : 0) || 
                (product.service_tasks?.reduce((sum, task) => sum + Number(task.estimated_man_days), 0) || 0);
              updated.man_days = totalManDays;
              updated.total_price = updated.unit_price * totalManDays;
            } else {
              updated.total_price = updated.quantity * updated.unit_price;
            }
            
            console.log('🔄 Product Changed:', {
              product_id: value,
              isServiceItem,
              man_days: updated.man_days,
              unit_price: updated.unit_price,
              total_price: updated.total_price
            });
          }
        }
        
        // Handle man_days changes for service items
        if (field === 'man_days' && updated.is_service_item) {
          // For service items, total price = unit_price (per day) * man_days
          updated.total_price = updated.unit_price * (Number(value) || 0);
          console.log('🔄 Man Days Changed:', {
            man_days: Number(value),
            unit_price: updated.unit_price,
            new_total_price: updated.total_price,
            tax_rate: updated.tax_rate,
            gst_amount: (updated.total_price * updated.tax_rate) / 100
          });
        }
        
        if (field === 'quantity' || field === 'unit_price') {
          // For service items, total price = unit_price (per day) * man_days
          // For regular items, it's quantity * unit_price
          if (updated.is_service_item) {
            updated.total_price = updated.unit_price * (updated.man_days || 0);
          } else {
            updated.total_price = updated.quantity * updated.unit_price;
          }
          
          // Recalculate import duty for hardware/spare parts products when unit price or quantity changes
          if (field === 'unit_price' || field === 'quantity') {
            const product = products.find(p => p.id === updated.product_id);
            const categoryType = product?.category_type || product?.category?.category_type;
            const isHardwareOrSparePart = (categoryType === 'hardware' || categoryType === 'spare_parts') && !updated.is_service_item && !updated.is_amc_line;
            
            if (isHardwareOrSparePart && !updated.import_duty_inclusive) {
              // Import duty is calculated as percentage of the total price (quantity * unit_price)
              const totalPrice = updated.quantity * updated.unit_price;
              updated.import_duty = totalPrice * importDutyPercentage / 100;
            }
          }
        }
        
        // Handle import duty inclusive checkbox
        if (field === 'import_duty_inclusive') {
          const product = products.find(p => p.id === updated.product_id);
          const categoryType = product?.category_type || product?.category?.category_type;
          const isHardwareOrSparePart = (categoryType === 'hardware' || categoryType === 'spare_parts') && !updated.is_service_item && !updated.is_amc_line;
          
          if (isHardwareOrSparePart) {
            if (updated.import_duty_inclusive) {
              // When checked, set import duty to 0
              updated.import_duty = 0;
            } else {
              // When unchecked, recalculate import duty
              const totalPrice = updated.quantity * updated.unit_price;
              updated.import_duty = totalPrice * importDutyPercentage / 100;
            }
          }
        }
        return updated;
      }
      return item;
    }));

    // If quantity changed on a product item, update linked AMC items
    if (field === 'quantity') {
      setItems(prev => prev.map(item => {
        if (item.parent_item_id === id && item.is_amc_line) {
          const updated = { ...item, quantity: Number(value) };
          updated.total_price = updated.quantity * updated.unit_price;
          return updated;
        }
        return item;
      }));
    }

    // If tax_rate changed on a product item, update linked AMC items
    if (field === 'tax_rate') {
      setItems(prev => prev.map(item => {
        if (item.parent_item_id === id && item.is_amc_line) {
          const updated = { ...item, tax_rate: Number(value) };
          return updated;
        }
        return item;
      }));
    }

    // Note: Import duty changes are not synced to AMC items since AMC never has import duty
  };

  // Handler for master "All Import Duty Inclusive" checkbox
  const handleAllImportDutyInclusive = (checked: boolean) => {
    setAllImportDutyInclusive(checked);
    
    // Update all items to set import_duty_inclusive
    setItems(prev => prev.map(item => {
      const product = products.find(p => p.id === item.product_id);
      const categoryType = product?.category_type || product?.category?.category_type;
      const isHardwareOrSparePart = (categoryType === 'hardware' || categoryType === 'spare_parts') && !item.is_service_item && !item.is_amc_line;
      
      if (checked) {
        // When master is checked
        if (isHardwareOrSparePart) {
          // For hardware/spare parts products, set import_duty to 0
          return {
            ...item,
            import_duty_inclusive: true,
            import_duty: 0
          };
        } else {
          // For non-hardware/spare parts products, just mark as inclusive
          return {
            ...item,
            import_duty_inclusive: true
          };
        }
      } else {
        // When master is unchecked, recalculate import duty for hardware/spare parts products
        if (isHardwareOrSparePart) {
          // Recalculate import duty based on percentage
          const totalPrice = item.quantity * item.unit_price;
          const calculatedImportDuty = totalPrice * importDutyPercentage / 100;
          return {
            ...item,
            import_duty_inclusive: false,
            import_duty: calculatedImportDuty
          };
        } else {
          // For non-hardware, just unmark as inclusive
          return {
            ...item,
            import_duty_inclusive: false
          };
        }
      }
    }));
  };

  const addItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      product_id: undefined,
      description: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      tax_rate: defaultTaxRate,
      import_duty: 0,
      import_duty_inclusive: false,
      item_type: "product"
    };
    setItems(prev => [...prev, newItem]);
  };

  const clearItems = () => {
    setShowClearConfirmDialog(true);
  };

  const confirmClearItems = () => {
    setItems([{
      id: "1",
      product_id: undefined,
      description: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      tax_rate: defaultTaxRate,
      import_duty: 0,
      import_duty_inclusive: false,
      item_type: "product"
    }]);
    // Reset discount
    setDiscountAmount(0);
    setDiscountInput('');
    setDiscountType('percentage');
    setShowClearConfirmDialog(false);
  };

  const handleProductSelect = (itemId: string, productId: string) => {
    const product = products.find(p => p.id === parseInt(productId));
    console.log('🔍 PRODUCT SELECT DEBUG - Product:', product);
    console.log('🔍 PRODUCT SELECT DEBUG - Has Service Tasks:', product?.service_tasks);
    console.log('🔍 PRODUCT SELECT DEBUG - Service Tasks Length:', product?.service_tasks?.length);
    if (product) {
      const isServiceItem = product.is_service_product || (product.service_tasks && product.service_tasks.length > 0);
      console.log('🔍 PRODUCT SELECT DEBUG - Is Service Item:', isServiceItem);
      const totalManDays = isServiceItem
        ? (product.total_man_days ? parseFloat(product.total_man_days) : 0) || 
          (product.service_tasks?.reduce((sum, task) => sum + Number(task.estimated_man_days), 0) || 0)
        : 0;

      // Determine tax rate: use product's tax rate if it exists and is greater than 0, otherwise use default
      const productTaxRate = product.tax_rate && product.tax_rate > 0 ? product.tax_rate : defaultTaxRate;
      
      // Determine if this is a hardware or spare parts product and should have import duty
      const categoryType = product.category_type || product.category?.category_type;
      const isHardwareOrSparePart = categoryType === 'hardware' || categoryType === 'spare_parts';
      
      // Get the current quantity for this item to calculate total price
      const currentItem = items.find(item => item.id === itemId);
      const itemQuantity = currentItem ? currentItem.quantity : 1;
      const totalPrice = itemQuantity * (product.unit_price || 0);
      
      const productImportDuty = isHardwareOrSparePart ? 
        (totalPrice * importDutyPercentage / 100) : 0;

      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          const updated = {
            ...item,
            product_id: product.id,
            description: isServiceItem && !product.service_tasks 
              ? `${product.name}\n\nService Tasks:\n1. ${product.description || 'Service implementation and support'}\n2. Project management and coordination\n3. Testing and quality assurance`
              : (product.description || product.name),
            unit_price: product.unit_price || 0,
            tax_rate: productTaxRate,
            import_duty: productImportDuty,
            import_duty_inclusive: false,
            item_type: "product",
            is_service_item: isServiceItem,
            man_days: isServiceItem ? totalManDays : undefined,
            quantity: isServiceItem ? 1 : item.quantity
          };
          // For service items, total price = unit_price (per day) * man_days
          // For regular items, it's quantity * unit_price
          updated.total_price = isServiceItem ? (updated.unit_price * (totalManDays || 0)) : (updated.quantity * updated.unit_price);
          console.log('🔍 PRODUCT SELECT - Total Price Calculation:', {
            isServiceItem,
            unit_price: updated.unit_price,
            man_days: totalManDays,
            total_price: updated.total_price
          });
          return updated;
        }
        return item;
      }));
      setOpenProductSelect(null);

      // Check if product has service tasks
      if (product.is_service_product && product.service_tasks && product.service_tasks.length > 0) {
        // Initialize all tasks as selected by default
        const initialSelection: {[key: number]: boolean} = {};
        const initialDescriptions: {[key: number]: string} = {};
        product.service_tasks.forEach(task => {
          initialSelection[task.id] = true;
          initialDescriptions[task.id] = task.task_description;
        });
        setSelectedServiceTasks(initialSelection);
        setEditedTaskDescriptions(initialDescriptions);
        setSelectedProductForTasks({ itemId, product });
        setShowServiceTasksDialog(true);
      }
      // Check if product has AMC option (after service tasks)
      else if (product.has_amc_option) {
        setSelectedProductForAmc({ itemId, product });
        setShowAmcDialog(true);
      }
      // Check for product suggestions (after service tasks and AMC)
      else if (!dismissedSuggestions.has(product.id)) {
        fetchProductSuggestions(product.id, itemId);
      }
    }
  };

  const fetchProductSuggestions = async (productId: number, itemId: string) => {
    try {
      const response = await api.get(`/products/${productId}/suggestions`);
      const suggestions = response.data || [];

      if (suggestions.length > 0) {
        setSuggestedProducts(suggestions);
        setCurrentItemId(itemId);
        setSelectedSuggestions([]);
        setShowSuggestionsDialog(true);
      }
    } catch (error) {
      console.error("Failed to fetch product suggestions:", error);
    }
  };

  const handleAddSuggestions = () => {
    if (selectedSuggestions.length === 0) {
      setShowSuggestionsDialog(false);
      return;
    }

    const newItems: QuotationItem[] = [];

    selectedSuggestions.forEach(productId => {
      const product = suggestedProducts.find(p => p.id === productId);
      if (!product) return;

      const isServiceItem = product.service_tasks && product.service_tasks.length > 0;
      const totalManDays = isServiceItem
        ? product.service_tasks?.reduce((sum, task) => sum + Number(task.estimated_man_days), 0) || 0
        : 0;

      const productTaxRate = product.tax_rate && product.tax_rate > 0 ? product.tax_rate : defaultTaxRate;
      const categoryType = product.category_type || product.category?.category_type;
      const isHardwareOrSparePart = categoryType === 'hardware' || categoryType === 'spare_parts';
      const totalPrice = product.unit_price || 0;
      const productImportDuty = isHardwareOrSparePart ? (totalPrice * importDutyPercentage / 100) : 0;

      const productItemId = Date.now().toString() + Math.random().toString(36).substring(7);

      // Add the main product
      newItems.push({
        id: productItemId,
        product_id: product.id,
        description: product.description || product.name,
        quantity: isServiceItem ? 1 : 1,
        unit_price: product.unit_price || 0,
        total_price: isServiceItem ? product.unit_price : product.unit_price,
        tax_rate: productTaxRate,
        import_duty: productImportDuty,
        import_duty_inclusive: false,
        item_type: "product",
        is_service_item: isServiceItem,
        man_days: isServiceItem ? totalManDays : undefined,
      });

      // If AMC is selected for this product, add AMC item
      if (selectedSuggestionsWithAmc.includes(productId) && product.has_amc_option && product.amc_unit_price) {
        const amcDescriptionText = product.amc_description?.description || "Hardware Maintenance and Support Contract";

        newItems.push({
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          product_id: product.id,
          description: amcDescriptionText,
          quantity: 1,
          unit_price: product.amc_unit_price,
          total_price: product.amc_unit_price,
          tax_rate: productTaxRate,
          import_duty: 0,
          import_duty_inclusive: false,
          item_type: "amc",
          is_amc_line: true,
          parent_item_id: productItemId,
        });
      }
    });

    setItems(prev => [...prev, ...newItems]);
    setSelectedSuggestionsWithAmc([]);
    setShowSuggestionsDialog(false);
  };

  const handleDismissSuggestions = (rememberChoice: boolean) => {
    if (rememberChoice && suggestedProducts.length > 0) {
      const productId = suggestedProducts[0].id;
      setDismissedSuggestions(prev => new Set(prev).add(productId));
    }
    setShowSuggestionsDialog(false);
  };

  const handleAddAmc = () => {
    if (!selectedProductForAmc) return;

    const { itemId, product } = selectedProductForAmc;

    // Get the parent product item to get its quantity
    const parentItem = items.find(item => item.id === itemId);
    const parentQuantity = parentItem?.quantity || 1;

    // Get AMC description from product's linked AMC description
    const amcDescription = product.amc_description?.description
      || `AMC for ${product.name}`;

    // Determine tax rate: use product's tax rate if it exists and is greater than 0, otherwise use default
    const productTaxRate = product.tax_rate && product.tax_rate > 0 ? product.tax_rate : defaultTaxRate;

    // Add AMC item right after the product item
    // Note: AMC items never have import duty, only the main hardware product does
    const newAmcItem: QuotationItem = {
      id: Date.now().toString(),
      product_id: product.id,
      description: amcDescription,
      quantity: parentQuantity,
      unit_price: product.amc_unit_price || 0,
      total_price: parentQuantity * (product.amc_unit_price || 0),
      tax_rate: productTaxRate,
      import_duty: 0, // AMC items never have import duty
      import_duty_inclusive: false,
      item_type: "amc",
      is_amc_line: true,
      parent_item_id: itemId
    };

    setItems(prev => {
      const index = prev.findIndex(item => item.id === itemId);
      const newItems = [...prev];
      newItems.splice(index + 1, 0, newAmcItem);
      return newItems;
    });

    setShowAmcDialog(false);
    const productForSuggestions = product;
    const itemIdForSuggestions = itemId;
    setSelectedProductForAmc(null);

    // After adding AMC, check for product suggestions
    if (!dismissedSuggestions.has(productForSuggestions.id)) {
      fetchProductSuggestions(productForSuggestions.id, itemIdForSuggestions);
    }
  };

  const handleSkipAmc = () => {
    const product = selectedProductForAmc?.product;
    const itemId = selectedProductForAmc?.itemId;

    setShowAmcDialog(false);
    setSelectedProductForAmc(null);

    // After skipping AMC, check for product suggestions
    if (product && itemId && !dismissedSuggestions.has(product.id)) {
      fetchProductSuggestions(product.id, itemId);
    }
  };

  const handleViewServiceTasks = () => {
    if (!selectedProductForTasks) return;

    const { itemId, product } = selectedProductForTasks;

    // Get selected tasks
    const selectedTasks = product.service_tasks?.filter(task => selectedServiceTasks[task.id]) || [];

    console.log('🔍 DEBUG - Selected Tasks:', selectedTasks);
    console.log('🔍 DEBUG - Selected Tasks Count:', selectedTasks.length);

    // Update the product item description to include selected tasks with edited descriptions
    if (selectedTasks.length > 0) {
      const parentItem = items.find(item => item.id === itemId);
      if (parentItem) {
        const tasksText = selectedTasks
          .map((task, index) => `${index + 1}. ${editedTaskDescriptions[task.id] || task.task_description}`)
          .join('\n');

        const updatedDescription = `${product.name}\n\nService Tasks:\n${tasksText}`;

        console.log('🔍 DEBUG - Tasks Text:', tasksText);
        console.log('🔍 DEBUG - Updated Description:', updatedDescription);
        console.log('🔍 DEBUG - Description Length:', updatedDescription.length);
        console.log('🔍 DEBUG - Number of lines:', updatedDescription.split('\n').length);

        // Calculate total man-days from selected tasks
        const totalManDays = selectedTasks.reduce((sum, task) => sum + Number(task.estimated_man_days), 0);

        console.log('🔍 DEBUG - Total Man Days:', totalManDays);

        setItems(prev => prev.map(item => {
          if (item.id === itemId) {
            // Calculate total price for service item: unit_price * man_days
            const totalPrice = item.unit_price * totalManDays;
            const updatedItem = { 
              ...item, 
              description: updatedDescription, 
              man_days: totalManDays, 
              is_service_item: true,
              total_price: totalPrice
            };
            console.log('🔍 DEBUG - Updated Item:', updatedItem);
            console.log('🔍 DEBUG - Total Price Calculation:', {
              unit_price: item.unit_price,
              man_days: totalManDays,
              total_price: totalPrice
            });
            return updatedItem;
          }
          return item;
        }));
      }
    }

    setShowServiceTasksDialog(false);

    // After viewing tasks, check for AMC
    if (selectedProductForTasks?.product.has_amc_option) {
      setSelectedProductForAmc(selectedProductForTasks);
      setShowAmcDialog(true);
    }
    // If no AMC, check for product suggestions
    else if (selectedProductForTasks && !dismissedSuggestions.has(selectedProductForTasks.product.id)) {
      fetchProductSuggestions(selectedProductForTasks.product.id, selectedProductForTasks.itemId);
    }
    setSelectedProductForTasks(null);
    setSelectedServiceTasks({});
    setEditedTaskDescriptions({});
  };

  const toggleServiceTask = (taskId: number) => {
    setSelectedServiceTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleTaskDescriptionChange = (taskId: number, newDescription: string) => {
    setEditedTaskDescriptions(prev => ({
      ...prev,
      [taskId]: newDescription
    }));
  };

  const getSelectedProductName = (productId?: number) => {
    if (!productId) return "Select product...";
    const product = products.find(p => p.id === productId);
    return product ? `${product.name} (${product.sku})` : "Select product...";
  };

  const getSelectedCustomerName = (customerId?: string) => {
    if (!customerId) return "Select a customer";
    const customer = customers.find(c => c.id === parseInt(customerId));
    if (!customer) return "Select a customer";
    return customer.resort_name;
  };

  const getSelectedContactName = (customerId?: string, contactId?: string) => {
    if (!customerId || !contactId) return "Select contact";
    const customer = customers.find(c => c.id === parseInt(customerId));
    if (!customer || !customer.contacts) return "Select contact";
    const contact = customer.contacts.find(c => c.contact_person === contactId);
    if (!contact) return "Select contact";
    
    // Show if it's the primary contact
    return contact.is_primary ? `${contact.contact_person} (Primary)` : contact.contact_person;
  };

  const getAvailableContacts = (customerId?: string) => {
    if (!customerId) return [];
    const customer = customers.find(c => c.id === parseInt(customerId));
    console.log('🔍 Filtering contacts for customer ID:', customerId);
    console.log('🔍 Found customer:', customer?.resort_name);
    console.log('🔍 Customer contacts:', customer?.contacts);
    return customer?.contacts || [];
  };

  const getSelectedContactDetails = (customerId?: string, contactId?: string) => {
    if (!customerId || !contactId) return null;
    const customer = customers.find(c => c.id === parseInt(customerId));
    if (!customer || !customer.contacts) return null;
    const contact = customer.contacts.find(c => c.contact_person === contactId);
    return contact || null;
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  };

  const calculateImportDutyTotal = () => {
    return items.reduce((sum, item) => sum + Number(item.import_duty || 0), 0);
  };

  const calculateSubtotalWithImportDuty = () => {
    return calculateSubtotal() + calculateImportDutyTotal();
  };

  const calculateSubtotalWithImportDutyAndLabour = () => {
    const labourCharges = hardwareRepairDetails?.labour_inclusive ? 0 : (hardwareRepairDetails?.labour_charges || 0);
    return calculateSubtotal() + calculateImportDutyTotal() + labourCharges;
  };

  const calculateDiscount = () => {
    const subtotalWithDutyAndLabour = calculateSubtotalWithImportDutyAndLabour();
    if (discountType === 'percentage') {
      return (subtotalWithDutyAndLabour * discountAmount) / 100;
    }
    return discountAmount;
  };

  const calculateDiscountAmount = () => {
    return calculateDiscount();
  };

  const calculateSubtotalAfterDiscount = () => {
    return calculateSubtotalWithImportDutyAndLabour() - calculateDiscount();
  };

  const calculateTaxTotal = () => {
    // Tax is calculated on (subtotal + import duty - discount)
    const subtotalAfterDiscount = calculateSubtotalAfterDiscount();
    // Calculate average tax rate weighted by item amounts
    const subtotal = calculateSubtotal();
    if (subtotal === 0) return 0;
    
    const weightedTaxRate = items.reduce((sum, item) => {
      const itemTotal = Number(item.total_price || 0);
      const itemWeight = itemTotal / subtotal;
      return sum + (Number(item.tax_rate || 0) * itemWeight);
    }, 0);

    return (subtotalAfterDiscount * weightedTaxRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotalAfterDiscount() + calculateTaxTotal();
  };

  const calculateSuggestedDiscount = (targetTotalValue: number) => {
    // Formula: Subtotal + Import Duty + Labour Charges - (Target Total / (1 + Tax Rate))
    const subtotalWithDutyAndLabour = calculateSubtotalWithImportDutyAndLabour();
    const taxRateDecimal = defaultTaxRate / 100;
    const suggestedDiscount = subtotalWithDutyAndLabour - (targetTotalValue / (1 + taxRateDecimal));
    return Math.max(0, suggestedDiscount); // Don't allow negative discounts
  };

  const applySuggestedDiscount = () => {
    const suggestedDiscount = calculateSuggestedDiscount(targetTotal);
    setDiscountType('value');
    setDiscountAmount(suggestedDiscount);
    setDiscountInput(suggestedDiscount.toString());
    setShowCalculatorDialog(false);
  };

  const calculateServiceDiscount = () => {
    const breakdown: Array<{
      productName: string;
      unitPrice: number;
      manDays: number;
      minRate: number;
      discount: number;
    }> = [];
    let totalDiscount = 0;

    console.log('🔍 SERVICE DISCOUNT DEBUG - Starting calculation');
    console.log('🔍 Total items:', items.length);
    console.log('🔍 Min per man day rate:', minPerManDay);

    items.forEach(item => {
      console.log('🔍 Checking item:', {
        id: item.id,
        is_service_item: item.is_service_item,
        man_days: item.man_days,
        unit_price: item.unit_price,
        total_price: item.total_price
      });

      if (item.is_service_item && item.man_days && item.man_days > 0) {
        const product = products.find(p => p.id === item.product_id);
        const productName = product?.name || 'Unknown Service';
        const unitPrice = item.unit_price; // Per day rate
        const manDays = item.man_days;
        const minRate = minPerManDay;
        const currentTotalPrice = unitPrice * manDays; // Total price for the service
        const minTotalPrice = minRate * manDays; // Minimum total price
        
        console.log('🔍 Service item found:', {
          productName,
          unitPrice: `$${unitPrice}/day`,
          manDays,
          currentTotalPrice: `$${currentTotalPrice}`,
          minRate: `$${minRate}/day`,
          minTotalPrice: `$${minTotalPrice}`,
          comparison: `${currentTotalPrice} > ${minTotalPrice} = ${currentTotalPrice > minTotalPrice}`
        });
        
        // Calculate discount: compare total price against minimum total
        const itemDiscount = currentTotalPrice > minTotalPrice ? (currentTotalPrice - minTotalPrice) : 0;
        
        console.log('🔍 Item discount calculated:', itemDiscount);
        
        if (itemDiscount > 0) {
          breakdown.push({
            productName,
            unitPrice: currentTotalPrice, // Store total price, not per-day rate
            manDays,
            minRate,
            discount: itemDiscount,
          });
          totalDiscount += itemDiscount;
        }
      }
    });

    console.log('🔍 Final breakdown:', breakdown);
    console.log('🔍 Total service discount:', totalDiscount);

    setServiceDiscountBreakdown(breakdown);
    setTotalServiceDiscount(totalDiscount);
    setShowServiceDiscountDialog(true);
  };

  const applyServiceDiscount = () => {
    setDiscountType('value');
    setDiscountAmount(totalServiceDiscount);
    setDiscountInput(totalServiceDiscount.toString());
    setShowServiceDiscountDialog(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.customer_id) {
        toast({
          title: "Validation Error",
          description: "Please select a customer",
          variant: "destructive",
        });
        return;
      }

      if (!formData.currency) {
        toast({
          title: "Validation Error",
          description: "Please select a currency",
          variant: "destructive",
        });
        return;
      }

      if (items.length === 0 || items.every(item => !item.description.trim())) {
        toast({
          title: "Validation Error",
          description: "Please add at least one item to the quotation",
          variant: "destructive",
        });
        return;
      }

      // Filter and validate items
      console.log('ðŸ” Raw items before validation:', items);
      
      const validItems = items
        .filter(item => item.description.trim()) // Only include items with descriptions
        .map(item => {
          const quantity = Math.max(0.01, parseFloat(item.quantity.toString()) || 0);
          const unitPrice = Math.max(0, parseFloat(item.unit_price.toString()) || 0);
          const itemTotal = item.is_service_item ? unitPrice : (quantity * unitPrice);
          
          // Ensure item_total is a valid number
          const validItemTotal = isNaN(itemTotal) ? 0 : Number(itemTotal.toFixed(2));
          
          const mappedItem: any = {
            item_type: 'product',
          product_id: item.product_id || null,
          description: item.description.trim(),
            quantity: Number(quantity.toFixed(2)),
            unit_price: Number(unitPrice.toFixed(2)),
            item_total: validItemTotal,
            tax_rate: Number(Math.max(0, Math.min(100, parseFloat(item.tax_rate.toString()) || 0)).toFixed(2)),
            import_duty: Number(Math.max(0, parseFloat((item.import_duty || 0).toString()) || 0).toFixed(2)),
          import_duty_inclusive: Boolean(item.import_duty_inclusive),
          is_service_item: item.is_service_item,
          man_days: item.man_days
          };
          
          console.log('âœ… Mapped item with item_total:', validItemTotal);
          console.log('âœ… Full mapped item:', mappedItem);
          console.log('âœ… Item has item_total field?:', 'item_total' in mappedItem);
          console.log('âœ… Item is_service_item:', item.is_service_item, '-> mapped:', mappedItem.is_service_item);
          console.log('âœ… Item man_days:', item.man_days, '-> mapped:', mappedItem.man_days);
          return mappedItem;
        });
      
      console.log('ðŸ“‹ Valid items after mapping:', validItems);

      if (validItems.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one valid item with a description",
          variant: "destructive",
        });
        return;
      }

      // Build quotation data - use plain object to avoid type issues
      const quotationData: any = {
        customer_id: parseInt(formData.customer_id),
        customer_contact_id: formData.customer_contact_id || null,
        prepared_by: formData.prepared_by || currentUser,
        currency: formData.currency, // Always include currency (defaulted in form state)
        notes: formData.notes || '',
        terms_conditions: formData.terms_conditions || '',
        selected_tc_templates: formData.selected_terms_ids.length > 0 ? formData.selected_terms_ids : null,
        // Include edited template content (only for this quotation)
        customized_template_content: Object.keys(editedTemplateContent).length > 0 ? editedTemplateContent : null,
        items: validItems.map(item => {
          const mappedItem = {
            item_type: item.item_type,
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            item_total: item.item_total,
            tax_rate: item.tax_rate,
            import_duty: item.import_duty,
            import_duty_inclusive: item.import_duty_inclusive,
            parent_item_id: item.parent_item_id,
            is_amc_line: item.is_amc_line,
            amc_description_used: item.amc_description_used,
            is_service_item: item.is_service_item,
            man_days: item.man_days
          };
          console.log('🔍 Mapping item with is_service_item:', item.is_service_item, 'man_days:', item.man_days);
          return mappedItem;
        })
      };

      console.log('📤 Sending quotation data:', JSON.stringify(quotationData, null, 2));

      // Include discount if applied
      if (discountAmount > 0) {
        quotationData.discount_type = discountType;
        quotationData.discount_amount = discountAmount;
      }

      // Only include valid_until if a date was selected and it's after today
      if (formData.valid_until && formData.valid_until.trim() !== '') {
        const validUntilDate = new Date(formData.valid_until);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        
        if (validUntilDate > today) {
          quotationData.valid_until = formData.valid_until;
        } else {
          toast({
            title: "Validation Error",
            description: "Valid until date must be after today",
            variant: "destructive",
          });
          return;
        }
      }

      // Validate that all items have item_total
      const invalidItems = quotationData.items.filter((item: any) => 
        item.item_total === undefined || item.item_total === null || isNaN(item.item_total)
      );
      
      if (invalidItems.length > 0) {
        console.error('âŒ Invalid items found (missing item_total):', invalidItems);
        toast({
          title: "Validation Error",
          description: "Some items are missing total price. Please check all items.",
          variant: "destructive",
        });
        return;
      }

      console.log('ðŸ“¤ Sending quotation data:', quotationData);
      console.log('ðŸ“¦ Items being sent:', JSON.stringify(quotationData.items, null, 2));
      console.log('ðŸ“¦ First item item_total:', quotationData.items[0]?.item_total);
      console.log('ðŸ“¦ First item keys:', Object.keys(quotationData.items[0] || {}));
      
      const response = await quotationsApi.create(quotationData);
      console.log('âœ… Quotation created successfully:', response.data);
      
      // Save hardware repair details if they exist
      if (hardwareRepairDetails && (hardwareRepairDetails.case_numbers || hardwareRepairDetails.labour_charges || hardwareRepairDetails.serial_numbers)) {
        try {
          const hardwareRepairData = {
            quotation_id: response.data.id,
            case_numbers: hardwareRepairDetails.case_numbers || '',
            labour_charges: hardwareRepairDetails.labour_charges || 0,
            labour_inclusive: hardwareRepairDetails.labour_inclusive || false,
            serial_numbers: hardwareRepairDetails.serial_numbers || ''
          };
          
          await api.post('/hardware-repair-details', hardwareRepairData);
          console.log('âœ… Hardware repair details saved successfully');
        } catch (error) {
          console.error('âŒ Error saving hardware repair details:', error);
          // Don't block the navigation, just log the error
        }
      }
      
      router.push('/dashboard/quotations');
    } catch (error: unknown) {
      console.error('âŒ Error creating quotation:', error);
      
      // Get detailed error information
      const axiosError = error as any;
      console.error('âŒ Error response:', axiosError?.response?.data);
      console.error('âŒ Error status:', axiosError?.response?.status);
      console.error('âŒ Full error object:', JSON.stringify(axiosError?.response, null, 2));
      
      let errorMsg = 'Error creating quotation. Please try again.';
      
      if (axiosError?.response?.status === 422) {
        // Validation error - show specific validation messages
        const validationErrors = axiosError.response.data.errors;
        if (validationErrors) {
          const errorMessages = Object.entries(validationErrors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          errorMsg = `Validation errors:\n${errorMessages}`;
        } else {
          errorMsg = axiosError.response.data.message || 'Validation failed. Please check your data.';
        }
      } else if (axiosError?.response?.data?.message) {
        errorMsg = axiosError.response.data.message;
      }
      
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Quotation</h1>
            <p className="text-muted-foreground">
              Create a new quotation for your customer.
            </p>
            {previewQuotationNumber && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Preview Quote Number:</strong> {previewQuotationNumber}
            </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quotation Details</CardTitle>
              <CardDescription>Basic information about the quotation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Row 1: Customer (left, 3/4) + Currency (right, 1/4) */}
                <div className="space-y-2 md:col-span-3">
                <Label htmlFor="customer">Customer *</Label>
                <Popover open={openCustomerPopover} onOpenChange={setOpenCustomerPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      <span className="truncate">{getSelectedCustomerName(formData.customer_id)}</span>
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search customers..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                            {formData.customer_id && (
                              <CommandItem
                                key="clear-customer"
                                value="Clear selection"
                                onSelect={() => {
                                  handleInputChange('customer_id', '');
                                  setOpenCustomerPopover(false);
                                }}
                              >
                                <span className="font-medium text-red-600">Clear selection</span>
                              </CommandItem>
                            )}
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                                value={customer.resort_name}
                              onSelect={() => {
                                  handleCustomerSelection(customer.id.toString());
                                setOpenCustomerPopover(false);
                              }}
                              >
                                <span className="font-medium">{customer.resort_name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2 md:col-span-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="currency">Currency</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={generatePreviewQuotationNumber}
                      disabled={!formData.customer_id}
                      className="h-8 px-2 text-xs"
                    >
                      <FileText className="mr-1 h-3 w-3" />
                      Preview Quote No.
                    </Button>
                  </div>
                  <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="MVR">MVR - Maldivian Rufiyaa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Row 2: Contact Person (left, 3/4) + Valid Until (right, 1/4) */}
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="contact">Contact Person</Label>
                  <Popover open={openContactPopover} onOpenChange={setOpenContactPopover}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                        disabled={!formData.customer_id}
                      >
                        <span className="truncate">{getSelectedContactName(formData.customer_id, formData.customer_contact_id)}</span>
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search contacts..." />
                        <CommandList>
                          <CommandEmpty>No contact found.</CommandEmpty>
                          <CommandGroup>
                            {formData.customer_contact_id && (
                              <CommandItem
                                key="clear-contact"
                                value="Clear selection"
                                onSelect={() => {
                                  handleInputChange('customer_contact_id', '');
                                  setOpenContactPopover(false);
                                }}
                              >
                                <span className="font-medium text-red-600">Clear selection</span>
                              </CommandItem>
                            )}
                            {getAvailableContacts(formData.customer_id).map((contact) => (
                              <CommandItem
                                key={contact.contact_person}
                                value={`${contact.contact_person} ${contact.email || ''}`}
                                onSelect={() => {
                                  handleInputChange('customer_contact_id', contact.contact_person);
                                  setOpenContactPopover(false);
                              }}
                            >
                              <div className="flex flex-col w-full">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{contact.contact_person}</span>
                                    {contact.is_primary && (
                                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                        Primary
                                      </span>
                                    )}
                                  </div>
                                  {contact.email && (
                                  <span className="text-sm text-muted-foreground">
                                      {contact.email}
                                      {contact.phone && ` • ${contact.phone}`}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

                <div className="space-y-2 md:col-span-1">
                <Label htmlFor="valid_until">Valid Until</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => handleInputChange('valid_until', e.target.value)}
                    className="w-full"
                />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Row 3: Contact Details (left, 3/4) + Prepared By (right, 1/4) */}
                <div className="md:col-span-3">
                  {(() => {
                    const selectedContact = getSelectedContactDetails(formData.customer_id, formData.customer_contact_id);
                    if (!selectedContact) return null;
                    
                    return (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">Contact Details</Label>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {selectedContact.email && (
                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                              <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                                <Mail className="w-3 h-3 text-gray-600" />
                              </div>
                              <span className="font-medium text-gray-700">{selectedContact.email}</span>
                            </div>
                          )}
                          {selectedContact.phone && (
                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                              <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                                <Phone className="w-3 h-3 text-gray-600" />
                              </div>
                              <span className="font-medium text-gray-700">{selectedContact.phone}</span>
                            </div>
                          )}
                          {selectedContact.mobile && (
                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                              <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                                <Smartphone className="w-3 h-3 text-gray-600" />
                              </div>
                              <span className="font-medium text-gray-700">{selectedContact.mobile}</span>
                            </div>
                          )}
                          {selectedContact.designation && (
                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                              <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                                <Briefcase className="w-3 h-3 text-gray-600" />
                              </div>
                              <span className="font-medium text-gray-700">{selectedContact.designation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="prepared_by">Prepared By</Label>
                  <Select 
                    value={formData.prepared_by} 
                    onValueChange={(value) => handleInputChange('prepared_by', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.name}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>
              </div>
            </CardContent>
          </Card>

        {/* Quotation Items Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Quotation Items</CardTitle>
                <CardDescription>Add and manage quotation items</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  onClick={clearItems} 
                  size="sm" 
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 bg-muted/50">
                    <th className="p-2 text-left text-xs font-medium w-12">#</th>
                    <th className="p-2 text-left text-xs font-medium min-w-[150px]">Product</th>
                    <th className="p-2 text-left text-xs font-medium min-w-[280px]">Description</th>
                    <th className="p-2 text-center text-xs font-medium w-20">Qty/Lot</th>
                    <th className="p-2 text-right text-xs font-medium w-32">Unit Price</th>
                    <th className="p-2 text-right text-xs font-medium w-28">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center gap-1">
                          <Checkbox
                            id="all-import-duty-inclusive"
                            checked={allImportDutyInclusive}
                            onCheckedChange={handleAllImportDutyInclusive}
                            className="h-3 w-3"
                          />
                          <label 
                            htmlFor="all-import-duty-inclusive"
                            className="text-[10px] cursor-pointer whitespace-nowrap"
                            title="Mark all import duties as inclusive"
                          >
                            All Inc.
                          </label>
                        </div>
                        <span>Import Duty</span>
                      </div>
                    </th>
                    <th className="p-2 text-right text-xs font-medium w-28">GST Tax ({defaultTaxRate}%)</th>
                    <th className="p-2 text-right text-xs font-medium w-28">Total</th>
                    <th className="p-2 text-center text-xs font-medium w-16">Actions</th>
                  </tr>
                </thead>
                <tbody>
              {items.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className="border-b"
                    >
                      <td className="p-2 text-sm align-middle">
                        <div className="flex flex-col gap-1 items-center">
                          <span className="font-medium">{index + 1}</span>
                  {item.is_amc_line && (
                            <span className="inline-flex items-center rounded-full bg-green-600 px-1.5 py-0.5 text-xs font-medium text-white">
                              AMC
                        </span>
                  )}
                  {item.is_service_item && (
                            <span className="inline-flex items-center rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white">
                              Svc
                        </span>
                      )}
                    </div>
                      </td>
                      <td className="p-2 align-middle">
                        {!item.is_amc_line ? (
                          <Popover open={openTableProductSelect === item.id} onOpenChange={(open) => setOpenTableProductSelect(open ? item.id : null)}>
                        <PopoverTrigger asChild>
                          <Button
                                type="button"
                            variant="outline"
                            role="combobox"
                                className="w-full justify-between h-9 text-xs"
                          >
                                <span className="truncate">{getSelectedProductName(item.product_id)}</span>
                                <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                                <CommandInput placeholder="Search products..." className="text-xs" />
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {products.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={`${product.name} ${product.sku}`}
                                        onSelect={() => {
                                          handleProductSelect(item.id, product.id.toString());
                                          setOpenTableProductSelect(null);
                                        }}
                                        className="text-xs"
                                  >
                                    <div className="flex justify-between items-center w-full">
                                      <div className="flex flex-col">
                                        <span className="font-medium">{product.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                              SKU: {product.sku} | ${product.unit_price}
                                        </span>
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                        ) : (
                          <Popover open={openTableProductSelect === item.id} onOpenChange={(open) => setOpenTableProductSelect(open ? item.id : null)}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between h-9 text-xs font-normal"
                          >
                            <span className="truncate">{getSelectedProductName(item.product_id)}</span>
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search products..." />
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {products.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.name}
                                    onSelect={() => {
                                      handleItemChange(item.id, 'product_id', product.id);
                                      setOpenTableProductSelect(null);
                                    }}
                                  >
                                    {product.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                        )}
                      </td>
                      <td className="p-2 align-middle">
                        {!item.is_amc_line ? (
                      <Textarea
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            className="w-full text-xs whitespace-pre-wrap resize-none overflow-hidden"
                            placeholder="Description"
                            style={{
                              height: 'auto',
                              minHeight: '60px',
                              maxHeight: '400px',
                              overflowY: item.description.split('\n').length > 3 ? 'auto' : 'hidden'
                            }}
                            onInput={(e: any) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            ref={(el) => {
                              if (el) {
                                console.log('🔍 TEXTAREA DEBUG - Item ID:', item.id);
                                console.log('🔍 TEXTAREA DEBUG - Is Service Item:', item.is_service_item);
                                console.log('🔍 TEXTAREA DEBUG - Description:', item.description);
                                console.log('🔍 TEXTAREA DEBUG - Description Length:', item.description?.length);
                                console.log('🔍 TEXTAREA DEBUG - Number of lines:', item.description?.split('\n').length);
                                console.log('🔍 TEXTAREA DEBUG - ScrollHeight:', el.scrollHeight);
                                el.style.height = 'auto';
                                el.style.height = el.scrollHeight + 'px';
                                console.log('🔍 TEXTAREA DEBUG - Final Height:', el.style.height);
                              }
                            }}
                          />
                        ) : (
                          <Textarea
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            className="w-full text-xs resize-none whitespace-pre-wrap overflow-hidden"
                            placeholder="AMC Description"
                            style={{
                              height: 'auto',
                              minHeight: '60px',
                              maxHeight: '400px',
                              overflowY: item.description.split('\n').length > 3 ? 'auto' : 'hidden'
                            }}
                            onInput={(e: any) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            ref={(el) => {
                              if (el) {
                                el.style.height = 'auto';
                                el.style.height = el.scrollHeight + 'px';
                              }
                            }}
                          />
                        )}
                      </td>
                      <td className="p-2 align-middle">
                        {item.is_service_item ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.man_days || 0}
                            onChange={(e) => handleItemChange(item.id, 'man_days', parseFloat(e.target.value) || 0)}
                            className="h-9 text-xs text-center"
                            placeholder="Man Days"
                          />
                        ) : (
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-9 text-xs text-right"
                          />
                        )}
                      </td>
                      <td className="p-2 align-middle">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="h-9 text-xs text-right"
                      />
                      </td>
                      <td className="p-2 align-middle">
                      {(() => {
                        const product = products.find(p => p.id === item.product_id);
                        const categoryType = product?.category_type || product?.category?.category_type;
                        const isHardwareOrSparePart = (categoryType === 'hardware' || categoryType === 'spare_parts') && !item.is_service_item && !item.is_amc_line;
                        
                        return isHardwareOrSparePart ? (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.import_duty || 0}
                              onChange={(e) => handleItemChange(item.id, 'import_duty', parseFloat(e.target.value) || 0)}
                              className="h-9 text-xs text-right"
                              disabled={item.import_duty_inclusive}
                            />
                            <div className="flex items-center space-x-1">
                              <Checkbox
                                id={`import-duty-inclusive-${item.id}`}
                                checked={item.import_duty_inclusive || false}
                                onCheckedChange={(checked) => handleItemChange(item.id, 'import_duty_inclusive', checked)}
                                className="h-3 w-3"
                              />
                              <label 
                                htmlFor={`import-duty-inclusive-${item.id}`}
                                className="text-[10px] text-muted-foreground cursor-pointer"
                              >
                                Include
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.import_duty || 0}
                              onChange={(e) => handleItemChange(item.id, 'import_duty', parseFloat(e.target.value) || 0)}
                              className="h-9 text-xs text-right"
                              placeholder="0.00"
                            />
                            <div className="flex items-center space-x-1">
                              <Checkbox
                                id={`import-duty-inclusive-${item.id}`}
                                checked={item.import_duty_inclusive || false}
                                onCheckedChange={(checked) => handleItemChange(item.id, 'import_duty_inclusive', checked)}
                                className="h-3 w-3"
                              />
                              <label 
                                htmlFor={`import-duty-inclusive-${item.id}`}
                                className="text-[10px] text-muted-foreground cursor-pointer"
                              >
                                Include
                              </label>
                            </div>
                          </div>
                        );
                      })()}
                      </td>
                      <td className="p-2 align-middle text-right">
                        <div className="text-sm font-medium">
                          ${formatCurrency((Number(item.total_price || 0) * Number(item.tax_rate || 0)) / 100)}
                    </div>
                      </td>
                      <td className="p-2 text-sm text-right font-semibold align-middle">${formatCurrency(item.total_price)}</td>
                      <td className="p-2 text-center align-middle">
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Terms & Conditions Rows (for templates with display_in_quotation = true) */}
                  {getTermsForQuotationTable().map((terms, index) => (
                    <tr key={`terms-${terms.id}`} className="bg-gray-100 border-t">
                      <td className="p-2 text-sm align-middle text-center">
                        {items.length + index + 1}
                      </td>
                      <td className="p-2 text-sm align-middle text-center">
                        -
                      </td>
                      <td className="p-2 align-middle" colSpan={3}>
                        <Textarea
                          value={getTemplateContent(terms)}
                          onChange={(e) => {
                            setEditedTemplateContent(prev => ({
                              ...prev,
                              [terms.id]: e.target.value
                            }));
                          }}
                          className="w-full text-xs whitespace-pre-wrap resize-none bg-gray-50"
                          placeholder="Terms & Conditions content"
                          rows={4}
                        />
                      </td>
                      <td className="p-2 align-middle text-center text-sm italic text-muted-foreground" colSpan={3}>
                        Property to Provide
                      </td>
                      <td className="p-2 text-center align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTermsSelection(terms.id, false)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 bg-muted/30">
                  <tr>
                    <td colSpan={7} className="p-2 text-right font-semibold text-sm">Subtotal:</td>
                    <td className="p-2 text-right font-bold text-sm">${formatCurrency(calculateSubtotal())}</td>
                    <td></td>
                  </tr>
                  {calculateImportDutyTotal() > 0 && (
                    <tr>
                      <td colSpan={7} className="p-2 text-right font-semibold text-sm">Import Duty:</td>
                      <td className="p-2 text-right font-bold text-sm">${formatCurrency(calculateImportDutyTotal())}</td>
                      <td></td>
                    </tr>
                  )}
                  {(hardwareRepairDetails?.labour_charges > 0 || hardwareRepairDetails?.labour_inclusive) && (
                    <tr>
                      <td colSpan={7} className="p-2 text-right font-semibold text-sm">Labour Charges:</td>
                      <td className="p-2 text-right font-bold text-sm">
                        {hardwareRepairDetails?.labour_inclusive ? 'Inclusive' : `$${formatCurrency(hardwareRepairDetails?.labour_charges || 0)}`}
                      </td>
                      <td></td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={7} className="p-2 text-right font-semibold text-sm">
                      <div className="flex items-center gap-2 justify-end">
                        <Calculator 
                          className="h-4 w-4 text-primary cursor-pointer hover:text-primary/80 transition-colors" 
                onClick={() => setShowCalculatorDialog(true)}
                          title="Open Discount Calculator"
                        />
                        <User 
                          className="h-4 w-4 text-green-600 cursor-pointer hover:text-green-700 transition-colors" 
                          onClick={calculateServiceDiscount}
                          title="Calculate Service Auto Discount"
                        />
                        <span>Discount:</span>
                    <Select value={discountType} onValueChange={(value: 'value' | 'percentage') => setDiscountType(value)}>
                          <SelectTrigger className="h-6 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="value">$</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="text"
                      value={discountInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                          setDiscountInput(value);
                          const numValue = parseFloat(value) || 0;
                          setDiscountAmount(numValue);
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        let finalValue = Math.round(value * 100) / 100;
                        if (discountType === 'percentage' && finalValue > 100) {
                          finalValue = 100;
                        } else if (finalValue < 0) {
                          finalValue = 0;
                        }
                        setDiscountAmount(finalValue);
                        setDiscountInput(finalValue === 0 ? '' : finalValue.toString());
                      }}
                          placeholder="0"
                          className="h-6 w-20 text-xs"
                    />
                  </div>
                    </td>
                    <td className="p-2 text-right font-bold text-sm text-green-600">
                      {discountAmount > 0 ? `-${formatCurrency(calculateDiscount())}` : '$0.00'}
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={7} className="p-2 text-right font-semibold text-sm">GST Tax ({defaultTaxRate}%):</td>
                    <td className="p-2 text-right font-bold text-sm">${formatCurrency(calculateTaxTotal())}</td>
                    <td></td>
                  </tr>
                  <tr className="border-t-2">
                    <td colSpan={7} className="p-2 text-right font-bold text-base">Grand Total:</td>
                    <td className="p-2 text-right font-bold text-base text-primary">${formatCurrency(calculateTotal())}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>


        {/* Terms & Conditions Section - Badge/Chip Layout */}
        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
            <CardDescription>
              Click on templates to select/deselect ({termsConditions.length} available)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Templates as Badges/Chips */}
            <div className="flex flex-wrap gap-2">
                  {termsConditions.length > 0 ? (
                    termsConditions.map((terms) => (
                  <button
                    key={terms.id}
                          type="button"
                    onClick={() => handleTermsSelection(terms.id, !formData.selected_terms_ids.includes(terms.id))}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      formData.selected_terms_ids.includes(terms.id)
                        ? 'bg-gray-900 text-white shadow-md hover:bg-gray-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    <span>{terms.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      formData.selected_terms_ids.includes(terms.id)
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {terms.category_type}
                    </span>
                    {terms.display_in_quotation ? (
                      <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                        formData.selected_terms_ids.includes(terms.id)
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}>
                        <Table className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                        formData.selected_terms_ids.includes(terms.id)
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}>
                        <AlignLeft className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                    ))
                  ) : (
                <div className="text-sm text-gray-500">Loading templates...</div>
              )}
              </div>
              
            {/* Selected Templates Count */}
            {formData.selected_terms_ids.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    Selected: {formData.selected_terms_ids.length}
                  </span>
                  <div className="flex gap-2">
                    {getTermsForQuotationTable().length > 0 && (
                      <span className="text-xs px-2 py-1 bg-gray-800 text-white rounded-full">
                        {getTermsForQuotationTable().length} in Table
                      </span>
                    )}
                    {getTermsForFooter().length > 0 && (
                      <span className="text-xs px-2 py-1 bg-gray-300 text-gray-800 rounded-full">
                        {getTermsForFooter().length} in Footer
                      </span>
                      )}
                    </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleInputChange('selected_terms_ids', [])}
                >
                  Clear All
                </Button>
                  </div>
                  )}

            {/* Selected Templates Preview */}
            {formData.selected_terms_ids.length > 0 && (
              <div className="space-y-3 pt-4">
                <Label className="text-sm font-semibold">Selected Templates Preview</Label>
                {getSelectedTerms().map((terms) => (
                  <Card key={terms.id} className="border-l-4 border-l-gray-400">
                    <CardHeader className="px-3 py-2 pb-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-sm leading-tight">{terms.title}</CardTitle>
                            <span className="text-[10px] px-2 py-1 bg-gray-200 text-gray-800 rounded">
                              {terms.category_type}
                            </span>
                            {terms.display_in_quotation ? (
                              <span className="text-[10px] px-2 py-1 bg-gray-300 text-gray-800 rounded">
                                <Table className="h-3 w-3 inline" />
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-1 bg-gray-300 text-gray-800 rounded">
                                <AlignLeft className="h-3 w-3 inline" />
                              </span>
                )}
              </div>
                </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {editingTemplateId === terms.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSaveTemplateEdit(terms.id)}
                                className="h-5 w-5 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Save changes"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelTemplateEdit(terms.id)}
                                className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Cancel"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTemplate(terms.id, terms.content)}
                                className="h-5 w-5 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Edit content"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTermsSelection(terms.id, false)}
                                className="h-5 w-5 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                title="Remove"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
              </div>
              </div>
          </CardHeader>
                    <CardContent className="px-3 pb-3">
                      {editingTemplateId === terms.id ? (
              <Textarea
                          value={getTemplateContent(terms)}
                          onChange={(e) => setEditedTemplateContent(prev => ({ ...prev, [terms.id]: e.target.value }))}
                          className="text-sm min-h-[120px]"
                          placeholder="Edit template content..."
                        />
                      ) : (
                        <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded leading-relaxed">
                          {getTemplateContent(terms)}
            </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hardware Repair Card */}
        <HardwareRepairCard 
          quotationId={0} // Will be updated when quotation is created
          hardwareRepairDetails={hardwareRepairDetails}
          onUpdate={setHardwareRepairDetails}
        />

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Creating...' : 'Create Quotation'}
          </Button>
        </div>
      </form>

      {/* AMC Dialog */}
      <Dialog open={showAmcDialog} onOpenChange={setShowAmcDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add AMC Option?</DialogTitle>
            <DialogDescription>
              This product has an Annual Maintenance Contract (AMC) option available.
            </DialogDescription>
          </DialogHeader>

          {selectedProductForAmc && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-2">{selectedProductForAmc.product.name}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product Price:</span>
                    <span className="font-medium">${selectedProductForAmc.product.unit_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AMC Price:</span>
                    <span className="font-medium text-green-600">${selectedProductForAmc.product.amc_unit_price || 0}</span>
                  </div>
                  {selectedProductForAmc.product.amc_description && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground block mb-1">AMC Description:</span>
                      <p className="text-xs">{selectedProductForAmc.product.amc_description.description}</p>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Would you like to add the AMC option to this Item? The AMC line will be added as a separate item.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleSkipAmc}>
              No, Skip AMC
            </Button>
            <Button onClick={handleAddAmc} className="bg-green-600 hover:bg-green-700">
              Yes, Add AMC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Suggestions Dialog */}
      <Dialog open={showSuggestionsDialog} onOpenChange={() => handleDismissSuggestions(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Frequently Added Together</DialogTitle>
            <DialogDescription>
              Customers often add these products together. Select any items you'd like to add to this quotation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {suggestedProducts.map((product) => (
              <div key={product.id} className="border rounded-lg p-4">
                <div
                  className={`flex items-start gap-4 cursor-pointer hover:bg-gray-50 transition-colors rounded ${
                    selectedSuggestions.includes(product.id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    if (selectedSuggestions.includes(product.id)) {
                      setSelectedSuggestions(prev => prev.filter(id => id !== product.id));
                      setSelectedSuggestionsWithAmc(prev => prev.filter(id => id !== product.id));
                    } else {
                      setSelectedSuggestions(prev => [...prev, product.id]);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSuggestions.includes(product.id)}
                    onChange={() => {}}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold">{product.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{product.sku}</p>
                    {product.description && (
                      <p className="text-sm text-gray-600 mt-2">{product.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm font-medium text-green-600">
                        ${formatCurrency(product.unit_price)}
                      </span>
                      {product.category && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {product.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {product.has_amc_option && selectedSuggestions.includes(product.id) && (
                  <div className="mt-3 ml-9 pl-4 border-l-2 border-green-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSuggestionsWithAmc.includes(product.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (selectedSuggestionsWithAmc.includes(product.id)) {
                            setSelectedSuggestionsWithAmc(prev => prev.filter(id => id !== product.id));
                          } else {
                            setSelectedSuggestionsWithAmc(prev => [...prev, product.id]);
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium text-green-700">
                        Include AMC (+${formatCurrency(product.amc_unit_price || 0)})
                      </span>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <input
              type="checkbox"
              id="dont-show-again"
              className="h-4 w-4"
            />
            <label htmlFor="dont-show-again" className="text-sm text-gray-600 cursor-pointer">
              Don't show suggestions for this product again (this session)
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const checkbox = document.getElementById('dont-show-again') as HTMLInputElement;
                handleDismissSuggestions(checkbox?.checked || false);
              }}
            >
              Skip
            </Button>
            <Button
              onClick={handleAddSuggestions}
              disabled={selectedSuggestions.length === 0}
            >
              Add {selectedSuggestions.length > 0 ? `${selectedSuggestions.length} ` : ''}Selected Item{selectedSuggestions.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Tasks Dialog */}
      <Dialog open={showServiceTasksDialog} onOpenChange={setShowServiceTasksDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Service Tasks</DialogTitle>
            <DialogDescription>
              This product has service tasks associated with it.
            </DialogDescription>
          </DialogHeader>

          {selectedProductForTasks && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-3">{selectedProductForTasks.product.name}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-muted-foreground">Product Price:</span>
                    <span className="font-medium">${selectedProductForTasks.product.unit_price}</span>
                  </div>

                  <div className="border-t pt-3">
                    <h5 className="font-medium text-sm mb-3">Service Tasks (select tasks to include):</h5>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {selectedProductForTasks.product.service_tasks?.map((task, index) => (
                        <div
                          key={task.id}
                          className={`p-3 rounded border transition-colors ${
                            selectedServiceTasks[task.id]
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <input
                              type="checkbox"
                              checked={selectedServiceTasks[task.id] || false}
                              onChange={() => toggleServiceTask(task.id)}
                              className="mt-1 h-4 w-4 rounded border-gray-300"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-blue-600">Task #{index + 1}</span>
                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                  {task.estimated_man_days} man-days
                                </span>
                              </div>
                              <Textarea
                                value={editedTaskDescriptions[task.id] || task.task_description}
                                onChange={(e) => handleTaskDescriptionChange(task.id, e.target.value)}
                                disabled={!selectedServiceTasks[task.id]}
                                className="text-sm resize-none"
                                rows={2}
                                placeholder="Task description"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t flex justify-between text-sm font-medium">
                      <span>Total Selected Man-Days:</span>
                      <span className="text-blue-600">
                        {selectedProductForTasks.product.service_tasks
                          ?.filter(task => selectedServiceTasks[task.id])
                          .reduce((sum, task) => sum + Number(task.estimated_man_days), 0) || 0} days
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Select the tasks you want to include. The selected tasks will be added to the item description.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={handleViewServiceTasks}
              disabled={!selectedProductForTasks?.product.service_tasks?.some(task => selectedServiceTasks[task.id])}
            >
              Add Selected Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Items Confirmation Dialog */}
      <Dialog open={showClearConfirmDialog} onOpenChange={setShowClearConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Items?</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all quotation items? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirmDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmClearItems}>
              Clear All Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Calculator Dialog */}
      <Dialog open={showCalculatorDialog} onOpenChange={setShowCalculatorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Discount Calculator</DialogTitle>
            <DialogDescription>
              Enter your target total amount to calculate the required discount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetTotal">Target Total Amount</Label>
              <Input
                id="targetTotal"
                type="number"
                min="0"
                step="0.01"
                value={targetTotal}
                onChange={(e) => setTargetTotal(parseFloat(e.target.value) || 0)}
                placeholder="Enter target total"
                className="text-lg"
              />
            </div>

            {targetTotal > 0 && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Subtotal + Import Duty + Labour:</span>
                    <span className="font-medium">${formatCurrency(calculateSubtotalWithImportDutyAndLabour())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Default Tax Rate:</span>
                    <span className="font-medium">{defaultTaxRate}%</span>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-green-600">Suggested Discount:</span>
                    <span className="text-lg font-bold text-green-600">
                      ${formatCurrency(calculateSuggestedDiscount(targetTotal))}
                    </span>
                  </div>
                  {calculateSuggestedDiscount(targetTotal) > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      This discount will result in a final total of approximately ${formatCurrency(targetTotal)}
                    </p>
                  )}
                  {calculateSuggestedDiscount(targetTotal) === 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      Target total is higher than or equal to current total. No discount needed.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalculatorDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={applySuggestedDiscount}
              disabled={targetTotal <= 0 || calculateSuggestedDiscount(targetTotal) === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Discount Dialog */}
      <Dialog open={showServiceDiscountDialog} onOpenChange={setShowServiceDiscountDialog}>
        <DialogContent className="max-w-3xl p-0 gap-0 rounded-lg overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Service Auto Discount Calculator</DialogTitle>
            <DialogDescription>
              Calculate discount based on minimum man-day rate
            </DialogDescription>
          </DialogHeader>
          
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-green-50 to-blue-50">
            <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Service Auto Discount</h2>
              <p className="text-xs text-muted-foreground">Min rate: ${formatCurrency(minPerManDay)}/day</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {serviceDiscountBreakdown.length > 0 ? (
              <div className="space-y-3">
                {/* Service Items Cards */}
                {serviceDiscountBreakdown.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-gradient-to-r from-white to-green-50/30 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate mb-1" title={item.productName}>
                          {item.productName}
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Man Days:</span>
                            <span className="font-medium">{item.manDays.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Min/Day:</span>
                            <span className="font-medium">${formatCurrency(item.minRate)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Current Total:</span>
                            <span className="font-medium">${formatCurrency(item.unitPrice)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Min Total:</span>
                            <span className="font-medium">${formatCurrency(item.minRate * item.manDays)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground mb-1">Discount</span>
                        <span className="text-lg font-bold text-green-600">
                          ${formatCurrency(item.discount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total Summary */}
                <div className="border-2 border-green-200 rounded-lg p-4 bg-gradient-to-r from-green-50 to-green-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Total Service Discount</p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {serviceDiscountBreakdown.length} service{serviceDiscountBreakdown.length !== 1 ? 's' : ''} eligible
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        ${formatCurrency(totalServiceDiscount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mb-3">
                  <User className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="font-medium text-amber-800 mb-1">No Discount Available</h3>
                <p className="text-sm text-amber-600">
                  No services priced above ${formatCurrency(minPerManDay)}/day minimum
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-muted/30">
            <Button variant="outline" onClick={() => setShowServiceDiscountDialog(false)} size="sm">
              Cancel
            </Button>
            <Button 
              onClick={applyServiceDiscount}
              disabled={totalServiceDiscount === 0}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Check className="h-4 w-4 mr-1" />
              Apply ${formatCurrency(totalServiceDiscount)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
