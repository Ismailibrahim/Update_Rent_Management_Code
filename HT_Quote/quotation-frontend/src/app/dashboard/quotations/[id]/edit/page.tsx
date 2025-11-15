"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { customersApi, quotationsApi, api, termsConditionsApi } from "@/lib/api";
import { TermsConditionsData, CreateQuotationData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface TermsConditionsTemplate {
  id: number;
  title: string;
  content: string;
  category_type: 'general' | 'hardware' | 'service' | 'amc';
  sub_category_id?: number;
  is_default: boolean;
  is_active: boolean;
}
import { ArrowLeft, Save, Plus, Search, X, Calculator } from "lucide-react";
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
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  tax_number?: string;
  payment_terms?: string;
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

export default function EditQuotationPage() {
  console.log('✅ EDIT PAGE LOADED - NEW CODE VERSION');
  const router = useRouter();
  const params = useParams();
  const quotationId = params.id as string;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
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
    valid_until: getDefaultValidUntil(),
    notes: "",
    terms_conditions: "",
    terms_conditions_id: "",
    currency: "USD",
  });
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
  const [currentUser, setCurrentUser] = useState<string>('');
  const [openCustomerPopover, setOpenCustomerPopover] = useState(false);

  // Helper function to format numbers with thousand separators
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Get current user
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user.name || user.email || 'Unknown User');
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    loadCustomers();
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

  // Monitor importDutyPercentage changes and update hardware items
  useEffect(() => {
    // Update existing hardware items that have 0 import duty to use the new default
    setItems(prev => prev.map(item => {
      if (item.import_duty === 0 && !item.is_service_item && !item.is_amc_line) {
        // Check if this item is a hardware product by looking at the product
        const product = products.find(p => p.id === item.product_id);
        const categoryType = product?.category_type || product?.category?.category_type;
        if (product && categoryType === 'hardware') {
          const calculatedImportDuty = item.unit_price * importDutyPercentage / 100;
          return { ...item, import_duty: calculatedImportDuty };
        }
      }
      return item;
    }));
  }, [importDutyPercentage, products]);

  const loadCustomers = async () => {
    try {
      const response = await customersApi.getAll();

      // Handle paginated response - Laravel returns data in response.data.data
      let customersData = [];
      if (Array.isArray(response.data)) {
        customersData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        customersData = response.data.data;
      }

      setCustomers(customersData);
    } catch (error: unknown) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/products');
      const productsData = response.data.data || response.data;
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

  const loadQuotation = async () => {
    try {
      const response = await quotationsApi.getById(parseInt(quotationId));
      const quotation = response.data;

      // Set form data
      setFormData({
        customer_id: quotation.customer_id?.toString() || "",
        valid_until: quotation.valid_until ? quotation.valid_until.split('T')[0] : getDefaultValidUntil(),
        notes: quotation.notes || "",
        terms_conditions: quotation.terms_conditions || "",
        terms_conditions_id: quotation.terms_conditions_id?.toString() || "",
        currency: quotation.currency || "USD",
      });

      // Set discount
      if (quotation.discount_amount && quotation.discount_amount > 0) {
        setDiscountAmount(quotation.discount_amount);
        setDiscountInput(quotation.discount_amount.toString());
        setDiscountType(quotation.discount_type || 'percentage');
      }

      // Map backend items to frontend QuotationItem interface
      if (quotation.items && quotation.items.length > 0) {
        const mappedItems = quotation.items.map((item: any, index: number) => ({
          id: item.id?.toString() || `item-${index}`,
          product_id: item.product_id || undefined,
          description: item.description || "",
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          total_price: parseFloat(item.item_total) || 0,
          tax_rate: parseFloat(item.tax_rate) || defaultTaxRate,
          import_duty: parseFloat(item.import_duty) || 0,
          import_duty_inclusive: Boolean(item.import_duty_inclusive),
          item_type: item.item_type || "product",
          is_amc_line: Boolean(item.is_amc_line),
            parent_item_id: item.parent_item_id ? parseInt(item.parent_item_id.toString()) : undefined,
          is_service_item: Boolean(item.is_service_item),
          man_days: item.man_days ? parseFloat(item.man_days) : undefined,
        }));
        setItems(mappedItems);
      }
    } catch (error) {
      console.error('Error loading quotation:', error);
      alert('Failed to load quotation. Please try again.');
      router.push('/dashboard/quotations');
    }
  };

  useEffect(() => {
    // Load quotation after loading customers, products, settings, and terms conditions
    if (customers.length > 0 && products.length > 0) {
      loadQuotation();
    }
  }, [customers.length, products.length]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleItemChange = (id: string, field: keyof QuotationItem, value: string | number | boolean) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          // For service items, total price is just the unit_price (lot price)
          // For regular items, it's quantity * unit_price
          updated.total_price = updated.is_service_item ? updated.unit_price : (updated.quantity * updated.unit_price);

          // Recalculate import duty for hardware products when unit price or quantity changes
          if (field === 'unit_price' || field === 'quantity') {
            const product = products.find(p => p.id === updated.product_id);
            const categoryType = product?.category_type || product?.category?.category_type;
            const isHardwareProduct = categoryType === 'hardware' && !updated.is_service_item && !updated.is_amc_line;

            if (isHardwareProduct && !updated.import_duty_inclusive) {
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
          const isHardwareProduct = categoryType === 'hardware' && !updated.is_service_item && !updated.is_amc_line;

          if (isHardwareProduct) {
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
    if (product) {
      const isServiceItem = product.service_tasks && product.service_tasks.length > 0;
      const totalManDays = isServiceItem
        ? product.service_tasks?.reduce((sum, task) => sum + Number(task.estimated_man_days), 0) || 0
        : 0;

      // Determine tax rate: use product's tax rate if it exists and is greater than 0, otherwise use default
      const productTaxRate = product.tax_rate && product.tax_rate > 0 ? product.tax_rate : defaultTaxRate;

      // Determine if this is a hardware product and should have import duty
      const categoryType = product.category_type || product.category?.category_type;
      const isHardwareProduct = categoryType === 'hardware';

      // Get the current quantity for this item to calculate total price
      const currentItem = items.find(item => item.id === itemId);
      const itemQuantity = currentItem ? currentItem.quantity : 1;
      const totalPrice = itemQuantity * (product.unit_price || 0);

      const productImportDuty = isHardwareProduct ?
        (totalPrice * importDutyPercentage / 100) : 0;

      setItems(prev => prev.map(item => {
        if (item.id === itemId) {
          const updated = {
            ...item,
            product_id: product.id,
            description: product.description || product.name,
            unit_price: product.unit_price || 0,
            tax_rate: productTaxRate,
            import_duty: productImportDuty,
            import_duty_inclusive: false,
            item_type: "product",
            is_service_item: isServiceItem,
            man_days: isServiceItem ? totalManDays : undefined,
            quantity: isServiceItem ? 1 : item.quantity
          };
          // For service items, the total price is the lot price (unit_price)
          // For regular items, it's quantity * unit_price
          updated.total_price = isServiceItem ? updated.unit_price : (updated.quantity * updated.unit_price);
          return updated;
        }
        return item;
      }));
      setOpenProductSelect(null);

      // Check if product has service tasks
      if (product.service_tasks && product.service_tasks.length > 0) {
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
      const isHardwareProduct = categoryType === 'hardware';
      const totalPrice = product.unit_price || 0;
      const productImportDuty = isHardwareProduct ? (totalPrice * importDutyPercentage / 100) : 0;

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

    // Update the product item description to include selected tasks with edited descriptions
    if (selectedTasks.length > 0) {
      const parentItem = items.find(item => item.id === itemId);
      if (parentItem) {
        const tasksText = selectedTasks
          .map((task, index) => `${index + 1}. ${editedTaskDescriptions[task.id] || task.task_description}`)
          .join('\n');

        const updatedDescription = `${product.name}\n\nService Tasks:\n${tasksText}`;

        // Calculate total man-days from selected tasks
        const totalManDays = selectedTasks.reduce((sum, task) => sum + Number(task.estimated_man_days), 0);

        setItems(prev => prev.map(item => {
          if (item.id === itemId) {
            return { ...item, description: updatedDescription, man_days: totalManDays, is_service_item: true };
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
    return `${customer.company_name}${customer.contact_person ? ` - ${customer.contact_person}` : ''}`;
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

  const calculateDiscount = () => {
    const subtotalWithDuty = calculateSubtotalWithImportDuty();
    if (discountType === 'percentage') {
      return (subtotalWithDuty * discountAmount) / 100;
    }
    return discountAmount;
  };

  const calculateSubtotalAfterDiscount = () => {
    return calculateSubtotalWithImportDuty() - calculateDiscount();
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
    // Formula: Subtotal + Import Duty - (Target Total / (1 + Tax Rate))
    const subtotalWithDuty = calculateSubtotalWithImportDuty();
    const taxRateDecimal = defaultTaxRate / 100;
    const suggestedDiscount = subtotalWithDuty - (targetTotalValue / (1 + taxRateDecimal));
    return Math.max(0, suggestedDiscount); // Don't allow negative discounts
  };

  const applySuggestedDiscount = () => {
    const suggestedDiscount = calculateSuggestedDiscount(targetTotal);
    setDiscountType('value');
    setDiscountAmount(suggestedDiscount);
    setDiscountInput(suggestedDiscount.toString());
    setShowCalculatorDialog(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔥 HANDLESUBMIT CALLED - START');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.customer_id) {
        toast({
          title: "Validation Error",
          description: "Please select a customer",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!formData.currency) {
        toast({
          title: "Validation Error",
          description: "Please select a currency",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (items.length === 0 || items.every(item => !item.description.trim())) {
        toast({
          title: "Validation Error",
          description: "Please add at least one item to the quotation",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Filter and validate items
      console.log('Raw items before validation:', items);

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

          console.log('Mapped item with item_total:', validItemTotal);
          console.log('Full mapped item:', mappedItem);
          console.log('Item has item_total field?:', 'item_total' in mappedItem);
          console.log('Item is_service_item:', item.is_service_item, '-> mapped:', mappedItem.is_service_item);
          console.log('Item man_days:', item.man_days, '-> mapped:', mappedItem.man_days);
          return mappedItem;
        });

      console.log('Valid items after mapping:', validItems);

      if (validItems.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one valid item with a description",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Build quotation data - use plain object to avoid type issues
      const quotationData: any = {
        customer_id: parseInt(formData.customer_id),
        currency: formData.currency, // Always include currency (defaulted in form state)
        notes: formData.notes || '',
        terms_conditions: formData.terms_conditions || '',
        selected_tc_templates: formData.terms_conditions_id ? [parseInt(formData.terms_conditions_id)] : null,
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
          console.log('Mapping item with is_service_item:', item.is_service_item, 'man_days:', item.man_days);
          return mappedItem;
        })
      };

      console.log('Sending quotation data:', JSON.stringify(quotationData, null, 2));

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
          setLoading(false);
          return;
        }
      }

      // Validate that all items have item_total
      const invalidItems = quotationData.items.filter((item: any) =>
        item.item_total === undefined || item.item_total === null || isNaN(item.item_total)
      );

      if (invalidItems.length > 0) {
        console.error('Invalid items found (missing item_total):', invalidItems);
        toast({
          title: "Validation Error",
          description: "Some items are missing total price. Please check all items.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log('Sending quotation update:', quotationData);
      console.log('Items being sent:', JSON.stringify(quotationData.items, null, 2));
      console.log('First item item_total:', quotationData.items[0]?.item_total);
      console.log('First item keys:', Object.keys(quotationData.items[0] || {}));

      console.log('🚀 ABOUT TO CALL quotationsApi.update with ID:', quotationId, 'type:', typeof quotationId);
      const response = await quotationsApi.update(quotationId, quotationData);
      console.log('✅ SUCCESS! Quotation updated:', response.data);

      // Navigate using Next.js router
      router.push(`/dashboard/quotations/${quotationId}`);
      router.refresh(); // Force refresh to clear cache
    } catch (error: unknown) {
      console.error('Error updating quotation:', error);

      // Get detailed error information
      const axiosError = error as any;
      console.error('Error response:', axiosError?.response?.data);
      console.error('Error status:', axiosError?.response?.status);
      console.error('Full error object:', JSON.stringify(axiosError?.response, null, 2));

      let errorMsg = 'Error updating quotation. Please try again.';

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
            <h1 className="text-3xl font-bold tracking-tight">Edit Quotation</h1>
            <p className="text-muted-foreground">
              Update quotation details.
            </p>
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.company_name} ${customer.contact_person || ''} ${customer.email || ''}`}
                              onSelect={() => {
                                handleInputChange('customer_id', customer.id.toString());
                                setOpenCustomerPopover(false);
                              }}
                            >
                              <div className="flex flex-col w-full">
                                <span className="font-medium">{customer.company_name}</span>
                                {customer.contact_person && (
                                  <span className="text-sm text-muted-foreground">
                                    {customer.contact_person}
                                    {customer.email && ` • ${customer.email}`}
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

                <div className="space-y-2 md:col-span-2">
                <Label htmlFor="valid_until">Valid Until</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => handleInputChange('valid_until', e.target.value)}
                />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="MVR">MVR - Maldivian Rufiyaa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="prepared_by">Prepared By</Label>
                <Input
                  id="prepared_by"
                  type="text"
                  value={currentUser}
                  disabled
                  className="bg-muted"
                />
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
                    <th className="p-2 text-right text-xs font-medium w-28">GST Tax ({defaultTaxRate}%)</th>
                    <th className="p-2 text-right text-xs font-medium w-28">Import Duty</th>
                    <th className="p-2 text-right text-xs font-medium w-28">Total</th>
                    <th className="p-2 text-center text-xs font-medium w-16">Actions</th>
                  </tr>
                </thead>
                <tbody>
              {items.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`border-b ${item.is_amc_line ? 'bg-green-50' : item.is_service_item ? 'bg-blue-50' : ''}`}
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
                          <Input
                            value={getSelectedProductName(item.product_id)}
                            disabled
                            className="h-9 text-xs bg-muted"
                          />
                        )}
                      </td>
                      <td className="p-2 align-middle">
                        {!item.is_amc_line ? (
                      <Textarea
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            className="min-h-[60px] text-xs resize-none"
                            placeholder="Description"
                          />
                        ) : (
                          <Textarea
                            value={item.description}
                            disabled
                            className="min-h-[60px] text-xs resize-none bg-muted"
                          />
                        )}
                      </td>
                      <td className="p-2 align-middle">
                        {item.is_service_item ? (
                          <div className="h-9 flex items-center justify-center text-xs font-medium text-muted-foreground">
                            Lot
                      </div>
                        ) : (
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            disabled={item.is_amc_line}
                            className={`h-9 text-xs text-right ${item.is_amc_line ? 'bg-muted' : ''}`}
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
                          disabled={item.is_amc_line}
                          className={`h-9 text-xs text-right ${item.is_amc_line ? 'bg-muted' : ''}`}
                      />
                      </td>
                      <td className="p-2 align-middle text-right">
                        <div className="text-sm font-medium">
                          ${formatCurrency((Number(item.total_price || 0) * Number(item.tax_rate || 0)) / 100)}
                    </div>
                      </td>
                      <td className="p-2 align-middle">
                      {(() => {
                        const product = products.find(p => p.id === item.product_id);
                        const categoryType = product?.category_type || product?.category?.category_type;
                        const isHardwareProduct = categoryType === 'hardware' && !item.is_service_item && !item.is_amc_line;

                        return isHardwareProduct ? (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.import_duty || 0}
                              onChange={(e) => handleItemChange(item.id, 'import_duty', parseFloat(e.target.value) || 0)}
                              className="h-9 text-xs text-right"
                            />
                          ) : (
                            <div className="text-xs text-right p-2 text-muted-foreground">N/A</div>
                        );
                      })()}
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
                  {calculateDiscount() > 0 && (
                    <tr>
                      <td colSpan={7} className="p-2 text-right font-semibold text-sm text-green-600">Discount:</td>
                      <td className="p-2 text-right font-bold text-sm text-green-600">-${formatCurrency(calculateDiscount())}</td>
                      <td></td>
                    </tr>
                  )}
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

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Quotation summary</CardDescription>
                      </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                onClick={() => setShowCalculatorDialog(true)}
                className="h-8 w-8 p-0"
                title="Discount Calculator"
                        >
                <Calculator className="h-4 w-4" />
                        </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${formatCurrency(calculateSubtotal())}</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span>Import Duty:</span>
                    {items.some(item => {
                      const product = products.find(p => p.id === item.product_id);
                      const categoryType = product?.category_type || product?.category?.category_type;
                      return categoryType === 'hardware' && !item.is_service_item && !item.is_amc_line;
                    }) && (
                      <div className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          id="global_duty_inclusive"
                          checked={items.some(item => item.import_duty_inclusive)}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setItems(prev => prev.map(item => {
                              const product = products.find(p => p.id === item.product_id);
                              const categoryType = product?.category_type || product?.category?.category_type;
                              const isHardwareProduct = categoryType === 'hardware' && !item.is_service_item && !item.is_amc_line;

                              if (isHardwareProduct) {
                                const updated = { ...item, import_duty_inclusive: isChecked };
                                if (isChecked) {
                                  updated.import_duty = 0;
                                } else {
                                  const totalPrice = updated.quantity * updated.unit_price;
                                  updated.import_duty = totalPrice * importDutyPercentage / 100;
                                }
                                return updated;
                              }
                              return item;
                            }));
                          }}
                          className="rounded border-gray-300 h-3 w-3"
                        />
                        <Label htmlFor="global_duty_inclusive" className="text-xs text-muted-foreground cursor-pointer">
                          Inclusive
                        </Label>
                      </div>
                      )}
                    </div>
                  <span>${formatCurrency(calculateImportDutyTotal())}</span>
                </div>
                {calculateImportDutyTotal() > 0 && (
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>Subtotal + Import Duty:</span>
                    <span>${formatCurrency(calculateSubtotalWithImportDuty())}</span>
                  </div>
                  )}
              </div>

              {/* Discount Section */}
              <div className="border-t pt-3 mt-3 space-y-3">
                <Label className="text-sm font-medium">Discount</Label>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-2">
                    <Select value={discountType} onValueChange={(value: 'value' | 'percentage') => setDiscountType(value)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="value">Fixed Value</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="text"
                      value={discountInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty, digits, and one decimal point with up to 2 decimal places
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
                      placeholder={discountType === 'percentage' ? 'Enter %' : 'Enter amount'}
                      className="h-9"
                    />
                  </div>
                </div>
                {calculateDiscount() > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Discount Applied:</span>
                    <span>-${formatCurrency(calculateDiscount())}</span>
                  </div>
                )}
              </div>

              {calculateDiscount() > 0 && (
                <div className="flex justify-between text-sm font-medium border-t pt-2">
                  <span>Amount After Discount:</span>
                  <span>${formatCurrency(calculateSubtotalAfterDiscount())}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span>GST Tax ({defaultTaxRate}%):</span>
                <span>${formatCurrency(calculateTaxTotal())}</span>
              </div>
              <div className="text-xs text-muted-foreground pl-1">
                (Calculated on {calculateDiscount() > 0 ? 'discounted' : calculateImportDutyTotal() > 0 ? 'duty-inclusive' : 'subtotal'} amount)
              </div>

              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>${formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
            <CardDescription>Quotation terms and conditions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="terms_conditions">Select Template</Label>
              <Select value={formData.terms_conditions_id} onValueChange={handleTermsConditionsChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select terms & conditions template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Terms & Conditions</SelectItem>
                  {termsConditions.length > 0 ? (
                    termsConditions.map((terms) => (
                      <SelectItem key={terms.id} value={terms.id?.toString() || ""}>
                        {terms.title} ({terms.category_type})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>
                      Loading templates... ({termsConditions.length} found)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Textarea
                id="terms_conditions"
                placeholder="Enter terms and conditions..."
                value={formData.terms_conditions}
                onChange={(e) => handleInputChange('terms_conditions', e.target.value)}
                rows={6}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            onClick={() => console.log('🔴 BUTTON CLICKED!')}
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Updating...' : 'Update Quotation'}
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
                    <span className="text-muted-foreground">Current Subtotal + Import Duty:</span>
                    <span className="font-medium">${formatCurrency(calculateSubtotalWithImportDuty())}</span>
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
    </div>
  );
}
