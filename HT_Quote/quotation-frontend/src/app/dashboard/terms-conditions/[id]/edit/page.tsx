"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { termsConditionsApi, categoriesApi } from "@/lib/api";
import { ArrowLeft, Save, FileText } from "lucide-react";

interface Category {
  id: number;
  name: string;
  category_type: string;
}

interface TermsConditionsFormData {
  title: string;
  content: string;
  category_type: 'general' | 'hardware' | 'service' | 'amc';
  is_default: boolean;
  is_active: boolean;
  display_in_quotation: boolean;
}

export default function EditTermsConditionsPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState<TermsConditionsFormData>({
    title: "",
    content: "",
    category_type: "general",
    is_default: false,
    is_active: true,
    display_in_quotation: false,
  });

  useEffect(() => {
    loadData();
  }, [templateId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCategories(),
        loadTemplate()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load template data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async () => {
    try {
      const response = await termsConditionsApi.getById(templateId);
      const template = response.data;
      
      setFormData({
        title: template.title || "",
        content: template.content || "",
        category_type: template.category_type || "general",
        is_default: template.is_default || false,
        is_active: template.is_active !== undefined ? template.is_active : true,
        display_in_quotation: template.display_in_quotation || false,
      });
    } catch (error) {
      console.error("Error loading template:", error);
      toast({
        title: "Error",
        description: "Failed to load template details",
        variant: "destructive",
      });
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof TermsConditionsFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await termsConditionsApi.update(templateId, formData);
      
      toast({
        title: "Success",
        description: "Terms & Conditions template updated successfully.",
      });
      
      router.push("/dashboard/terms-conditions");
    } catch (error: any) {
      console.error("Error updating template:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update template",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/terms-conditions");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading template details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Templates</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Template</h1>
            <p className="text-gray-600 mt-1">Update the terms and conditions template</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Template Information</span>
            </CardTitle>
            <CardDescription>
              Update the template details and content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input 
                  id="title" 
                  placeholder="Enter template title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category_type">Category Type *</Label>
                <Select 
                  value={formData.category_type} 
                  onValueChange={(value) => handleInputChange('category_type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="amc">AMC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea 
                id="content" 
                placeholder="Enter terms and conditions content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                className="min-h-[300px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => handleInputChange('is_default', !!checked)}
                />
                <Label htmlFor="is_default" className="text-sm font-normal cursor-pointer">
                  Set as default template
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', !!checked)}
                />
                <Label htmlFor="is_active" className="text-sm font-normal cursor-pointer">
                  Active
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="display_in_quotation"
                  checked={formData.display_in_quotation}
                  onCheckedChange={(checked) => handleInputChange('display_in_quotation', !!checked)}
                />
                <Label htmlFor="display_in_quotation" className="text-sm font-normal cursor-pointer">
                  Display in Quotation Table
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? "Updating..." : "Update Template"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

