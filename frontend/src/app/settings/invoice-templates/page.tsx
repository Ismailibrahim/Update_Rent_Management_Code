'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { Select } from '@/components/UI/Select';
import { Textarea } from '@/components/UI/Textarea';
import SidebarLayout from '@/components/Layout/SidebarLayout';
import { 
  FileText, 
  Plus, 
  Save, 
  Eye, 
  Trash2, 
  Copy, 
  Download, 
  X, 
  Edit, 
  CheckCircle,
  Star,
  Settings,
  Palette,
  Type,
  Layout,
  Image as ImageIcon,
  ArrowLeft
} from 'lucide-react';
import { invoiceTemplatesAPI, InvoiceTemplate } from '@/services/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface TemplateSection {
  id: string;
  type: 'header' | 'body' | 'footer';
  content: string;
  styles: {
    backgroundColor?: string;
    color?: string;
    fontSize?: string;
    fontFamily?: string;
    padding?: string;
    textAlign?: string;
  };
}

export default function InvoiceTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'html' | 'pdf'>('html');
  
  // Template form state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateType, setTemplateType] = useState<'rent' | 'maintenance' | 'both'>('rent');
  const [htmlContent, setHtmlContent] = useState('');
  const [templateStyles, setTemplateStyles] = useState<Record<string, unknown>>({});
  
  // WYSIWYG editor state
  const [activeSection, setActiveSection] = useState<'header' | 'body' | 'footer'>('body');
  const [editorContent, setEditorContent] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Styling state
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [currentStyles, setCurrentStyles] = useState({
    fontFamily: 'Arial',
    fontSize: '14px',
    color: '#000000',
    backgroundColor: '#ffffff',
    textAlign: 'left',
    fontWeight: 'normal',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (editorRef.current && editorContent) {
      // Only update if content is different to avoid cursor jumping
      if (editorRef.current.innerHTML !== editorContent) {
        editorRef.current.innerHTML = editorContent;
      }
    }
  }, [editorContent, isEditing]);

  useEffect(() => {
    if (selectedTemplate) {
      setTemplateName(selectedTemplate.name);
      setTemplateDescription(selectedTemplate.description || '');
      setTemplateType(selectedTemplate.type);
      const content = selectedTemplate.html_content || getDefaultTemplate();
      setHtmlContent(content);
      setTemplateStyles(selectedTemplate.styles || {});
      setEditorContent(content);
    } else if (isEditing && !selectedTemplate) {
      const defaultContent = getDefaultTemplate();
      setEditorContent(defaultContent);
      setHtmlContent(defaultContent);
    }
  }, [selectedTemplate, isEditing]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await invoiceTemplatesAPI.getAll();
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to fetch invoice templates');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTemplate = () => {
    return `
      <div class="invoice-container" style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div class="header" style="border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="margin: 0; color: #333; font-size: 28px;">{{company_name}}</h1>
              <p style="margin: 5px 0; color: #666;">{{company_address}}</p>
              <p style="margin: 5px 0; color: #666;">{{company_email}} | {{company_phone}}</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; color: #333; font-size: 24px;">INVOICE</h2>
              <p style="margin: 5px 0; color: #666;">#{{invoice_number}}</p>
            </div>
          </div>
        </div>
        
        <div class="invoice-info" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
          <div>
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Bill To:</h3>
            <p style="margin: 5px 0; color: #666;"><strong>{{tenant_name}}</strong></p>
            <p style="margin: 5px 0; color: #666;">{{property_name}}</p>
            <p style="margin: 5px 0; color: #666;">Unit: {{unit_number}}</p>
          </div>
          <div>
            <p style="margin: 5px 0; color: #666;"><strong>Invoice Date:</strong> {{invoice_date}}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Due Date:</strong> {{due_date}}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Status:</strong> {{status}}</p>
          </div>
        </div>
        
        <div class="items-table" style="margin-bottom: 30px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #333;">Description</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #333;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #ddd;">Monthly Rent</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">{{rent_amount}} {{currency}}</td>
              </tr>
              {{#if late_fee}}
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #ddd;">Late Fee</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">{{late_fee}} {{currency}}</td>
              </tr>
              {{/if}}
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px;">Total:</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px;">{{total_amount}} {{currency}}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div class="footer" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          <p style="margin: 5px 0;">Thank you for your business!</p>
          <p style="margin: 5px 0;">Payment terms: Payment is due within {{due_days}} days of invoice date.</p>
        </div>
      </div>
    `;
  };

  const handleEditorChange = () => {
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  const applyStyle = (style: string, value: string) => {
    if (editorRef.current) {
      document.execCommand(style, false, value);
      handleEditorChange();
    }
  };

  const insertVariable = (variable: string) => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(`{{${variable}}}`);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        const textNode = document.createTextNode(`{{${variable}}}`);
        editorRef.current.appendChild(textNode);
      }
      handleEditorChange();
    }
  };

  const getSampleData = () => {
    return {
      company_name: 'Your Company Name',
      company_address: '123 Business Street, Male, Maldives',
      company_email: 'info@company.com',
      company_phone: '+960 123-4567',
      invoice_number: 'INV-2024-001',
      tenant_name: 'John Doe',
      property_name: 'Sunset Apartments',
      unit_number: 'A-101',
      invoice_date: new Date().toLocaleDateString(),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      status: 'Pending',
      rent_amount: '5,000',
      late_fee: '0',
      total_amount: '5,000',
      currency: 'MVR',
      due_days: '7',
    };
  };

  const replaceVariables = (html: string, data: Record<string, string>) => {
    let result = html;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, data[key]);
    });
    // Remove conditional blocks for preview
    result = result.replace(/\{\{#if\s+\w+\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
    return result;
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    
    try {
      toast.loading('Generating PDF...', { id: 'pdf-export' });
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${templateName || 'invoice'}-template.pdf`);
      toast.success('PDF exported successfully', { id: 'pdf-export' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF', { id: 'pdf-export' });
    }
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      const templateData: Partial<InvoiceTemplate> = {
        name: templateName,
        description: templateDescription,
        type: templateType,
        template_data: {},
        html_content: htmlContent,
        styles: templateStyles,
        is_active: true,
      };

      if (selectedTemplate) {
        await invoiceTemplatesAPI.update(selectedTemplate.id, templateData);
        toast.success('Template updated successfully');
      } else {
        await invoiceTemplatesAPI.create(templateData);
        toast.success('Template created successfully');
      }

      await fetchTemplates();
      setIsEditing(false);
      setSelectedTemplate(null);
      resetForm();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await invoiceTemplatesAPI.delete(id);
      toast.success('Template deleted successfully');
      await fetchTemplates();
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await invoiceTemplatesAPI.duplicate(id);
      toast.success('Template duplicated successfully');
      await fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await invoiceTemplatesAPI.setDefault(id);
      toast.success('Template set as default');
      await fetchTemplates();
    } catch (error) {
      console.error('Error setting default template:', error);
      toast.error('Failed to set default template');
    }
  };

  const resetForm = () => {
    setTemplateName('');
    setTemplateDescription('');
    setTemplateType('rent');
    setHtmlContent(getDefaultTemplate());
    setEditorContent(getDefaultTemplate());
    setTemplateStyles({});
  };

  const startNewTemplate = () => {
    resetForm();
    setSelectedTemplate(null);
    setIsEditing(true);
    // Initialize editor with default content
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = getDefaultTemplate();
        setEditorContent(getDefaultTemplate());
        setHtmlContent(getDefaultTemplate());
      }
    }, 100);
  };

  const editTemplate = (template: InvoiceTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(true);
  };

  const availableVariables = [
    { category: 'Company', vars: ['company_name', 'company_address', 'company_email', 'company_phone'] },
    { category: 'Invoice', vars: ['invoice_number', 'invoice_date', 'due_date', 'status'] },
    { category: 'Tenant', vars: ['tenant_name', 'tenant_email', 'tenant_phone'] },
    { category: 'Property', vars: ['property_name', 'unit_number'] },
    { category: 'Financial', vars: ['rent_amount', 'late_fee', 'total_amount', 'currency'] },
  ];

  if (isEditing) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedTemplate(null);
                  resetForm();
                }}
                className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Invoice Template Editor</h1>
                <p className="mt-2 text-gray-600">
                  {selectedTemplate ? 'Edit template' : 'Create new template'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Save className="h-4 w-4" />
                Save Template
              </Button>
            </div>
          </div>

          {/* Template Info */}
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Modern Rent Invoice"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Type</label>
                  <Select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value as 'rent' | 'maintenance' | 'both')}
                  >
                    <option value="rent">Rent Invoice</option>
                    <option value="maintenance">Maintenance Invoice</option>
                    <option value="both">Both</option>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Brief description of this template"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Editor and Variables */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Variables Panel */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Template Variables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableVariables.map((group) => (
                  <div key={group.category}>
                    <h4 className="text-xs font-semibold text-gray-600 mb-2">{group.category}</h4>
                    <div className="space-y-1">
                      {group.vars.map((variable) => (
                        <Button
                          key={variable}
                          variant="ghost"
                          size="sm"
                          onClick={() => insertVariable(variable)}
                          className="w-full justify-start text-xs h-7 px-2"
                        >
                          {variable}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* WYSIWYG Editor */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Template Editor</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => applyStyle('bold', '')}
                      className="font-bold"
                      title="Bold"
                    >
                      B
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => applyStyle('italic', '')}
                      className="italic"
                      title="Italic"
                    >
                      I
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => applyStyle('justifyLeft', '')}
                      title="Align Left"
                    >
                      L
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => applyStyle('justifyCenter', '')}
                      title="Align Center"
                    >
                      C
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => applyStyle('justifyRight', '')}
                      title="Align Right"
                    >
                      R
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleEditorChange}
                  className="min-h-[600px] p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 prose max-w-none"
                  style={{ fontFamily: currentStyles.fontFamily }}
                  suppressContentEditableWarning
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium">Preview</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewMode('html')}
                    className={previewMode === 'html' ? 'bg-blue-50' : ''}
                  >
                    HTML
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewMode('pdf')}
                    className={previewMode === 'pdf' ? 'bg-blue-50' : ''}
                  >
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-gray-50">
                <div
                  ref={previewRef}
                  className="bg-white shadow-lg p-8"
                  dangerouslySetInnerHTML={{
                    __html: replaceVariables(htmlContent, getSampleData()),
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice Templates</h1>
            <p className="mt-2 text-gray-600">
              Create and manage invoice templates for rent and maintenance invoices
            </p>
          </div>
          <Button
            onClick={startNewTemplate}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
          >
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>

        {/* Templates List */}
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading templates...</p>
            </CardContent>
          </Card>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No templates</h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by creating your first invoice template
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{template.name}</CardTitle>
                        {template.is_default && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        {template.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {template.type}
                      </span>
                      {template.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editTemplate(template)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(template.id)}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {!template.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(template.id)}
                          title="Set as Default"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

