import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { hasPermission } from '@/utils/authorization';
import { usePage } from '@inertiajs/react';
import InputError from './input-error';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useState } from 'react';

// Interfaces
interface AddButtonProps {
  id: string;
  label: string;
  className: string;
  icon: React.ElementType | string;
  type: 'button' | 'submit' | 'reset' | undefined;
  variant: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | undefined;
  permission?: string;
}

interface FieldProps {
  id: string;
  key: string;
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  autocomplete?: string;
  tabIndex: number;
  autoFocus?: boolean;
  rows?: number;
  accept?: string;
  className?: string;
  options?: { label: string; value: string; key: string }[];
  min?: number;
  max?: number;
  step?: number;
  condition?: {
    field: string;
    value: any;
  };
  description?: string | ((data: Record<string, any>) => string);
}

interface FieldGroup {
  group: string;
  layout?: string;
  fields: FieldProps[];
}

interface ButtonProps {
  key: string;
  type: 'button' | 'submit' | 'reset' | undefined;
  label: string;
  variant: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | undefined;
  className: string;
}

interface Permissions {
  id: number;
  label: string;
  name: string;
  module: string;
  description: string;
}

interface FieldOptions {
  key: string;
  label: string;
  value: string;
}

interface ExtraData {
  [module: string]: Permissions[];
}

interface CustomModalFormProps {
  addButton: AddButtonProps;
  title: string;
  description: string;
  fields?: FieldProps[];
  groups?: FieldGroup[];
  buttons: ButtonProps[];
  data: Record<string, any>;
  setData: (name: string, value: any) => void;
  errors: Record<string, string>;
  processing: boolean;
  handleSubmit: (data: any) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'view' | 'edit';
  previewImage?: string | null;
  extraData?: ExtraData;
  addButtonWrapperClassName?: string;
}

