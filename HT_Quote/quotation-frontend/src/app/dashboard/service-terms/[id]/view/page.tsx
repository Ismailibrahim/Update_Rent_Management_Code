"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { serviceTermsApi } from "@/lib/api";
import { ArrowLeft, Edit, Loader2 } from "lucide-react";

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

export default function ViewServiceTermPage() {
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

  const handleEdit = () => {
    router.push(`/dashboard/service-terms/${params.id}/edit`);
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
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/service-terms')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Service Terms
        </Button>
        
        <Button onClick={handleEdit} className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{serviceTerm.title}</CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant={serviceTerm.is_active ? "default" : "secondary"}>
                  {serviceTerm.is_active ? "Active" : "Inactive"}
                </Badge>
                {serviceTerm.is_default && (
                  <Badge variant="outline">Default</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  Page {serviceTerm.page_number} • Order {serviceTerm.display_order}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Content Preview</h3>
                <div className="border rounded-lg p-4 bg-gray-50">
                  {serviceTerm.content ? (
                    <div 
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: serviceTerm.content }}
                    />
                  ) : (
                    <div className="text-muted-foreground italic">
                      No content available
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <strong>Category:</strong> {serviceTerm.category_type || 'N/A'}
                </div>
                <div>
                  <strong>Last Updated:</strong> {serviceTerm.updated_at ? new Date(serviceTerm.updated_at).toLocaleString() : 'N/A'}
                </div>
              </div>
              
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
