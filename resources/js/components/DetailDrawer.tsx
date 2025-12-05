import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, FileText } from 'lucide-react';
import { router } from '@inertiajs/react';

interface FieldProps {
  id: string;
  key: string;
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  options?: { label: string; value: string; key: string }[];
  [key: string]: any;
}

interface FieldGroup {
  group: string;
  layout?: string;
  fields: FieldProps[];
}

interface DetailDrawerProps {
  item: Record<string, any> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields?: FieldProps[];
  groups?: FieldGroup[];
  titleKey?: string;
  subtitleKey?: string;
  titleLabel?: string;
  subtitleLabel?: string;
  viewMoreRoute?: (id: string | number) => string;
  extraData?: Record<string, any[]>;
}

// Helper to get nested value
const getNestedValue = (obj: any, path: string): any => {
  if (!obj || typeof obj !== 'object') return null;
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return null;
    return acc[key] !== undefined ? acc[key] : null;
  }, obj);
};

// Format date
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const MULTI_VALUE_TYPES = new Set([
  'checkbox-group',
  'grouped-checkboxes',
  'checkboxes',
  'multi-checkbox',
  'multi-select',
]);

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<
    string,
    { variant: 'default' | 'destructive' | 'secondary' | 'outline' }
  > = {
    active: { variant: 'default' },
    inactive: { variant: 'destructive' },
    'on-leave': { variant: 'secondary' },
    pending: { variant: 'secondary' },
    approved: { variant: 'default' },
    rejected: { variant: 'destructive' },
    completed: { variant: 'default' },
    cancelled: { variant: 'destructive' },
  };

  const config = statusConfig[status?.toLowerCase()] || { variant: 'outline' as const };

  return (
    <Badge variant={config.variant} className="capitalize">
      {status.replace('-', ' ')}
    </Badge>
  );
};

// Format value based on field type
const formatValue = (value: any, field: FieldProps, item: Record<string, any>, extraData?: Record<string, any[]>): string | React.ReactNode => {
  if (value === null || value === undefined || value === '') return '-';

  // Handle date types
  if (field.type === 'date' || field.name.includes('date') || field.name.includes('Date')) {
    return formatDate(value);
  }

  // Handle checkbox-group / multi-select arrays
  if (MULTI_VALUE_TYPES.has(field.type) && Array.isArray(value)) {
    if (value.length === 0) return '-';

    const resolveLabel = (val: any) => {
      if (extraData && extraData[field.key]) {
        const option = extraData[field.key].find(
          (opt: any) =>
            opt.id?.toString() === val.toString() ||
            opt.value === val ||
            opt.name === val,
        );
        if (option) return option.label || option.name || val;
      }

      if (field.options) {
        const option = field.options.find((opt) => opt.value === val);
        if (option) return option.label || val;
      }

      return val?.name || val?.label || String(val);
    };

    return (
      <div className="flex flex-wrap gap-1">
        {value.map((val, idx) => (
          <Badge
            key={val?.id || `${field.key}-${idx}`}
            className="bg-primary/20 text-black border border-primary/30 dark:bg-primary/30 dark:text-black"
          >
            {resolveLabel(val)}
          </Badge>
        ))}
      </div>
    );
  }

  // Handle single-select (lookup from options)
  if (field.type === 'single-select' && field.options) {
    const option = field.options.find((opt) => opt.value === value);
    return option?.label || value;
  }

  // Handle boolean
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle arrays (non-checkbox-group)
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';

    // Render array values as badges for consistency
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((val, idx) => {
          const displayValue =
            typeof val === 'object'
              ? val?.name || val?.label || JSON.stringify(val)
              : String(val);

          return (
            <Badge
              key={val?.id || `${field.key}-array-${idx}`}
              className="bg-primary/20 text-black border border-primary/30 dark:bg-primary/30 dark:text-black"
            >
              {displayValue}
            </Badge>
          );
        })}
      </div>
    );
  }

  // Handle objects
  if (typeof value === 'object') {
    return value.name || value.label || JSON.stringify(value);
  }

  return String(value);
};

