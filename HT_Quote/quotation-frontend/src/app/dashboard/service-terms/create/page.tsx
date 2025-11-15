"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ServiceTermsEditor from "@/components/service-terms/ServiceTermsEditor";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateServiceTermPage() {
  const router = useRouter();

  const handleSave = () => {
    router.push('/dashboard/service-terms');
  };

  const handleCancel = () => {
    router.push('/dashboard/service-terms');
  };

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
          <CardTitle>Create New Service Term</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceTermsEditor
            term={null}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
