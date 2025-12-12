import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface Employee {
  id: string;
}

interface Document {
  id: number;
  title: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_size_formatted: string;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

interface EmployeeDocumentsProps {
  employee: Employee;
}

export default function EmployeeDocuments({ employee }: EmployeeDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, setData, post, processing, reset, errors } = useForm({
    title: '',
    file: null as File | null,
  });

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/employees/${employee.id}/documents`);
      if (response.ok) {
        const result = await response.json();
        setDocuments(result.documents);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [employee.id]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setData('file', file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!data.title.trim() || !data.file) {
      toast.error('Please provide both title and file');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('file', data.file);

    try {
      const response = await fetch(`/employees/${employee.id}/documents`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setDocuments(prev => [result.document, ...prev]);
        reset();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        toast.success('Document uploaded successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const response = await fetch(`/employees/${employee.id}/documents/${document.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.original_filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast.error('Failed to download document');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const handleDelete = async (document: Document) => {
    if (!confirm(`Are you sure you want to delete "${document.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/employees/${employee.id}/documents/${document.id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== document.id));
        toast.success('Document deleted successfully');
      } else {
        toast.error('Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📄';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Enter document title"
                  value={data.title}
                  onChange={(e) => setData('title', e.target.value)}
                  disabled={uploading}
                />
                {errors.title && (
                  <p className="text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  disabled={uploading}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.txt,.zip,.rar"
                />
                {data.file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {data.file.name}
                  </p>
                )}
                {errors.file && (
                  <p className="text-sm text-red-600">{errors.file}</p>
                )}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF, XLS, XLSX, TXT, ZIP, RAR</p>
              <p>Maximum file size: 10MB</p>
            </div>

            <Button type="submit" disabled={uploading || !data.title.trim() || !data.file}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploaded Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((document, index) => (
                <div key={document.id}>
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {getFileIcon(document.mime_type)}
                      </div>
                      <div>
                        <h4 className="font-medium">{document.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {document.original_filename} • {document.file_size_formatted} •
                          Uploaded by {document.uploaded_by} on {document.created_at}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(document)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(document)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {index < documents.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
