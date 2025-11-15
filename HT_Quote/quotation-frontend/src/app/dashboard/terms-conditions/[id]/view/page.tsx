"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { termsConditionsApi } from "@/lib/api";
import { ArrowLeft, Edit, FileText, Star } from "lucide-react";

interface TermsConditionsTemplate {
  id: number;
  title: string;
  content: string;
  category_type: 'general' | 'hardware' | 'service' | 'amc';
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ViewTermsConditionsPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  
  const [template, setTemplate] = useState<TermsConditionsTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const response = await termsConditionsApi.getById(templateId);
      setTemplate(response.data);
    } catch (error) {
      console.error("Error loading template:", error);
      toast({
        title: "Error",
        description: "Failed to load template details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/dashboard/terms-conditions");
  };

  const handleEdit = () => {
    router.push(`/dashboard/terms-conditions/${templateId}/edit`);
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

  if (!template) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Template not found</p>
          <Button onClick={handleBack} className="mt-4">
            Back to Templates
          </Button>
        </div>
      </div>
    );
  }

  const getCategoryTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'general': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'hardware': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'service': return 'bg-green-100 text-green-800 border-green-300';
      case 'amc': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Templates</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">View Template</h1>
            <p className="text-gray-600 mt-1">Terms and conditions template details</p>
          </div>
        </div>
        <Button onClick={handleEdit} className="flex items-center space-x-2">
          <Edit className="h-4 w-4" />
          <span>Edit Template</span>
        </Button>
      </div>

      {/* Template Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{template.title}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {template.is_default && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Default
                </Badge>
              )}
              <Badge variant={template.is_active ? "default" : "secondary"}>
                {template.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Template information and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Title</Label>
              <div className="text-lg font-medium">{template.title}</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Category Type</Label>
              <div>
                <Badge variant="outline" className={`capitalize ${getCategoryTypeBadgeColor(template.category_type)}`}>
                  {template.category_type}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Content</Label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[300px] whitespace-pre-wrap text-sm">
              {template.content}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <div className={`h-4 w-4 rounded ${template.is_default ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
              <Label className="text-sm">
                {template.is_default ? "Default Template" : "Not Default"}
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`h-4 w-4 rounded ${template.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <Label className="text-sm">
                {template.is_active ? "Active" : "Inactive"}
              </Label>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t">
            <span>Created: {new Date(template.created_at).toLocaleDateString()}</span>
            <span>Last Updated: {new Date(template.updated_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          onClick={handleEdit}
          className="flex items-center space-x-2"
        >
          <Edit className="h-4 w-4" />
          <span>Edit Template</span>
        </Button>
      </div>
    </div>
  );
}

