"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { serviceTermsApi } from "@/lib/api";
import ServiceTermsEditor from "@/components/service-terms/ServiceTermsEditor";
import { ArrowLeft, Loader2 } from "lucide-react";

interface ServiceTerm {
  id: number;
  title: string;
  content: string;
  category_type: string;
  page_number: number;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function EditServiceTermPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [serviceTerm, setServiceTerm] = useState<ServiceTerm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchServiceTerm();
    }
  }, [params.id]);

  const fetchServiceTerm = async () => {
    try {
      setLoading(true);
      console.log('Fetching service term with ID:', params.id);
      const response = await serviceTermsApi.getById(params.id as string);
      console.log('Service term response:', response.data);
      
      // Handle the API response structure
      if (response.data && response.data.success && response.data.data) {
        setServiceTerm(response.data.data);
      } else if (response.data && response.data.id) {
        // Fallback: direct data without success wrapper
        setServiceTerm(response.data);
      } else {
        console.error('Invalid response structure:', response.data);
        toast({
          title: "Error",
          description: "Service term not found",
          variant: "destructive",
        });
        router.push('/dashboard/service-terms');
      }
    } catch (error) {
      console.error('Error fetching service term:', error);
      toast({
        title: "Error",
        description: "Failed to load service term",
        variant: "destructive",
      });
      router.push('/dashboard/service-terms');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    router.push('/dashboard/service-terms');
  };

  const handleCancel = () => {
    router.push('/dashboard/service-terms');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading service term...
          </div>
        </div>
      </div>
    );
  }

  if (!serviceTerm) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Service term not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/service-terms')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Service Terms
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Service Term: {serviceTerm.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceTermsEditor
            term={serviceTerm}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