export const DetailDrawer = ({
  item,
  open,
  onOpenChange,
  fields = [],
  groups = [],
  titleKey = 'name',
  subtitleKey = 'id',
  titleLabel,
  subtitleLabel,
  viewMoreRoute,
  extraData,
}: DetailDrawerProps) => {
  if (!item) return null;

  const title = getNestedValue(item, titleKey) || item[titleKey] || 'Details';
  const subtitle = subtitleKey ? (getNestedValue(item, subtitleKey) || item[subtitleKey]) : null;

  const handleViewMore = () => {
    if (viewMoreRoute && item.id) {
      onOpenChange(false);
      router.visit(viewMoreRoute(item.id));
    }
  };

  const renderField = (field: FieldProps) => {
    const candidateKeys = [
      (field as any).viewKey,
      field.name,
      field.key,
    ].filter((key): key is string => Boolean(key));

    let value: any = undefined;
    for (const key of candidateKeys) {
      value = getNestedValue(item, key) ?? item[key as keyof typeof item];
      if (value !== undefined && value !== null && value !== '') {
        break;
      }
    }

    const isStatusField =
      field.name.toLowerCase().includes('status') ||
      field.key.toLowerCase().includes('status') ||
      field.label.toLowerCase().includes('status');

    const formattedValue = formatValue(value, field, item, extraData);

    return (
      <div key={field.key} className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {field.label}
        </label>
        {isStatusField && value ? (
          <div className="mt-1">
            <StatusBadge status={String(value)} />
          </div>
        ) : React.isValidElement(formattedValue) ? (
          <div className="mt-1">{formattedValue}</div>
        ) : (
          <p className="mt-1 text-sm text-foreground">{formattedValue}</p>
        )}
      </div>
    );
  };

  const autoGroupFields = (fields: FieldProps[]): FieldGroup[] => {
    if (!fields || fields.length === 0) return [];

    const sections: Record<string, FieldProps[]> = {
      'General Information': [],
      'Schedule': [],
      'Access & Capacity': [],
      'Additional Information': [],
    };

    fields.forEach((field) => {
      const name = field.name?.toLowerCase() || '';
      const label = field.label?.toLowerCase() || '';
      const key = field.key?.toLowerCase() || '';
      const fieldType = field.type?.toLowerCase() || '';

      if (fieldType === 'password') return;

      const matches = (...tokens: string[]) =>
        tokens.some((token) => name.includes(token) || label.includes(token) || key.includes(token));

      if (matches('date', 'time', 'schedule')) {
        sections['Schedule'].push(field);
      } else if (matches('capacity', 'venue', 'allowed', 'department', 'position', 'permission', 'requirement')) {
        sections['Access & Capacity'].push(field);
      } else if (matches('remark', 'note', 'description') || fieldType === 'textarea') {
        sections['Additional Information'].push(field);
      } else {
        sections['General Information'].push(field);
      }
    });

    return Object.entries(sections)
      .filter(([, sectionFields]) => sectionFields.length > 0)
      .map(([group, sectionFields]) => ({
        group,
        fields: sectionFields,
        layout: 'grid-cols-1 md:grid-cols-2',
      }));
  };

  const displayGroups = groups.length > 0 ? groups : autoGroupFields(fields);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <SheetHeader className="border-b border-border p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <SheetTitle className="text-2xl font-bold text-foreground">{String(title)}</SheetTitle>
              {subtitle && (
                <SheetDescription className="text-muted-foreground">
                  {subtitleLabel || 'ID'}: {String(subtitle)}
                </SheetDescription>
              )}
            </div>
            {viewMoreRoute && (
              <Button
                variant="default"
                size="sm"
                onClick={handleViewMore}
                className="gap-2 shrink-0"
              >
                View More
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="p-6 space-y-8">
          {displayGroups.length > 0 ? (
            displayGroups.map((group, groupIndex) => (
              <section key={groupIndex} className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-border">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">{group.group}</h3>
                </div>
                <div className={`grid gap-4 ${
                  group.layout === 'grid-cols-1 md:grid-cols-3' 
                    ? 'grid-cols-1 md:grid-cols-3'
                    : group.layout === 'grid-cols-1 md:grid-cols-2'
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-2'
                }`}>
                  {group.fields
                    .filter((field) => {
                      // Filter out password fields in view mode
                      if (field.type === 'password') return false;
                      // Filter out conditional fields that don't match
                      if (field.condition) {
                        const conditionValue = getNestedValue(item, field.condition.field) ?? item[field.condition.field];
                        return conditionValue === field.condition.value;
                      }
                      return true;
                    })
                    .map((field) => renderField(field))}
                </div>
              </section>
            ))
          ) : fields.length > 0 ? (
            <section className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-border">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields
                  .filter((field) => {
                    // Filter out password fields in view mode
                    if (field.type === 'password') return false;
                    // Filter out conditional fields that don't match
                    if (field.condition) {
                      const conditionValue = getNestedValue(item, field.condition.field) ?? item[field.condition.field];
                      return conditionValue === field.condition.value;
                    }
                    return true;
                  })
                  .map((field) => renderField(field))}
              </div>
            </section>
          ) : (
            <div className="text-center text-muted-foreground py-10">
              No details available
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

