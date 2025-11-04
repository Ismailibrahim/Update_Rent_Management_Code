"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { customerContactsApi, customersApi, contactTypesApi, designationsApi } from "@/lib/api";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Star,
  StarOff,
  User,
  Mail,
  Phone,
  Building2,
  Filter,
  Download,
  Upload,
} from "lucide-react";

interface CustomerContact {
  id: number;
  customer_id: number;
  contact_person: string;
  designation?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  is_primary: boolean;
  contact_type: 'primary' | 'billing' | 'technical' | 'manager' | 'operations' | 'other';
  notes?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  customer?: {
    id: number;
    resort_name: string;
    resort_code?: string;
  };
  creator?: {
    id: number;
    name: string;
    email: string;
  };
}

interface Customer {
  id: number;
  resort_name: string;
  resort_code?: string;
  holding_company?: string;
}

interface ContactFormData {
  customer_id: number;
  contact_person: string;
  designation: string;
  email: string;
  phone: string;
  mobile: string;
  is_primary: boolean;
  contact_type: string;
  notes: string;
}

interface ContactType {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

interface Designation {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

export default function CustomerContactsPage() {
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contactTypes, setContactTypes] = useState<ContactType[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [selectedContactType, setSelectedContactType] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof CustomerContact>("contact_person");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState<{ success: number; errors: string[] } | null>(null);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [deletingContact, setDeletingContact] = useState<CustomerContact | null>(null);
  
  // Searchable dropdown states
  const [createCustomerDropdownOpen, setCreateCustomerDropdownOpen] = useState(false);
  const [editCustomerDropdownOpen, setEditCustomerDropdownOpen] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<ContactFormData>({
    customer_id: 0,
    contact_person: "",
    designation: "",
    email: "",
    phone: "",
    mobile: "",
    is_primary: false,
    contact_type: "",
    notes: "",
  });

  const { toast } = useToast();

  // Helper functions for customer selection
  const getSelectedCustomerName = (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? `${customer.resort_name} ${customer.resort_code ? `(${customer.resort_code})` : ''}` : 'Select customer';
  };

  // Download CSV template
  const downloadContactsTemplate = () => {
    const csv = [
      'customer_id,customer_code,customer_name,contact_person,designation,email,phone,mobile,contact_type,is_primary,notes',
      '12,RES001,Paradise Resort,John Doe,Manager,john@paradise.mv,+9603001000,+9607001000,Primary,true,Main decision maker',
      ',RES002,Sunset Villa,Jane Smith,Finance,jane@sunset.mv,,+9607300000,Billing,false,Handles invoices',
      ',,Blue Lagoon Resort,Ahmed Ali,Engineer,ahmed@bluelagoon.mv,+9603112233,,Technical,false,Tech POC',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'customer_contacts_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Load data
  useEffect(() => {
    loadContacts();
    loadCustomers();
    loadContactTypes();
    loadDesignations();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await customerContactsApi.getAll();
      setContacts(response.data.data || response.data);
    } catch (error) {
      console.error("Error loading contacts:", error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customersApi.getAll();
      setCustomers(response.data.data || response.data);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  const loadContactTypes = async () => {
    try {
      const response = await contactTypesApi.getAll();
      setContactTypes(response.data.data || response.data);
    } catch (error) {
      console.error("Error loading contact types:", error);
      toast({
        title: "Error",
        description: "Failed to load contact types",
        variant: "destructive",
      });
    }
  };

  const loadDesignations = async () => {
    try {
      const response = await designationsApi.getAll();
      setDesignations(response.data.data || response.data);
    } catch (error) {
      console.error("Error loading designations:", error);
      toast({
        title: "Error",
        description: "Failed to load designations",
        variant: "destructive",
      });
    }
  };

  // Filter and sort contacts
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = 
      contact.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.customer?.resort_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCustomer = selectedCustomer === "all" || contact.customer_id.toString() === selectedCustomer;
    const matchesType = selectedContactType === "all" || contact.contact_type === selectedContactType;
    
    return matchesSearch && matchesCustomer && matchesType;
  });

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    let aValue = '';
    let bValue = '';
    
    if (sortField === 'customer') {
      aValue = a.customer?.resort_name || '';
      bValue = b.customer?.resort_name || '';
    } else if (sortField === 'designation') {
      aValue = a.designation || '';
      bValue = b.designation || '';
    } else if (sortField === 'contact_type') {
      aValue = a.contact_type || '';
      bValue = b.contact_type || '';
    } else if (sortField === 'email') {
      aValue = a.email || '';
      bValue = b.email || '';
    } else if (sortField === 'phone') {
      aValue = a.phone || '';
      bValue = b.phone || '';
    } else if (sortField === 'is_primary') {
      aValue = a.is_primary ? '1' : '0';
      bValue = b.is_primary ? '1' : '0';
    } else {
      aValue = String(a[sortField as keyof CustomerContact] || '');
      bValue = String(b[sortField as keyof CustomerContact] || '');
    }
    
    return sortDirection === "asc" 
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  });

  // Pagination
  const totalPages = Math.ceil(sortedContacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContacts = sortedContacts.slice(startIndex, startIndex + itemsPerPage);

  // Sort handler
  const handleSort = (field: keyof CustomerContact | 'customer') => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field as keyof CustomerContact);
      setSortDirection("asc");
    }
  };

