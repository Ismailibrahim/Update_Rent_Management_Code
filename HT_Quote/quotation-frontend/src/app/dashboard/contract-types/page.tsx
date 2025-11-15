"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Power,
  GripVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

interface ContractType {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Statistics {
  total: number;
  active: number;
  inactive: number;
}

export default function ContractTypesPage() {
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContractType, setSelectedContractType] = useState<ContractType | null>(null);
  const [createData, setCreateData] = useState({
    name: "",
    is_active: true,
  });
  const [editData, setEditData] = useState({
    name: "",
    is_active: true,
  });

  useEffect(() => {
    fetchContractTypes();
    fetchStatistics();
  }, [searchQuery, statusFilter]);

  const fetchContractTypes = async () => {
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get("/contract-types", { params });
      setContractTypes(response.data.data || response.data);
    } catch (error) {
      console.error("Error fetching contract types:", error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get("/contract-types/statistics");
      setStatistics(response.data.data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const handleCreateContractType = async () => {
    try {
      await api.post("/contract-types", createData);
      setCreateDialogOpen(false);
      resetCreateData();
      fetchContractTypes();
      fetchStatistics();
    } catch (error) {
      console.error("Error creating contract type:", error);
    }
  };

  const handleEditContractType = async () => {
    if (!selectedContractType) return;

    try {
      await api.put(`/contract-types/${selectedContractType.id}`, editData);
      setEditDialogOpen(false);
      setSelectedContractType(null);
      fetchContractTypes();
    } catch (error) {
      console.error("Error updating contract type:", error);
    }
  };

  const handleDeleteContractType = async () => {
    if (!selectedContractType) return;

    try {
      await api.delete(`/contract-types/${selectedContractType.id}`);
      setDeleteDialogOpen(false);
      setSelectedContractType(null);
      fetchContractTypes();
      fetchStatistics();
    } catch (error) {
      console.error("Error deleting contract type:", error);
    }
  };

  const handleToggleStatus = async (contractType: ContractType) => {
    try {
      await api.post(`/contract-types/${contractType.id}/toggle-status`);
      fetchContractTypes();
      fetchStatistics();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleMoveUp = async (contractType: ContractType, index: number) => {
    if (index === 0) return;

    const newContractTypes = [...contractTypes];
    const temp = newContractTypes[index - 1];
    newContractTypes[index - 1] = newContractTypes[index];
    newContractTypes[index] = temp;

    const updatedContractTypes = newContractTypes.map((ct, i) => ({
      id: ct.id,
      sort_order: i,
    }));

    try {
      await api.post("/contract-types/update-sort-order", {
        contract_types: updatedContractTypes,
      });
      fetchContractTypes();
    } catch (error) {
      console.error("Error updating sort order:", error);
    }
  };

  const handleMoveDown = async (contractType: ContractType, index: number) => {
    if (index === contractTypes.length - 1) return;

    const newContractTypes = [...contractTypes];
    const temp = newContractTypes[index + 1];
    newContractTypes[index + 1] = newContractTypes[index];
    newContractTypes[index] = temp;

    const updatedContractTypes = newContractTypes.map((ct, i) => ({
      id: ct.id,
      sort_order: i,
    }));

    try {
      await api.post("/contract-types/update-sort-order", {
        contract_types: updatedContractTypes,
      });
      fetchContractTypes();
    } catch (error) {
      console.error("Error updating sort order:", error);
    }
  };

  const openEditDialog = (contractType: ContractType) => {
    setSelectedContractType(contractType);
    setEditData({
      name: contractType.name,
      is_active: contractType.is_active,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (contractType: ContractType) => {
    setSelectedContractType(contractType);
    setDeleteDialogOpen(true);
  };

  const resetCreateData = () => {
    setCreateData({
      name: "",
      is_active: true,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contract Types</h1>
          <p className="text-muted-foreground">
            Manage contract types for support contracts
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contract Type
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Types</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search contract types..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Order</TableHead>
                  <TableHead>Contract Type Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No contract types found
                    </TableCell>
                  </TableRow>
                ) : (
                  contractTypes.map((contractType, index) => (
                    <TableRow key={contractType.id}>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveUp(contractType, index)}
                            disabled={index === 0}
                          >
                            <GripVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{contractType.name}</TableCell>
                      <TableCell>
                        <Badge variant={contractType.is_active ? "default" : "secondary"}>
                          {contractType.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(contractType)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(contractType)}>
                              <Power className="mr-2 h-4 w-4" />
                              {contractType.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleMoveUp(contractType, index)}
                              disabled={index === 0}
                            >
                              ↑ Move Up
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleMoveDown(contractType, index)}
                              disabled={index === contractTypes.length - 1}
                            >
                              ↓ Move Down
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(contractType)}
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
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contract Type</DialogTitle>
            <DialogDescription>
              Create a new contract type for support contracts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Contract Type Name *</Label>
              <Input
                id="create-name"
                value={createData.name}
                onChange={(e) =>
                  setCreateData({ ...createData, name: e.target.value })
                }
                placeholder="e.g., Oracle Software Support"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="create-active"
                checked={createData.is_active}
                onChange={(e) =>
                  setCreateData({ ...createData, is_active: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="create-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetCreateData();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateContractType}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contract Type</DialogTitle>
            <DialogDescription>Update contract type details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Contract Type Name *</Label>
              <Input
                id="edit-name"
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
                placeholder="e.g., Oracle Software Support"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editData.is_active}
                onChange={(e) =>
                  setEditData({ ...editData, is_active: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedContractType(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditContractType}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contract Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedContractType?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedContractType(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteContractType}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