export const CustomModalForm = ({
  addButton,
  title,
  description,
  fields = [],
  groups = [],
  buttons,
  data,
  setData,
  errors,
  processing,
  handleSubmit,
  open,
  onOpenChange,
  mode = 'create',
  previewImage,
  extraData,
  addButtonWrapperClassName = 'w-full flex justify-end mb-1',
}: CustomModalFormProps) => {
  const { auth } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const IconComponent =
    typeof addButton.icon === 'string' ? null : addButton.icon;

  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  // Helper function to determine resource type from permission name
  const getResourceTypeFromName = (name: string): string => {
    if (name.includes('faculty')) {
      return 'faculty';
    }
    if (name.includes('department')) {
      return 'department';
    }
    if (name.includes('office')) {
      return 'office';
    }
    if (name.includes('position')) {
      return 'position';
    }
    if (name.includes('organizational-log')) {
      return 'log';
    }
    return 'other';
  };


  const renderField = (field: FieldProps) => {
    if (field.type === 'password' && mode !== 'create') return null;
    
    // Handle conditional rendering via visible property
    if ((field as any).visible === false) {
      return null;
    }
    
    // Handle conditional rendering via condition property
    if (field.condition) {
      const conditionValue = data?.[field.condition.field];
      if (conditionValue !== field.condition.value) {
        return null;
      }
    }
    
    const value = data?.[field.name] ?? '';

    const isRequired = (field as any).required === true;
    
    return (
      <div key={field.key} className="grid gap-2">
        <Label htmlFor={field.id}>
          {field.label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {field.type === 'textarea' ? (
          <textarea
            id={field.id}
            name={field.name}
            placeholder={field.placeholder}
            rows={field.rows}
            autoComplete={field.autocomplete}
            tabIndex={field.tabIndex}
            className={field.className}
            onChange={(e) => setData(field.name, e.target.value)}
            value={value}
            disabled={processing || mode === 'view'}
          />
        ) : field.type === 'file' ? (
          <div className="space-y-2">
            {mode !== 'create' && previewImage && (
              <img
                src={previewImage}
                alt={data?.[field.key]}
                className="h-32 w-32 rounded object-cover"
              />
            )}
            {mode !== 'view' && (
              <Input
                id={field.id}
                name={field.name}
                type="file"
                accept={field.accept}
                tabIndex={field.tabIndex}
                onChange={(e) =>
                  setData(field.name, e.target.files ? e.target.files[0] : null)
                }
                disabled={processing}
              />
            )}
          </div>
        ) : field.type === 'single-select' ? (
          <Select
            disabled={processing || mode === 'view'}
            value={value}
            onValueChange={(val) => setData(field.name, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options?.length && Array.isArray(field.options)
                ? field.options
                : Array.isArray(extraData?.[field.key])
                ? extraData?.[field.key].map((item: any) => ({
                    key: item.id,
                    value: item.name,
                    label: item.label,
                  }))
                : []
              ).map((option: FieldOptions) => (
                <SelectItem key={option.key} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === 'grouped-checkboxes' ? (
          <div className="space-y-2">
            {extraData &&
              Object.entries(extraData).map(([module, perms]) => {
                // Special handling for Organizational Structure module
                if (module === 'Organizational Structure' && Array.isArray(perms)) {
                  let previousResourceType: string | null = null;
                  return (
                    <div key={module} className="mb-4 border-b pb-5">
                      <h4 className="text-sm font-bold text-gray-700 capitalize">
                        {module}
                      </h4>
                      <div className="ms-4 mt-2 space-y-2">
                        {perms.map((perm: any, index: number) => {
                          const resourceType = perm._resource_type || getResourceTypeFromName(perm.name);
                          const showSeparator = previousResourceType !== null && 
                                               previousResourceType !== resourceType && 
                                               resourceType !== 'other' &&
                                               previousResourceType !== 'other';
                          
                          // Update previous resource type for next iteration
                          if (resourceType !== 'other') {
                            previousResourceType = resourceType;
                          }
                          
                          return (
                            <div key={perm.id || index}>
                              {showSeparator && (
                                <div className="my-4 border-t border-gray-300"></div>
                              )}
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  name={field.name}
                                  disabled={processing || mode === 'view'}
                                  value={perm.name}
                                  checked={(data.permissions || []).includes(perm.name)}
                                  onChange={(e) => {
                                    const current = data.permissions || [];
                                    const updated = e.target.checked
                                      ? [...current, perm.name]
                                      : current.filter((p: string) => p !== perm.name);
                                    setData('permissions', updated);
                                  }}
                                />
                                <span>{perm.label}</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                
                // Default rendering for other modules
                return (
                  <div key={module} className="mb-4 border-b pb-5">
                    <h4 className="text-sm font-bold text-gray-700 capitalize">
                      {module}
                    </h4>
                    <div className="ms-4 mt-2 grid grid-cols-5 gap-2">
                      {Array.isArray(perms) &&
                        perms.map((perm: any) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              name={field.name}
                              disabled={processing || mode === 'view'}
                              value={perm.name}
                              checked={(data.permissions || []).includes(perm.name)}
                              onChange={(e) => {
                                const current = data.permissions || [];
                                const updated = e.target.checked
                                  ? [...current, perm.name]
                                  : current.filter((p: string) => p !== perm.name);
                                setData('permissions', updated);
                              }}
                            />
                            <span>{perm.label}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : field.type === 'checkbox-group' ? (
          <div className="space-y-2">
            {(() => {
              const options = field.options?.length && Array.isArray(field.options)
                ? field.options
                : Array.isArray(extraData?.[field.key])
                ? extraData?.[field.key].map((item: any) => ({
                    key: item.key ?? item.id,
                    value: item.value ?? item.id,
                    label: item.label ?? item.name,
                  }))
                : [];

              // Special handling for departments in training form
              if (field.key === 'departments' && options.length === 0) {
                if (data.organization_type === 'academic' && (!data.faculty_ids || data.faculty_ids.length === 0)) {
                  return (
                    <p className="text-sm text-muted-foreground italic">
                      Please select at least one faculty first to view available departments.
                    </p>
                  );
                }
                if (data.organization_type === 'administrative') {
                  return (
                    <p className="text-sm text-muted-foreground italic">
                      No offices available. Add offices under Org Structure → Departments.
                    </p>
                  );
                }
                return (
                  <p className="text-sm text-muted-foreground italic">
                    No departments available for the selected faculty.
                  </p>
                );
              }

              // Special handling for positions in training form
              if (field.key === 'positions' && options.length === 0) {
                if (data.organization_type === 'academic') {
                  if (!data.faculty_ids || data.faculty_ids.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground italic">
                        Please select at least one faculty first to view available positions.
                      </p>
                    );
                  }
                  if (!data.department_ids || data.department_ids.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground italic">
                        No faculty-level positions available for the selected faculties. Select departments to view department-specific positions.
                      </p>
                    );
                  }
                  return (
                    <p className="text-sm text-muted-foreground italic">
                      No positions available for the selected departments and faculties.
                    </p>
                  );
                } else if (data.organization_type === 'administrative') {
                  if (!data.department_ids || data.department_ids.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground italic">
                        Please select at least one office to view available positions.
                      </p>
                    );
                  }
                  return (
                    <p className="text-sm text-muted-foreground italic">
                      No positions available for the selected offices.
                    </p>
                  );
                }
              }

              if (options.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground italic">
                    No options available.
                  </p>
                );
              }

              return options.map((option) => (
                <label
                  key={option.key}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name={field.name}
                    value={option.value}
                    checked={(value || []).includes(option.value)}
                    disabled={processing || mode === 'view'}
                    onChange={(e) => {
                      const current = value || [];
                      const updated = e.target.checked
                        ? [...current, option.value]
                        : current.filter((v: string) => v !== option.value);
                      setData(field.name, updated);
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ));
            })()}
          </div>
        ) : field.type === 'checkbox' ? (
          <input
            id={field.id}
            name={field.name}
            type="checkbox"
            tabIndex={field.tabIndex}
            checked={Boolean(data?.[field.name])}
            disabled={processing || mode === 'view'}
            onChange={(e) => setData(field.name, e.target.checked)}
            className="h-4 w-4"
          />
        ) : (
          <Input
            id={field.id}
            name={field.name}
            type={field.type}
            placeholder={field.placeholder}
            autoComplete={field.autocomplete}
            tabIndex={field.tabIndex}
            autoFocus={field.autoFocus}
            onChange={(e) => setData(field.name, e.target.value)}
            value={value}
            disabled={processing || mode === 'view'}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        )}
        {field.description && (
          <p className="text-xs text-muted-foreground mt-1">
            {typeof field.description === 'function' ? field.description(data) : field.description}
          </p>
        )}
        <InputError message={errors?.[field.name]} />
      </div>
    );
  };

  const handlePrevGroup = () => {
    if (currentGroupIndex > 0) setCurrentGroupIndex(currentGroupIndex - 1);
  };
  const handleNextGroup = () => {
    if (groups && currentGroupIndex < groups.length - 1)
      setCurrentGroupIndex(currentGroupIndex + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
{(!addButton.permission || hasPermission(permissions, addButton.permission)) && (
  <div className={addButtonWrapperClassName}>
    <DialogTrigger asChild>
      <Button
        type={addButton.type}
        id={addButton.id}
        variant={addButton.variant}
        className={addButton.className}
      >
        {IconComponent && <IconComponent className="me-2" />}
        {addButton.label}
      </Button>
    </DialogTrigger>
  </div>
)}


      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-[830px] max-h-[90vh] overflow-hidden"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-6">
          <div className="flex-1 overflow-y-auto pr-1">
            {Array.isArray(groups) && groups.length > 0 ? (
              <div className="border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {groups[currentGroupIndex].group}
                </h3>
                <div
                  className={`grid gap-4 ${
                    groups[currentGroupIndex].group === 'Employee'
                      ? 'grid-cols-1 md:grid-cols-3'
                      : groups[currentGroupIndex].layout || 'grid-cols-1'
                  }`}
                >
                  {groups[currentGroupIndex].fields.map((field) => renderField(field))}
                </div>
                <div className="flex justify-between mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevGroup}
                    disabled={currentGroupIndex === 0}
                  >
                    ← Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNextGroup}
                    disabled={currentGroupIndex === groups.length - 1}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            ) : Array.isArray(fields) && fields.length > 0 ? (
              <div className="grid gap-4">
                {fields.map((field) => renderField(field))}
              </div>
            ) : (
              <div className="text-sm text-center text-muted-foreground py-10">
                ⚠️ No fields configured. Check if you're passing the{' '}
                <code>fields</code> or <code>groups</code> prop correctly.
              </div>
            )}
          </div>

          <div className="shrink-0 border-t pt-4">
            <DialogFooter className="flex flex-wrap justify-end gap-2">
              {buttons.map((button) =>
                button.key === 'cancel' ? (
                  <DialogClose asChild key={button.key}>
                    <Button
                      type={button.type}
                      variant={button.variant}
                      className={button.className}
                    >
                      {button.label}
                    </Button>
                  </DialogClose>
                ) : mode !== 'view' ? (
                  <Button
                    key={button.key}
                    type={button.type}
                    variant={button.variant}
                    className={button.className}
                    disabled={processing}
                  >
                    {button.label}
                  </Button>
                ) : null
              )}
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
