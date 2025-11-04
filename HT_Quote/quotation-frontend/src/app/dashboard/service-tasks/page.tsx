"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { serviceTasksApi, productsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Search, Plus, Edit, Trash2, Clock, Package, Check, ChevronsUpDown } from "lucide-react";

interface ServiceTask {
  id: number;
  product_id: number;
  task_description: string;
  estimated_man_days?: number;
  sequence_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product?: {
    id: number;
    name: string;
    total_man_days?: number;
    category: {
      id: number;
      name: string;
      category_type: 'services' | 'hardware' | 'software';
    };
  };
}

interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  category_id: number;
  unit_price: number;
  total_man_days?: number;
  is_man_day_based: boolean;
  has_amc_option: boolean;
  amc_unit_price?: number;
  amc_description_id?: number;
  brand?: string;
  model?: string;
  part_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: {
    id: number;
    name: string;
    category_type: 'services' | 'hardware' | 'software';
  };
}

interface ServiceTaskFormData {
  product_id: number;
  task_description: string;
  estimated_man_days?: number;
  sequence_order: number;
}

interface BulkTaskData {
  product_id?: number;
  tasks: Array<{
    task_description: string;
    estimated_man_days?: number;
    sequence_order: number;
  }>;
}

export default function ServiceTasksPage() {
  const [serviceTasks, setServiceTasks] = useState<ServiceTask[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [showOnlyServiceProducts, setShowOnlyServiceProducts] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkCreateDialogOpen, setIsBulkCreateDialogOpen] = useState(false);
  const [openProductPopover, setOpenProductPopover] = useState(false);
  const [openBulkProductPopover, setOpenBulkProductPopover] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ServiceTask | null>(null);
  const [formData, setFormData] = useState<ServiceTaskFormData>({
    product_id: 0,
    task_description: "",
    estimated_man_days: undefined,
    sequence_order: 1,
  });
  const [bulkFormData, setBulkFormData] = useState<BulkTaskData>({
    product_id: undefined,
    tasks: [
      {
        task_description: "",
        estimated_man_days: undefined,
        sequence_order: 1,
      }
    ]
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Mock data for development
  const mockServiceTasks: ServiceTask[] = [
    {
      id: 1,
      product_id: 1,
      task_description: "Initial requirement gathering and analysis",
      estimated_man_days: 2.0,
      sequence_order: 1,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      product: {
        id: 1,
        name: "PMS Implementation Support",
        category: { id: 2, name: "Network Services", category_type: "services" }
      }
    },
    {
      id: 2,
      product_id: 1,
      task_description: "System configuration and setup",
      estimated_man_days: 4.0,
      sequence_order: 2,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      product: {
        id: 1,
        name: "PMS Implementation Support",
        category: { id: 2, name: "Network Services", category_type: "services" }
      }
    },
    {
      id: 3,
      product_id: 1,
      task_description: "User training and documentation",
      estimated_man_days: 3.0,
      sequence_order: 3,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      product: {
        id: 1,
        name: "PMS Implementation Support",
        category: { id: 2, name: "Network Services", category_type: "services" }
      }
    },
  ];

  const mockProducts: Product[] = [
    {
      id: 1,
      name: "PMS Implementation Support",
      description: "Complete PMS implementation and support services",
      sku: "PMS-IMP-001",
      category_id: 2,
      unit_price: 3600.00,
      is_man_day_based: true,
      has_amc_option: false,
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      category: {
        id: 2,
        name: "Network Services",
        category_type: "services"
      }
    }
  ];

  useEffect(() => {
    fetchServiceTasks();
    fetchProducts();
  }, []);

  const fetchServiceTasks = async () => {
    try {
      setLoading(true);
      const response = await serviceTasksApi.getAll();
      // Handle paginated response - tasks are in response.data.data
      const tasksData = response.data?.data || response.data || [];
      const tasksArray = Array.isArray(tasksData) ? tasksData : [];
      setServiceTasks(tasksArray);
    } catch (error) {
      console.error('Error fetching service tasks:', error);
      // Use mock data on error
      setServiceTasks(mockServiceTasks);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsApi.getAll();
      // Handle paginated response - products are in response.data.data
      const productsData = response.data?.data || response.data || [];
      const productsArray = Array.isArray(productsData) ? productsData : [];
      setProducts(productsArray);
    } catch (error) {
      console.error('Error fetching products:', error);
      // Use mock data on error
      setProducts(mockProducts);
    }
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const response = await serviceTasksApi.create(formData);
      setServiceTasks([...serviceTasks, response.data]);
      setIsCreateDialogOpen(false);
      setFormData({
        product_id: 0,
        task_description: "",
        estimated_man_days: undefined,
        sequence_order: 1,
      });
      toast({
        title: "Success",
        description: "Service task created successfully",
      });
    } catch (error) {
      console.error('Error creating service task:', error);
      toast({
        title: "Error",
        description: "Failed to create service task",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkCreate = async () => {
    try {
      setSubmitting(true);
      
      if (!bulkFormData.product_id) {
        toast({
          title: "Error",
          description: "Please select a product",
          variant: "destructive",
        });
        return;
      }

      // Create each task individually
      const createdTasks: ServiceTask[] = [];
      for (const task of bulkFormData.tasks.filter(t => t.task_description.trim())) {
        const response = await serviceTasksApi.create({
          product_id: bulkFormData.product_id,
          ...task
        });
        createdTasks.push(response.data);
      }

      setServiceTasks([...serviceTasks, ...createdTasks]);
      setIsBulkCreateDialogOpen(false);
      setBulkFormData({
        product_id: undefined,
        tasks: [
          {
            task_description: "",
            estimated_man_days: undefined,
            sequence_order: 1,
          }
        ]
      });
      toast({
        title: "Success",
        description: `Created ${createdTasks.length} service tasks successfully`,
      });
    } catch (error) {
      console.error('Error creating bulk service tasks:', error);
      toast({
        title: "Error",
        description: "Failed to create service tasks",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedTask) return;

    try {
      setSubmitting(true);
      const response = await serviceTasksApi.update(selectedTask.id.toString(), formData);
      setServiceTasks(serviceTasks.map(task => 
        task.id === selectedTask.id ? response.data : task
      ));
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      setFormData({
        product_id: 0,
        task_description: "",
        estimated_man_days: undefined,
        sequence_order: 1,
      });
      toast({
        title: "Success",
        description: "Service task updated successfully",
      });
    } catch (error) {
      console.error('Error updating service task:', error);
      toast({
        title: "Error",
        description: "Failed to update service task",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;

    try {
      setSubmitting(true);
      await serviceTasksApi.delete(selectedTask.id.toString());
      setServiceTasks(serviceTasks.filter(task => task.id !== selectedTask.id));
      setIsDeleteDialogOpen(false);
      setSelectedTask(null);
      toast({
        title: "Success",
        description: "Service task deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting service task:', error);
      toast({
        title: "Error",
        description: "Failed to delete service task",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (task: ServiceTask) => {
    setSelectedTask(task);
    setFormData({
      product_id: task.product_id,
      task_description: task.task_description,
      estimated_man_days: task.estimated_man_days,
      sequence_order: task.sequence_order,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (task: ServiceTask) => {
    setSelectedTask(task);
    setIsDeleteDialogOpen(true);
  };

  const addBulkTask = () => {
    const newSequence = Math.max(...bulkFormData.tasks.map(t => t.sequence_order)) + 1;
    setBulkFormData({
      ...bulkFormData,
      tasks: [
        ...bulkFormData.tasks,
        {
          task_description: "",
          estimated_man_days: undefined,
          sequence_order: newSequence,
        }
      ]
    });
  };

  const removeBulkTask = (index: number) => {
    setBulkFormData({
      ...bulkFormData,
      tasks: bulkFormData.tasks.filter((_, i) => i !== index)
    });
  };

  const updateBulkTask = (index: number, field: keyof BulkTaskData['tasks'][0], value: string | number) => {
    const updatedTasks = [...bulkFormData.tasks];
    updatedTasks[index] = { ...updatedTasks[index], [field]: value };
    setBulkFormData({
      ...bulkFormData,
      tasks: updatedTasks
    });
  };

  // Filter and sort tasks
  const filteredTasks = Array.isArray(serviceTasks) ? serviceTasks
    .filter(task => {
      const matchesSearch = task.task_description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProduct = productFilter === "all" || task.product_id.toString() === productFilter;
      return matchesSearch && matchesProduct;
    })
    .sort((a, b) => {
      if (a.product_id !== b.product_id) {
        return a.product_id - b.product_id;
      }
      return a.sequence_order - b.sequence_order;
    }) : [];

  // Group tasks by product
  const groupedTasks = filteredTasks.reduce((groups, task) => {
    const productId = task.product_id;
    if (!groups[productId]) {
      groups[productId] = {
        product: task.product,
        tasks: []
      };
    }
    groups[productId].tasks.push(task);
    return groups;
  }, {} as Record<number, { product: ServiceTask['product']; tasks: ServiceTask[] }>);



  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Tasks</h1>
          <p className="text-muted-foreground">
            Manage service tasks and man day estimations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setIsBulkCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Bulk Create
          </Button>

      {/* Bulk Create Dialog - Compact Design */}
      <Dialog open={isBulkCreateDialogOpen} onOpenChange={setIsBulkCreateDialogOpen}>
        <DialogContent className="!max-w-[60vw] !w-[60vw] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-xl font-bold">Bulk Create Service Tasks</DialogTitle>
            <DialogDescription className="text-sm">
              Create multiple service tasks for a product at once.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Product Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
              <Label htmlFor="bulk-product" className="text-sm font-semibold">Product *</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filter-service-products-bulk"
                    checked={showOnlyServiceProducts}
                    onCheckedChange={(checked) => setShowOnlyServiceProducts(!!checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="filter-service-products-bulk" className="text-xs font-normal cursor-pointer">
                    Service Products Only
                  </Label>
                </div>
              </div>
              <Popover open={openBulkProductPopover} onOpenChange={setOpenBulkProductPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openBulkProductPopover}
                    className="w-full justify-between h-10"
                  >
                    {bulkFormData.product_id
                      ? products.find((product) => product.id === bulkFormData.product_id)?.name
                      : "Select product..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandList>
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup>
                        {Array.isArray(products) && products
                          .filter(product => !showOnlyServiceProducts || product.category?.category_type === 'services' || product.is_man_day_based)
                          .map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={(currentValue) => {
                                // If selecting the same product, deselect it (clear)
                                if (bulkFormData.product_id === product.id) {
                                  setBulkFormData({ ...bulkFormData, product_id: undefined });
                                } else {
                                  setBulkFormData({ ...bulkFormData, product_id: product.id });
                                }
                                setOpenBulkProductPopover(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  bulkFormData.product_id === product.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                      {product.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {bulkFormData.product_id && (() => {
                const selectedProduct = products.find(p => p.id === bulkFormData.product_id);
                if (selectedProduct && (selectedProduct.category?.category_type === 'services' || selectedProduct.is_man_day_based)) {
                  return (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-blue-900 font-medium">Product Info:</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-600">
                            Total Man Days: <span className="font-semibold text-blue-700">{selectedProduct.total_man_days ? Number(selectedProduct.total_man_days).toFixed(1) : '0.0'}</span>
                          </span>
                          {selectedProduct.total_man_days && selectedProduct.unit_price && (
                            <span className="text-gray-600">
                              Per Day: <span className="font-semibold text-green-700">${Number(selectedProduct.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Tasks Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Service Tasks ({bulkFormData.tasks.length})</Label>
                <Button type="button" variant="outline" size="sm" onClick={addBulkTask} className="h-8">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Task
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 h-10">
                      <TableHead className="w-12 text-center text-xs">#</TableHead>
                      <TableHead className="text-xs">Task Description</TableHead>
                      <TableHead className="w-24 text-center text-xs">Sequence</TableHead>
                      <TableHead className="w-20 text-center text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkFormData.tasks.map((task, index) => (
                      <TableRow key={index} className="h-16">
                        <TableCell className="text-center font-medium text-sm">{index + 1}</TableCell>
                        <TableCell>
                          <Textarea
                            placeholder="Enter task description..."
                            value={task.task_description}
                            onChange={(e) => updateBulkTask(index, 'task_description', e.target.value)}
                            className="min-h-[60px] max-h-[60px] resize-none text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={task.sequence_order}
                            onChange={(e) => updateBulkTask(index, 'sequence_order', parseInt(e.target.value) || 1)}
                            className="text-center h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {bulkFormData.tasks.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBulkTask(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsBulkCreateDialogOpen(false);
                setBulkFormData({
                  product_id: undefined,
                  tasks: [
                    {
                      task_description: "",
                      estimated_man_days: undefined,
                      sequence_order: 1,
                    }
                  ]
                });
              }}
              disabled={submitting}
              className="h-9"
            >
              Cancel
            </Button>
            <Button onClick={handleBulkCreate} disabled={submitting} className="h-9">
              {submitting ? "Creating..." : `Create ${bulkFormData.tasks.length} Task${bulkFormData.tasks.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Service Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Service Task</DialogTitle>
                <DialogDescription>
                  Add a new service task for a product
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                  <Label htmlFor="create-product">Product *</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="filter-service-products"
                        checked={showOnlyServiceProducts}
                        onCheckedChange={(checked) => setShowOnlyServiceProducts(!!checked)}
                      />
                      <Label htmlFor="filter-service-products" className="text-xs font-normal cursor-pointer">
                        Service Products Only
                      </Label>
                    </div>
                  </div>
                  <Popover open={openProductPopover} onOpenChange={setOpenProductPopover}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openProductPopover}
                        className="w-full justify-between"
                      >
                        {formData.product_id > 0
                          ? products.find((product) => product.id === formData.product_id)?.name
                          : "Select product..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search products..." />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            {Array.isArray(products) && products
                              .filter(product => !showOnlyServiceProducts || product.category?.category_type === 'services' || product.is_man_day_based)
                              .map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={product.name}
                                  onSelect={(currentValue) => {
                                    // If selecting the same product, deselect it (clear)
                                    if (formData.product_id === product.id) {
                                      setFormData({ ...formData, product_id: 0 });
                                    } else {
                                      setFormData({ ...formData, product_id: product.id });
                                    }
                                    setOpenProductPopover(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.product_id === product.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                          {product.name}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {formData.product_id > 0 && (() => {
                    const selectedProduct = products.find(p => p.id === formData.product_id);
                    if (selectedProduct && (selectedProduct.category?.category_type === 'services' || selectedProduct.is_man_day_based)) {
                      return (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-900 font-medium">Product Info:</span>
                            <div className="flex items-center space-x-4">
                              <span className="text-gray-600">
                                Total Man Days: <span className="font-semibold text-blue-700">{selectedProduct.total_man_days ? Number(selectedProduct.total_man_days).toFixed(1) : '0.0'}</span>
                              </span>
                              {selectedProduct.total_man_days && selectedProduct.unit_price && (
                                <span className="text-gray-600">
                                  Per Day: <span className="font-semibold text-green-700">${Number(selectedProduct.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-description">Task Description *</Label>
                  <Textarea
                    id="create-description"
                    placeholder="Enter task description"
                    value={formData.task_description}
                    onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setFormData({
                      product_id: 0,
                      task_description: "",
                      estimated_man_days: undefined,
                      sequence_order: 1,
                    });
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? "Creating..." : "Create Task"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Clean Filters and Stats */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Clock className="h-5 w-5 text-gray-600" />
            <span>Service Tasks Overview</span>
          </CardTitle>
          <CardDescription className="text-gray-600">
            Search and filter service tasks by product or description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-64 border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400">
                <SelectValue placeholder="Filter by product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products
                  ?.filter(product => !showOnlyServiceProducts || product.category?.category_type === 'services' || product.is_man_day_based)
                  .map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-overview-service-products"
                checked={showOnlyServiceProducts}
                onCheckedChange={(checked) => setShowOnlyServiceProducts(!!checked)}
              />
              <Label htmlFor="filter-overview-service-products" className="text-sm font-normal cursor-pointer text-gray-600">
                Service products only
              </Label>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Grouped Service Tasks */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-gray-900">Service Tasks by Product</CardTitle>
          <CardDescription className="text-gray-600">
            Click on any product to expand and view its tasks. Compact design saves space while maintaining full functionality.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-500">Loading service tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No service tasks found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || productFilter !== "all" 
                    ? "Try adjusting your search or filter criteria"
                    : "Get started by creating your first service task"
                  }
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service Task
                </Button>
              </div>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {Object.entries(groupedTasks).map(([productId, group]) => {
                const productManDays = group.tasks.reduce((sum, task) => sum + (Number(task.estimated_man_days) || 0), 0);
                
                return (
                  <AccordionItem key={productId} value={productId} className="border border-gray-200 rounded-lg mb-2">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center space-x-3 w-full">
                        <Package className="h-5 w-5 text-gray-600" />
                        <div className="flex-1 text-left">
                          <h3 className="font-semibold text-gray-900">
                            {group.product?.name || `Product ${productId}`}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant="outline"
                              className={`capitalize text-xs ${
                                group.product?.category?.category_type === 'hardware'
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                                  : group.product?.category?.category_type === 'services'
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : 'border-purple-200 bg-purple-50 text-purple-700'
                          }`}
                        >
                              {group.product?.category?.category_type || 'Unknown'}
                        </Badge>
                            <span className="text-xs text-gray-500">
                              {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-xs text-gray-500">
                              • {group.product?.total_man_days ? Number(group.product.total_man_days).toFixed(1) : '0.0'} total man days (lot)
                            </span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-4 py-2">
                      <div className="space-y-2">
                        {group.tasks.map((task) => (
                          <div 
                            key={task.id} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3">
                                <Badge variant="outline" className="bg-white text-gray-700 text-xs">
                                  #{task.sequence_order}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate" title={task.task_description}>
                                    {task.task_description}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 ml-4">
                              <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(task)}
                                  className="h-8 w-8 p-0 hover:bg-gray-200"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(task)}
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                            </div>
                          </div>
                  ))}
            </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service Task</DialogTitle>
            <DialogDescription>
              Update the service task details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-product">Product *</Label>
              <Select
                value={formData.product_id?.toString() ?? ""}
                onValueChange={(value) => setFormData({ ...formData, product_id: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Task Description *</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter task description"
                value={formData.task_description}
                onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-man-days">Estimated Man Days</Label>
                <Input
                  id="edit-man-days"
                  type="number"
                  step="0.5"
                  placeholder="0.0"
                  value={formData.estimated_man_days ?? ""}
                  onChange={(e) => setFormData({ ...formData, estimated_man_days: parseFloat(e.target.value) || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sequence">Sequence Order *</Label>
                <Input
                  id="edit-sequence"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formData.sequence_order}
                  onChange={(e) => setFormData({ ...formData, sequence_order: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedTask(null);
                setFormData({
                  product_id: 0,
                  task_description: "",
                  estimated_man_days: undefined,
                  sequence_order: 1,
                });
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? "Updating..." : "Update Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
