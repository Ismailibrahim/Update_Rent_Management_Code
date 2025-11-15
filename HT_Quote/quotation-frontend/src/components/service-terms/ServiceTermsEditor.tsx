"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { TextAlign } from "@tiptap/extension-text-align";
import { HardBreak } from "@tiptap/extension-hard-break";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { serviceTermsApi } from "@/lib/api";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Save,
  X,
  CornerDownLeft,
  Type,
  Eye,
  Edit3,
} from "lucide-react";

interface ServiceTerm {
  id: number;
  title: string;
  content: string;
  category_type: string;
  page_number: number;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
}

interface ServiceTermsEditorProps {
  term?: ServiceTerm | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function ServiceTermsEditor({ term, onSave, onCancel }: ServiceTermsEditorProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [lineSpacing, setLineSpacing] = useState("normal");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category_type: "service_terms",
    page_number: 1,
    display_order: 1,
    is_default: false,
    is_active: true,
  });

  // Get line spacing classes
  const getLineSpacingClass = (spacing: string) => {
    switch (spacing) {
      case 'tight': return 'leading-tight';
      case 'snug': return 'leading-snug';
      case 'normal': return 'leading-normal';
      case 'relaxed': return 'leading-relaxed';
      case 'loose': return 'leading-loose';
      default: return 'leading-normal';
    }
  };

  const getParagraphSpacingClass = (spacing: string) => {
    switch (spacing) {
      case 'tight': return 'mb-0';
      case 'snug': return 'mb-1';
      case 'normal': return 'mb-2';
      case 'relaxed': return 'mb-3';
      case 'loose': return 'mb-4';
      default: return 'mb-2';
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: {
          keepMarks: false,
          HTMLAttributes: {
            class: lineSpacing === 'tight' ? 'my-0' : lineSpacing === 'snug' ? 'my-1' : 'my-2',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: getParagraphSpacingClass(lineSpacing),
          },
        },
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      HardBreak.configure({
        keepMarks: false,
        HTMLAttributes: {
          class: lineSpacing === 'tight' ? 'my-0' : lineSpacing === 'snug' ? 'my-1' : 'my-2',
        },
      }),
      Paragraph.configure({
        HTMLAttributes: {
          class: getParagraphSpacingClass(lineSpacing),
        },
      }),
    ],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4 border rounded-md whitespace-pre-wrap ${getLineSpacingClass(lineSpacing)}`,
      },
      handleKeyDown: (view, event) => {
        // Allow Shift+Enter for hard breaks
        if (event.key === 'Enter' && event.shiftKey) {
          editor?.commands.setHardBreak();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (term) {
      setFormData({
        title: term.title,
        category_type: term.category_type,
        page_number: term.page_number,
        display_order: term.display_order,
        is_default: term.is_default,
        is_active: term.is_active,
      });
      // Ensure content is properly loaded with line breaks preserved
      if (editor && term.content) {
        // If content is plain text, convert line breaks to HTML
        const contentWithBreaks = term.content
          .replace(/\n/g, '<br>')
          .replace(/\r\n/g, '<br>');
        editor.commands.setContent(contentWithBreaks);
      }
    } else {
      setFormData({
        title: "",
        category_type: "service_terms",
        page_number: 1,
        display_order: 1,
        is_default: false,
        is_active: true,
      });
      editor?.commands.setContent("");
    }
  }, [term, editor]);

  // Update editor when line spacing changes
  useEffect(() => {
    if (editor) {
      // Force re-render by updating the editor attributes
      const currentContent = editor.getHTML();
      editor.commands.setContent(currentContent);
    }
  }, [lineSpacing, editor]);

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  const handleSave = async () => {
    if (!editor || !formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const content = editor.getHTML();
      
      // Ensure line breaks are properly preserved in the saved content
      const processedContent = content
        .replace(/<br\s*\/?>/gi, '<br>')
        .replace(/\n/g, '<br>')
        .replace(/\r\n/g, '<br>');

      const data = {
        ...formData,
        content: processedContent,
      };

      if (term) {
        await serviceTermsApi.update(term.id.toString(), data);
        toast({
          title: "Success",
          description: "Service term updated successfully",
        });
      } else {
        await serviceTermsApi.create(data);
        toast({
          title: "Success",
          description: "Service term created successfully",
        });
      }

      onSave();
    } catch (error) {
      console.error('Error saving service term:', error);
      toast({
        title: "Error",
        description: "Failed to save service term",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const MenuButton = ({ onClick, isActive, children, title }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      title={title}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Service Terms - Page 1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="page_number">Page Number</Label>
          <Input
            id="page_number"
            type="number"
            min="1"
            value={formData.page_number}
            onChange={(e) => setFormData({ ...formData, page_number: parseInt(e.target.value) || 1 })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="display_order">Display Order</Label>
          <Input
            id="display_order"
            type="number"
            min="1"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_type">Category Type</Label>
          <Input
            id="category_type"
            value={formData.category_type}
            onChange={(e) => setFormData({ ...formData, category_type: e.target.value })}
          />
        </div>
      </div>

      {/* Toggle Switches */}
      <div className="flex gap-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_default"
            checked={formData.is_default}
            onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
          />
          <Label htmlFor="is_default">Default Template</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
      </div>

      {/* Rich Text Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Content Editor</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="border rounded-t-md p-2 flex flex-wrap gap-1">
            <MenuButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              isActive={editor?.isActive('bold')}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              isActive={editor?.isActive('italic')}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              isActive={editor?.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor?.chain().focus().setHardBreak().run()}
              title="Line Break (Shift+Enter)"
            >
              <CornerDownLeft className="h-4 w-4" />
            </MenuButton>

            <div className="w-px h-6 bg-border mx-1" />

            <MenuButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              isActive={editor?.isActive('bulletList')}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              isActive={editor?.isActive('orderedList')}
              title="Ordered List"
            >
              <ListOrdered className="h-4 w-4" />
            </MenuButton>

            <div className="w-px h-6 bg-border mx-1" />

            <MenuButton
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              isActive={editor?.isActive({ textAlign: 'left' })}
              title="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              isActive={editor?.isActive({ textAlign: 'center' })}
              title="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              isActive={editor?.isActive({ textAlign: 'right' })}
              title="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
              isActive={editor?.isActive({ textAlign: 'justify' })}
              title="Justify"
            >
              <AlignJustify className="h-4 w-4" />
            </MenuButton>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Line Spacing Control */}
            <div className="flex items-center gap-1">
              <Type className="h-4 w-4 text-muted-foreground" />
              <select
                value={lineSpacing}
                onChange={(e) => setLineSpacing(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background"
                title="Line Spacing"
              >
                <option value="tight">Tight</option>
                <option value="snug">Snug</option>
                <option value="normal">Normal</option>
                <option value="relaxed">Relaxed</option>
                <option value="loose">Loose</option>
              </select>
            </div>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Preview Toggle Button */}
            <MenuButton
              onClick={togglePreview}
              isActive={isPreviewMode}
              title={isPreviewMode ? "Exit Preview" : "Preview"}
            >
              {isPreviewMode ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </MenuButton>

            <div className="w-px h-6 bg-border mx-1" />

            <MenuButton
              onClick={() => editor?.chain().focus().undo().run()}
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </MenuButton>

            <MenuButton
              onClick={() => editor?.chain().focus().redo().run()}
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </MenuButton>
          </div>

          {/* Editor or Preview */}
          <div className="border-t-0 border rounded-b-md">
            {isPreviewMode ? (
              <div className="p-4 min-h-[400px]">
                <div className="mb-4 pb-2 border-b">
                  <h3 className="text-lg font-semibold text-gray-800">Preview Mode</h3>
                  <p className="text-sm text-gray-600">This is how your content will appear in the quotation</p>
                </div>
                <div 
                  className={`prose prose-sm max-w-none ${getLineSpacingClass(lineSpacing)}`}
                  dangerouslySetInnerHTML={{ 
                    __html: editor?.getHTML() || '<p>No content to preview</p>' 
                  }}
                />
              </div>
            ) : (
              <EditorContent editor={editor} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        {isPreviewMode && (
          <div className="text-sm text-muted-foreground">
            💡 Preview shows how content appears in quotations
          </div>
        )}
        <div className="flex gap-3 ml-auto">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || isPreviewMode}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
