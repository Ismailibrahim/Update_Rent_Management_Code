"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HardwareRepairDetails {
  id?: number;
  quotation_id: number;
  case_numbers?: string;
  labour_charges?: number;
  labour_inclusive: boolean;
  serial_numbers?: string;
}

interface HardwareRepairCardProps {
  quotationId: number;
  hardwareRepairDetails: HardwareRepairDetails | null;
  onUpdate: (details: HardwareRepairDetails | null) => void;
}

export default function HardwareRepairCard({ 
  quotationId, 
  hardwareRepairDetails, 
  onUpdate 
}: HardwareRepairCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [caseNumbers, setCaseNumbers] = useState<string[]>(['']);
  const [serialNumbers, setSerialNumbers] = useState<string[]>(['']);
  const [labourCharges, setLabourCharges] = useState<number>(0);
  const [labourInclusive, setLabourInclusive] = useState<boolean>(false);

  // Initialize form data when hardwareRepairDetails changes
  // Use a ref to track if we've initialized to prevent resetting state
  const isInitialized = useRef(false);
  
  useEffect(() => {
    // Only initialize once on mount if hardwareRepairDetails exists
    if (hardwareRepairDetails && !isInitialized.current) {
      console.log('🟢 Initializing hardware repair data from props');
      // Parse case numbers from newline-separated string
      const parsedCaseNumbers = hardwareRepairDetails.case_numbers 
        ? hardwareRepairDetails.case_numbers.split('\n').filter(cn => cn.trim())
        : [''];
      setCaseNumbers(parsedCaseNumbers.length > 0 ? parsedCaseNumbers : ['']);
      
      // Parse serial numbers from newline-separated string
      const parsedSerialNumbers = hardwareRepairDetails.serial_numbers 
        ? hardwareRepairDetails.serial_numbers.split('\n').filter(sn => sn.trim())
        : [''];
      setSerialNumbers(parsedSerialNumbers.length > 0 ? parsedSerialNumbers : ['']);
      
      setLabourCharges(hardwareRepairDetails.labour_charges || 0);
      setLabourInclusive(hardwareRepairDetails.labour_inclusive || false);
      setIsExpanded(true); // Auto-expand if data exists
      isInitialized.current = true;
    }
  }, [hardwareRepairDetails, quotationId]);

  const hasData = (caseNumbers.some(cn => cn.trim()) || 
                   serialNumbers.some(sn => sn.trim()) || 
                   labourCharges > 0);

  // Helper function to notify parent of changes
  const notifyParent = (
    updatedCaseNumbers: string[] = caseNumbers,
    updatedSerialNumbers: string[] = serialNumbers,
    updatedLabourCharges: number = labourCharges,
    updatedLabourInclusive: boolean = labourInclusive
  ) => {
    const updatedData: HardwareRepairDetails = {
      quotation_id: quotationId,
      case_numbers: updatedCaseNumbers.filter(cn => cn.trim()).join('\n'),
      labour_charges: updatedLabourCharges,
      labour_inclusive: updatedLabourInclusive,
      serial_numbers: updatedSerialNumbers.filter(sn => sn.trim()).join('\n')
    };
    onUpdate(updatedData);
  };

  // Case Numbers handlers
  const addCaseNumber = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card header click
    e?.preventDefault(); // Prevent any default behavior
    console.log('🔵 Add Case Number clicked', caseNumbers);
    const updated = [...caseNumbers, ''];
    console.log('🔵 Updated case numbers:', updated);
    setCaseNumbers(updated);
    // Use setTimeout to ensure state update completes before notifying parent
    setTimeout(() => notifyParent(updated), 0);
  };

  const removeCaseNumber = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card header click
    e?.preventDefault();
    console.log('🔴 Remove Case Number clicked', index);
    if (caseNumbers.length > 1) {
      const updated = caseNumbers.filter((_, i) => i !== index);
      setCaseNumbers(updated);
      setTimeout(() => notifyParent(updated), 0);
    }
  };

  const updateCaseNumber = (index: number, value: string) => {
    console.log('✏️ Update Case Number', index, value);
    const updated = [...caseNumbers];
    updated[index] = value;
    setCaseNumbers(updated);
    setTimeout(() => notifyParent(updated), 0);
  };

  // Serial Numbers handlers
  const addSerialNumber = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card header click
    e?.preventDefault();
    console.log('🔵 Add Serial Number clicked', serialNumbers);
    const updated = [...serialNumbers, ''];
    console.log('🔵 Updated serial numbers:', updated);
    setSerialNumbers(updated);
    setTimeout(() => notifyParent(undefined, updated), 0);
  };

  const removeSerialNumber = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card header click
    e?.preventDefault();
    console.log('🔴 Remove Serial Number clicked', index);
    if (serialNumbers.length > 1) {
      const updated = serialNumbers.filter((_, i) => i !== index);
      setSerialNumbers(updated);
      setTimeout(() => notifyParent(undefined, updated), 0);
    }
  };

  const updateSerialNumber = (index: number, value: string) => {
    console.log('✏️ Update Serial Number', index, value);
    const updated = [...serialNumbers];
    updated[index] = value;
    setSerialNumbers(updated);
    setTimeout(() => notifyParent(undefined, updated), 0);
  };

  const handleLabourChargesChange = (value: number) => {
    setLabourCharges(value);
    notifyParent(undefined, undefined, value);
  };

  const handleLabourInclusiveChange = (value: boolean) => {
    setLabourInclusive(value);
    notifyParent(undefined, undefined, undefined, value);
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleToggleExpand}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Wrench className="mr-2 h-5 w-5" />
            Hardware Repair
            {hasData && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Data Entered
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CardTitle>
        <CardDescription>
          Hardware repair details for this quotation
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Case Numbers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Case Numbers</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addCaseNumber}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {caseNumbers.map((caseNumber, index) => {
                    console.log(`📝 Rendering Case Number ${index + 1}:`, caseNumber);
                    return (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex-1">
                          <Label htmlFor={`case-number-${index}`} className="text-xs font-semibold text-gray-700">
                            Case Number {index + 1}
                          </Label>
                          <Input
                            id={`case-number-${index}`}
                            type="text"
                            placeholder="Enter case number"
                            value={caseNumber}
                            onChange={(e) => updateCaseNumber(index, e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        {caseNumbers.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => removeCaseNumber(index, e)}
                            className="h-8 w-8 p-0 mt-6"
                            title="Remove this case number"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Serial Numbers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Serial Numbers</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addSerialNumber}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {serialNumbers.map((serialNumber, index) => {
                    console.log(`📝 Rendering Serial Number ${index + 1}:`, serialNumber);
                    return (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex-1">
                          <Label htmlFor={`serial-number-${index}`} className="text-xs font-semibold text-gray-700">
                            Serial Number {index + 1}
                          </Label>
                          <Input
                            id={`serial-number-${index}`}
                            type="text"
                            placeholder="Enter serial number"
                            value={serialNumber}
                            onChange={(e) => updateSerialNumber(index, e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        {serialNumbers.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => removeSerialNumber(index, e)}
                            className="h-8 w-8 p-0 mt-6"
                            title="Remove this serial number"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Labour Charges */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="labour-charges">Labour Charges</Label>
                  <Checkbox
                    id="labour-inclusive"
                    checked={labourInclusive}
                    onCheckedChange={(checked) => handleLabourInclusiveChange(!!checked)}
                  />
                  <Label htmlFor="labour-inclusive" className="text-sm text-gray-600">
                    Inclusive
                  </Label>
                </div>
                <Input
                  id="labour-charges"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={labourCharges}
                  onChange={(e) => handleLabourChargesChange(parseFloat(e.target.value) || 0)}
                  disabled={labourInclusive}
                />
              </div>
            </div>
          </div>

        </CardContent>
      )}
    </Card>
  );
}