  // Get sort icon
  const getSortIcon = (field: keyof CustomerContact | 'customer') => {
    if (sortField === field) {
      return sortDirection === "asc" ? " ↑" : " ↓";
    }
    return "";
  };

  // Form handlers
  const handleInputChange = (field: keyof ContactFormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      customer_id: 0,
      contact_person: "",
      designation: "",
      email: "",
      phone: "",
      mobile: "",
      is_primary: false,
      contact_type: contactTypes.length > 0 ? contactTypes[0].name : "",
      notes: "",
    });
  };

  // CRUD operations
  const handleCreateContact = async () => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (formData.customer_id === 0) {
        toast({
          title: "Error",
          description: "Please select a customer",
          variant: "destructive",
        });
        return;
      }
      
      if (!formData.contact_person.trim()) {
        toast({
          title: "Error",
          description: "Contact person name is required",
          variant: "destructive",
        });
        return;
      }
      
      // Debug: Log the data being sent
      console.log("Creating contact with data:", {
        customerId: formData.customer_id,
        formData: formData
      });
      
      // Debug: Check authentication token
      const token = localStorage.getItem('token');
      console.log("Auth token:", token ? "Present" : "Missing");
      
      // Validate required fields
      if (!formData.customer_id || formData.customer_id === 0) {
        toast({
          title: "Error",
          description: "Please select a customer",
          variant: "destructive",
        });
        return;
      }
      
      if (!formData.contact_person.trim()) {
        toast({
          title: "Error",
          description: "Please enter a contact person name",
          variant: "destructive",
        });
        return;
      }
      
      // Convert contact_type to lowercase to match backend validation
      // If contact_type is empty, default to 'other'
      const contactData = {
        ...formData,
        contact_type: formData.contact_type ? formData.contact_type.toLowerCase() : 'other'
      };
      
      await customerContactsApi.create(formData.customer_id.toString(), contactData);
      toast({
        title: "Success",
        description: "Contact created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      loadContacts();
    } catch (error: any) {
      console.error("Error creating contact:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error headers:", error.response?.headers);
      
      let errorMessage = "Failed to create contact";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;
    
    try {
      setLoading(true);
      
      // Convert contact_type to lowercase to match backend validation
      // If contact_type is empty, default to 'other'
      const contactData = {
        ...formData,
        contact_type: formData.contact_type ? formData.contact_type.toLowerCase() : 'other'
      };
      
      await customerContactsApi.update(editingContact.id.toString(), contactData);
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingContact(null);
      resetForm();
      loadContacts();
    } catch (error: any) {
      console.error("Error updating contact:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update contact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deletingContact) return;
    
    try {
      setLoading(true);
      await customerContactsApi.delete(deletingContact.id.toString());
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeletingContact(null);
      loadContacts();
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete contact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (contact: CustomerContact) => {
    try {
      setLoading(true);
      await customerContactsApi.setPrimary(contact.id.toString());
      toast({
        title: "Success",
        description: "Primary contact updated successfully",
      });
      loadContacts();
    } catch (error: any) {
      console.error("Error setting primary contact:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update primary contact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Dialog handlers
  const openCreateDialog = () => {
    resetForm();
    setCreateCustomerDropdownOpen(false);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (contact: CustomerContact) => {
    setEditingContact(contact);
    setEditCustomerDropdownOpen(false);
    setFormData({
      customer_id: contact.customer_id,
      contact_person: contact.contact_person,
      designation: contact.designation || "",
      email: contact.email || "",
      phone: contact.phone || "",
      mobile: contact.mobile || "",
      is_primary: contact.is_primary,
      contact_type: contact.contact_type,
      notes: contact.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (contact: CustomerContact) => {
    setDeletingContact(contact);
    setIsDeleteDialogOpen(true);
  };

  // Get contact type color
  const getContactTypeColor = (type: string) => {
    const contactType = contactTypes.find(ct => ct.name === type);
    if (contactType) {
      return {
        backgroundColor: contactType.color + '20',
        color: contactType.color,
        borderColor: contactType.color
      };
    }
    return {
      backgroundColor: '#6B728020',
      color: '#6B7280',
      borderColor: '#6B7280'
    };
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Customer Contacts</h1>
          <p className="text-muted-foreground">
            Manage contact information for all customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setIsImportDialogOpen(true); setImportStep('upload'); setImportRows([]); setImportSummary(null); }}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.resort_name} {customer.resort_code && `(${customer.resort_code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactType">Contact Type</Label>
              <Select value={selectedContactType} onValueChange={setSelectedContactType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {contactTypes.filter(ct => ct.is_active).map((contactType) => (
                    <SelectItem key={contactType.id} value={contactType.name}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: contactType.color }}
                        />
                        <span>{contactType.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Results</Label>
              <div className="text-sm text-muted-foreground pt-2">
                {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Contacts Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Import Contacts from CSV</DialogTitle>
            <DialogDescription>
              CSV headers supported: customer_id or customer_code or customer_name, contact_person, designation, email, phone, mobile, contact_type, is_primary, notes
            </DialogDescription>
          </DialogHeader>

          {importStep === 'upload' && (
            <div className="space-y-4">
              <Input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
              <div className="text-sm text-muted-foreground">
                Tip: include either customer_id, or a unique customer_code/resort_code, or exact customer_name to match existing customers.
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={downloadContactsTemplate}>
                  <Download className="mr-2 h-4 w-4" /> Download Template
                </Button>
                <Button
                  onClick={async () => {
                    if (!importFile) return;
                    const text = await importFile.text();
                    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
                    if (lines.length === 0) { toast({ title: 'Error', description: 'Empty file', variant: 'destructive' }); return; }
                    const headers = lines[0].split(',').map(h => h.trim());
                    const rows: any[] = [];
                    for (let i = 1; i < lines.length; i++) {
                      const cols = lines[i].split(',');
                      const row: any = {};
                      headers.forEach((h, idx) => row[h] = (cols[idx] || '').trim());
                      // Resolve customer_id
                      let custId = Number(row.customer_id) || 0;
                      if (!custId && row.customer_code) {
                        const match = customers.find(c => (c.resort_code || '').toLowerCase() === String(row.customer_code).toLowerCase());
                        if (match) custId = match.id;
                      }
                      if (!custId && row.resort_code) {
                        const match = customers.find(c => (c.resort_code || '').toLowerCase() === String(row.resort_code).toLowerCase());
                        if (match) custId = match.id;
                      }
                      if (!custId && row.customer_name) {
                        const match = customers.find(c => c.resort_name.toLowerCase() === String(row.customer_name).toLowerCase());
                        if (match) custId = match.id;
                      }
                      if (!custId && row.resort_name) {
                        const match = customers.find(c => c.resort_name.toLowerCase() === String(row.resort_name).toLowerCase());
                        if (match) custId = match.id;
                      }
                      const parsed = {
                        customer_id: custId,
                        contact_person: row.contact_person || '',
                        designation: row.designation || '',
                        email: row.email || '',
                        phone: row.phone || '',
                        mobile: row.mobile || '',
                        contact_type: (row.contact_type || 'other').toLowerCase(),
                        is_primary: String(row.is_primary || '').toLowerCase() === 'true',
                        notes: row.notes || '',
                        _valid: !!custId && !!(row.contact_person || '').trim(),
                        _src: row,
                      };
                      rows.push(parsed);
                    }
                    setImportRows(rows);
                    setImportStep('preview');
                  }}
                  disabled={!importFile}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {importStep === 'preview' && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">{importRows.filter(r => r._valid).length} valid of {importRows.length} rows</div>
              <div className="border rounded max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importRows.slice(0, 15).map((r, i) => (
                      <TableRow key={i} className={!r._valid ? 'bg-red-50' : ''}>
                        <TableCell>{getSelectedCustomerName(r.customer_id)}</TableCell>
                        <TableCell>{r.contact_person || '-'}</TableCell>
                        <TableCell>{r.email || '-'}</TableCell>
                        <TableCell>{r.phone || '-'}</TableCell>
                        <TableCell>{r.is_primary ? 'Yes' : 'No'}</TableCell>
                        <TableCell>
                          {r._valid ? (
                            <Badge className="bg-green-100 text-green-700">Valid</Badge>
                          ) : (
                            <Badge variant="destructive">Invalid</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setImportStep('upload')}>Back</Button>
                <Button
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={async () => {
                    setLoading(true);
                    const valid = importRows.filter(r => r._valid);
                    const errors: string[] = [];
                    let success = 0;
                    for (const r of valid) {
                      try {
                        await customerContactsApi.create(String(r.customer_id), {
                          customer_id: r.customer_id,
                          contact_person: r.contact_person,
                          designation: r.designation,
                          email: r.email,
                          phone: r.phone,
                          mobile: r.mobile,
                          is_primary: r.is_primary,
                          contact_type: r.contact_type,
                          notes: r.notes,
                        });
                        success++;
                      } catch (e: any) {
                        errors.push(e?.response?.data?.message || e?.message || 'Unknown error');
                      }
                    }
                    setImportSummary({ success, errors });
                    setImportStep('result');
                    setLoading(false);
                    loadContacts();
                  }}
                  disabled={loading || importRows.filter(r => r._valid).length === 0}
                >
                  Import {importRows.filter(r => r._valid).length} Contacts
                </Button>
              </div>
            </div>
          )}

          {importStep === 'result' && importSummary && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-4">
                Imported {importSummary.success} contacts successfully.
              </div>
              {importSummary.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-4 max-h-40 overflow-auto text-sm">
                  {importSummary.errors.map((e, i) => (
                    <div key={i} className="mb-1">{e}</div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={() => { setIsImportDialogOpen(false); setImportRows([]); setImportSummary(null); setImportStep('upload'); }}>Done</Button>
              </div>
            </div>
          )}

        </DialogContent>
      </Dialog>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>
            {filteredContacts.length} contacts found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort("customer")}
                >
                  <div className="flex items-center">
                    Customer
                    {getSortIcon("customer")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort("contact_person")}
                >
                  <div className="flex items-center">
                    Contact Person
                    {getSortIcon("contact_person")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort("designation")}
                >
                  <div className="flex items-center">
                    Designation
                    {getSortIcon("designation")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort("email")}
                >
                  <div className="flex items-center">
                    Email
                    {getSortIcon("email")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort("phone")}
                >
                  <div className="flex items-center">
                    Phone
                    {getSortIcon("phone")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort("mobile")}
                >
                  <div className="flex items-center">
                    Mobile
                    {getSortIcon("mobile")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-50"
                  onClick={() => handleSort("is_primary")}
                >
                  <div className="flex items-center">
                    Primary
                    {getSortIcon("is_primary")}
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                      <span>Loading contacts...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No contacts found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{contact.customer?.resort_name}</div>
                          {contact.customer?.resort_code && (
                            <div className="text-xs text-muted-foreground">
                              {contact.customer.resort_code}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{contact.contact_person}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {contact.designation || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{contact.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.phone ? (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{contact.phone}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.mobile ? (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{contact.mobile}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.is_primary ? (
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-yellow-600">Primary</span>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetPrimary(contact)}
                          className="h-8 w-8 p-0"
                        >
                          <StarOff className="h-4 w-4 text-gray-400" />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(contact)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedContacts.length)} of {sortedContacts.length} contacts
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Contact Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Add a new contact for a customer
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <Popover open={createCustomerDropdownOpen} onOpenChange={setCreateCustomerDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={createCustomerDropdownOpen}
                    className="w-full justify-between"
                  >
                    {formData.customer_id ? getSelectedCustomerName(formData.customer_id) : "Select customer..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search customers..." />
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      {customers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          value={`${customer.resort_name} ${customer.resort_code || ''}`}
                          onSelect={() => {
                            handleInputChange('customer_id', customer.id);
                            setCreateCustomerDropdownOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              formData.customer_id === customer.id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{customer.resort_name}</span>
                            {customer.resort_code && (
                              <span className="text-xs text-muted-foreground">
                                Code: {customer.resort_code}
                              </span>
                            )}
                            {customer.holding_company && (
                              <span className="text-xs text-muted-foreground">
                                {customer.holding_company}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Contact Person - full width */}
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person *</Label>
              <Input
                id="contactPerson"
                placeholder="Enter contact person name"
                value={formData.contact_person}
                onChange={(e) => handleInputChange('contact_person', e.target.value)}
              />
            </div>

            {/* Designation and Contact Type - side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Select
                  value={formData.designation}
                  onValueChange={(value) => handleInputChange('designation', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.filter(d => d.is_active).map((designation) => (
                      <SelectItem key={designation.id} value={designation.name}>
                        {designation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactType">Contact Type</Label>
                <Select
                  value={formData.contact_type}
                  onValueChange={(value) => handleInputChange('contact_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactTypes.filter(ct => ct.is_active).map((contactType) => (
                      <SelectItem key={contactType.id} value={contactType.name}>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: contactType.color }} />
                          <span>{contactType.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            
            
            {/* Email - full width */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            {/* Phone and Mobile - side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+9607774588"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  placeholder="+960-777-0000"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this contact"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={formData.is_primary}
                onChange={(e) => handleInputChange('is_primary', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isPrimary">Set as primary contact</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setCreateCustomerDropdownOpen(false);
                resetForm();
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateContact}
              disabled={loading || !formData.contact_person.trim() || formData.customer_id === 0}
            >
              {loading ? "Creating..." : "Create Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-customer">Customer *</Label>
              <Popover open={editCustomerDropdownOpen} onOpenChange={setEditCustomerDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={editCustomerDropdownOpen}
                    className="w-full justify-between"
                  >
                    {formData.customer_id ? getSelectedCustomerName(formData.customer_id) : "Select customer..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search customers..." />
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      {customers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          value={`${customer.resort_name} ${customer.resort_code || ''}`}
                          onSelect={() => {
                            handleInputChange('customer_id', customer.id);
                            setEditCustomerDropdownOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              formData.customer_id === customer.id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{customer.resort_name}</span>
                            {customer.resort_code && (
                              <span className="text-xs text-muted-foreground">
                                Code: {customer.resort_code}
                              </span>
                            )}
                            {customer.holding_company && (
                              <span className="text-xs text-muted-foreground">
                                {customer.holding_company}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Contact Person - full width */}
            <div className="space-y-2">
              <Label htmlFor="edit-contactPerson">Contact Person *</Label>
              <Input
                id="edit-contactPerson"
                placeholder="Enter contact person name"
                value={formData.contact_person}
                onChange={(e) => handleInputChange('contact_person', e.target.value)}
              />
            </div>

            {/* Designation and Contact Type - side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-designation">Designation</Label>
                <Select
                  value={formData.designation}
                  onValueChange={(value) => handleInputChange('designation', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.filter(d => d.is_active).map((designation) => (
                      <SelectItem key={designation.id} value={designation.name}>
                        {designation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contactType">Contact Type</Label>
                <Select
                  value={formData.contact_type}
                  onValueChange={(value) => handleInputChange('contact_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactTypes.filter(ct => ct.is_active).map((contactType) => (
                      <SelectItem key={contactType.id} value={contactType.name}>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: contactType.color }} />
                          <span>{contactType.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Email - full width */}
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="contact@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            {/* Phone and Mobile - side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  placeholder="+960-123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mobile">Mobile</Label>
                <Input
                  id="edit-mobile"
                  placeholder="+960-987-6543"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional notes about this contact"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isPrimary"
                checked={formData.is_primary}
                onChange={(e) => handleInputChange('is_primary', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="edit-isPrimary">Set as primary contact</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditCustomerDropdownOpen(false);
                setEditingContact(null);
                resetForm();
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateContact}
              disabled={loading || !formData.contact_person.trim() || formData.customer_id === 0}
            >
              {loading ? "Updating..." : "Update Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Contact Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              <span className="font-semibold">Contact:</span> {deletingContact?.contact_person}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Customer:</span> {deletingContact?.customer?.resort_name}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              This action cannot be undone. This will permanently delete the contact record.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingContact(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteContact}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
