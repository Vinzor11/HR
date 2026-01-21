import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Trash2, Search, Filter, Sparkles, Info, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string | string[] | null | boolean;
}

interface FilterFieldConfig {
  type: 'text' | 'select' | 'date' | 'boolean';
  label: string;
  options?: string[];
}

interface FilterFieldsConfig {
  [group: string]: {
    [field: string]: FilterFieldConfig;
  };
}

interface AdvancedFilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  filterFieldsConfig: FilterFieldsConfig;
  onApply: (filters?: FilterCondition[]) => void;
  onClear: () => void;
}

const OPERATORS = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'is_null', label: 'Is empty' },
    { value: 'is_not_null', label: 'Is not empty' },
  ],
  select: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'in', label: 'Is one of' },
    { value: 'not_in', label: 'Is not one of' },
  ],
  date: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'After' },
    { value: 'greater_than_or_equal', label: 'On or after' },
    { value: 'less_than', label: 'Before' },
    { value: 'less_than_or_equal', label: 'On or before' },
    { value: 'between', label: 'Between' },
  ],
  boolean: [
    { value: 'equals', label: 'Is' },
  ],
};

export function AdvancedFilterPanel({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  filterFieldsConfig,
  onApply,
  onClear,
}: AdvancedFilterPanelProps) {
  const [fieldSearchTerm, setFieldSearchTerm] = useState('');
  const [showFieldSelector, setShowFieldSelector] = useState<Record<string, boolean>>({});
  // Track which groups are expanded - empty set means all collapsed by default
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Flatten filter fields config for easier access
  const allFields = useMemo(() => {
    const fields: Record<string, FilterFieldConfig & { fullKey: string; group: string }> = {};
    Object.entries(filterFieldsConfig).forEach(([group, groupFields]) => {
      Object.entries(groupFields).forEach(([fieldKey, config]) => {
        fields[fieldKey] = { ...config, fullKey: fieldKey, group };
      });
    });
    return fields;
  }, [filterFieldsConfig]);

  // Group labels
  const groupLabels: Record<string, string> = {
    identification: 'Identification',
    employment: 'Employment',
    address_residential: 'Residential Address',
    address_permanent: 'Permanent Address',
    contact: 'Contact Information',
    personal: 'Personal Details',
    family_background: 'Family Background',
    children: 'Children',
    educational_background: 'Educational Background',
    eligibility: 'Eligibility & Licenses',
    work_experience: 'Work Experience',
    training: 'Training & Development',
    other_information: 'Other Information',
  };

  // Filter fields by search term
  const filteredFieldsConfig = useMemo(() => {
    if (!fieldSearchTerm) return filterFieldsConfig;
    
    const searchLower = fieldSearchTerm.toLowerCase();
    const filtered: FilterFieldsConfig = {};
    
    Object.entries(filterFieldsConfig).forEach(([groupKey, groupFields]) => {
      const matchingFields: Record<string, FilterFieldConfig> = {};
      Object.entries(groupFields).forEach(([fieldKey, config]) => {
        if (
          config.label.toLowerCase().includes(searchLower) ||
          fieldKey.toLowerCase().includes(searchLower) ||
          groupLabels[groupKey]?.toLowerCase().includes(searchLower)
        ) {
          matchingFields[fieldKey] = config;
        }
      });
      if (Object.keys(matchingFields).length > 0) {
        filtered[groupKey] = matchingFields;
      }
    });
    
    return filtered;
  }, [filterFieldsConfig, fieldSearchTerm, groupLabels]);

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: `filter-${Date.now()}-${Math.random()}`,
      field: '',
      operator: 'contains',
      value: null,
    };
    onFiltersChange([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    const filterToRemove = filters.find(f => f.id === id);
    const updated = filters.filter((f) => f.id !== id);
    
    // Update the filters state
    onFiltersChange(updated);
    
    // If the removed filter was a valid, applied filter (has field and value),
    // auto-apply the changes immediately with the updated filters
    if (filterToRemove && filterToRemove.field) {
      // Check if it's a valid filter (has field and either null/not_null operator or has value)
      const isValidFilter = filterToRemove.field && (
        ['is_null', 'is_not_null'].includes(filterToRemove.operator) ||
        (filterToRemove.value !== null && filterToRemove.value !== '' && 
         !(Array.isArray(filterToRemove.value) && filterToRemove.value.length === 0))
      );
      
      if (isValidFilter) {
        // Auto-apply when removing a valid filter, passing the updated filters directly
        setTimeout(() => {
          onApply(updated);
        }, 50); // Small delay to ensure state is updated
      }
    }
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    onFiltersChange(
      filters.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const getFieldConfig = (fieldKey: string) => {
    return allFields[fieldKey];
  };

  const getOperatorsForField = (fieldKey: string) => {
    if (!fieldKey) return OPERATORS.text;
    const config = getFieldConfig(fieldKey);
    if (!config) return OPERATORS.text;
    return OPERATORS[config.type as keyof typeof OPERATORS] || OPERATORS.text;
  };

  const renderFilterValue = (filter: FilterCondition) => {
    const config = getFieldConfig(filter.field);
    if (!config) return null;

    const operators = getOperatorsForField(filter.field);

    // Don't show value input for null/not null operators
    if (['is_null', 'is_not_null'].includes(filter.operator)) {
      return null;
    }

    switch (config.type) {
      case 'select':
        if (['in', 'not_in'].includes(filter.operator)) {
          // Multi-select for "in" and "not_in"
          const selectedValues = Array.isArray(filter.value) ? filter.value : filter.value ? [filter.value] : [];
          return (
            <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-md p-3 bg-muted/30">
              {config.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${filter.id}-${option}`}
                    checked={selectedValues.includes(option)}
                    onCheckedChange={(checked) => {
                      const current = Array.isArray(filter.value) ? filter.value : filter.value ? [filter.value] : [];
                      const updated = checked
                        ? [...current, option]
                        : current.filter((v) => v !== option);
                      updateFilter(filter.id, { value: updated.length > 0 ? updated : null });
                    }}
                  />
                  <Label htmlFor={`${filter.id}-${option}`} className="text-sm font-normal cursor-pointer flex-1">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          );
        }
        return (
          <Select
            value={filter.value as string || ''}
            onValueChange={(value) => updateFilter(filter.id, { value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        if (filter.operator === 'between') {
          const dates = Array.isArray(filter.value) ? filter.value : filter.value ? [filter.value, ''] : ['', ''];
          return (
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={dates[0]}
                  onChange={(e) => {
                    const updated = [e.target.value, dates[1]];
                    updateFilter(filter.id, { value: updated });
                  }}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={dates[1]}
                  onChange={(e) => {
                    const updated = [dates[0], e.target.value];
                    updateFilter(filter.id, { value: updated });
                  }}
                />
              </div>
            </div>
          );
        }
        return (
          <Input
            type="date"
            value={filter.value as string || ''}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            className="w-full"
          />
        );

      case 'boolean':
        const boolValue = filter.value === true || filter.value === 'true' ? 'true' : 'false';
        return (
          <Select
            value={boolValue}
            onValueChange={(value) => updateFilter(filter.id, { value: value === 'true' })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        );

      default: // text
        return (
          <Input
            type="text"
            value={filter.value as string || ''}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            placeholder="Enter value"
            className="w-full"
          />
        );
    }
  };

  const getFilterSummary = (filter: FilterCondition): string => {
    if (!filter.field) return 'Incomplete filter';
    const config = getFieldConfig(filter.field);
    if (!config) return filter.field;
    
    const fieldLabel = config.label;
    const operatorLabel = getOperatorsForField(filter.field).find(op => op.value === filter.operator)?.label || filter.operator;
    
    if (['is_null', 'is_not_null'].includes(filter.operator)) {
      return `${fieldLabel} ${operatorLabel}`;
    }
    
    let valueDisplay = '';
    if (Array.isArray(filter.value)) {
      valueDisplay = filter.value.length > 0 ? filter.value.join(', ') : '';
    } else if (filter.value !== null && filter.value !== '') {
      valueDisplay = String(filter.value);
    }
    
    return valueDisplay ? `${fieldLabel} ${operatorLabel} "${valueDisplay}"` : `${fieldLabel} ${operatorLabel}`;
  };

  const validFilters = filters.filter(f => f.field && (['is_null', 'is_not_null'].includes(f.operator) || f.value !== null && f.value !== ''));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden p-0 flex flex-col">
        <SheetHeader className="border-b border-border px-6 py-5 bg-gradient-to-b from-background to-muted/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Filter className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-2xl font-bold text-foreground">Advanced Filters</SheetTitle>
              <SheetDescription className="mt-1.5 text-sm">
                Filter employees by any field across all related data tables. Filters are combined with AND logic.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Info Banner */}
            {filters.length === 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground">Get Started</p>
                  <p className="text-xs text-muted-foreground">
                    Add filters to narrow down your employee search. You can filter by any field including address, 
                    education, eligibility, training, and more—even if those fields aren't visible in the table.
                  </p>
                </div>
              </div>
            )}

            {/* Active Filters */}
            {filters.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground">Active Filters</h3>
                  </div>
                  {filters.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Clear filters in component state immediately
                        onFiltersChange([]);
                        // Then call parent's clear handler to trigger fetch
                        onClear();
                      }}
                      className="h-7 text-xs"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {filters.map((filter, index) => {
                    const config = getFieldConfig(filter.field);
                    const operators = getOperatorsForField(filter.field);
                    const isValid = filter.field && (['is_null', 'is_not_null'].includes(filter.operator) || filter.value !== null && filter.value !== '');

                    return (
                      <div
                        key={filter.id}
                        className={`group relative p-5 border rounded-xl transition-all duration-200 ${
                          isValid
                            ? 'border-border bg-card shadow-sm hover:shadow-md'
                            : 'border-dashed border-muted-foreground/30 bg-muted/20'
                        }`}
                      >
                        {/* Filter Number Badge */}
                        <div className="absolute -top-2.5 -left-2.5">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                            isValid
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-4">
                            {/* Field Selection */}
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <span>Field</span>
                                {!filter.field && (
                                  <span className="text-destructive text-[10px]">(Required)</span>
                                )}
                              </Label>
                              
                              {/* Selected Field Display */}
                              {filter.field && (
                                <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-foreground">
                                        {getFieldConfig(filter.field)?.label || filter.field}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                        {getFieldConfig(filter.field)?.type || 'text'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setShowFieldSelector(prev => ({ ...prev, [filter.id]: !prev[filter.id] }));
                                    }}
                                    className="h-7 text-xs"
                                  >
                                    Change
                                  </Button>
                                </div>
                              )}

                              {/* Field Selector */}
                              {(!filter.field || showFieldSelector[filter.id]) && (
                                <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
                                  {/* Search */}
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      type="text"
                                      placeholder="Search fields by name or category..."
                                      value={fieldSearchTerm}
                                      onChange={(e) => setFieldSearchTerm(e.target.value)}
                                      className="pl-9 h-9 text-sm"
                                      autoFocus
                                    />
                                  </div>

                                  {/* Field Groups - Collapsible */}
                                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {Object.entries(filteredFieldsConfig).map(([groupKey, groupFields]) => {
                                      const fieldCount = Object.keys(groupFields).length;
                                      const isExpanded = expandedGroups.has(groupKey);
                                      
                                      return (
                                        <div key={groupKey} className="border border-border rounded-lg overflow-hidden bg-background">
                                          {/* Group Header - Clickable */}
                                          <button
                                            type="button"
                                            onClick={() => toggleGroup(groupKey)}
                                            className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                                          >
                                            <div className="flex items-center gap-2">
                                              {isExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                              ) : (
                                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                              )}
                                              <span className="text-sm font-semibold text-foreground">
                                                {groupLabels[groupKey] || groupKey}
                                              </span>
                                            </div>
                                          </button>

                                          {/* Group Fields - Conditionally visible */}
                                          {isExpanded && (
                                            <div className="border-t border-border p-2 space-y-1.5">
                                            {Object.entries(groupFields).map(([fieldKey, fieldConfig]) => {
                                              const isSelected = filter.field === fieldKey;
                                              return (
                                                <button
                                                  key={fieldKey}
                                                  type="button"
                                                  onClick={() => {
                                                    const newConfig = getFieldConfig(fieldKey);
                                                    const operatorList = newConfig ? OPERATORS[newConfig.type as keyof typeof OPERATORS] : OPERATORS.text;
                                                    const defaultOperator = operatorList?.[0]?.value || 'contains';
                                                    updateFilter(filter.id, {
                                                      field: fieldKey,
                                                      operator: defaultOperator,
                                                      value: null,
                                                    });
                                                    setFieldSearchTerm('');
                                                    setShowFieldSelector(prev => ({ ...prev, [filter.id]: false }));
                                                  }}
                                                  className={`w-full flex items-center justify-between p-2.5 rounded-md text-left transition-all ${
                                                    isSelected
                                                      ? 'bg-primary/10 border border-primary/30 text-primary'
                                                      : 'hover:bg-muted/50 border border-transparent'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className={`text-sm ${isSelected ? 'font-medium' : 'font-normal'}`}>
                                                      {fieldConfig.label}
                                                    </span>
                                                  </div>
                                                  {isSelected && (
                                                    <Check className="h-4 w-4 text-primary shrink-0" />
                                                  )}
                                                </button>
                                              );
                                            })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {filter.field && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setShowFieldSelector(prev => ({ ...prev, [filter.id]: false }));
                                      }}
                                      className="w-full h-8 text-xs"
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Operator Selection */}
                            {filter.field && (
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-foreground">Condition</Label>
                                <Select
                                  value={filter.operator}
                                  onValueChange={(value) =>
                                    updateFilter(filter.id, {
                                      operator: value,
                                      value: ['is_null', 'is_not_null'].includes(value) ? null : filter.value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-full h-10">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {operators.map((op) => (
                                      <SelectItem key={op.value} value={op.value}>
                                        {op.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Value Input */}
                            {filter.field && !['is_null', 'is_not_null'].includes(filter.operator) && (
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                  <span>Value</span>
                                  {!filter.value && (
                                    <span className="text-destructive text-[10px]">(Required)</span>
                                  )}
                                </Label>
                                {renderFilterValue(filter)}
                              </div>
                            )}

                            {/* Filter Summary */}
                            {isValid && (
                              <div className="pt-2 border-t border-border">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Sparkles className="h-3 w-3" />
                                  <span className="font-medium">{getFilterSummary(filter)}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeFilter(filter.id)}
                            title="Remove filter"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add Filter Button */}
            <Button
              variant="outline"
              onClick={addFilter}
              className="w-full h-11 border-dashed hover:border-solid hover:bg-muted/50 transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>

            {/* Empty State */}
            {filters.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <div className="inline-flex p-4 rounded-full bg-muted/50">
                  <Filter className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">No filters applied</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Click "Add Filter" above to start filtering employees by any field across all related data tables.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="border-t border-border p-4 bg-muted/30 backdrop-blur-sm">
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>{validFilters.length} of {filters.length} filters ready</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="min-w-[80px]">
                Cancel
              </Button>
              <Button 
                onClick={() => onApply()} 
                disabled={validFilters.length === 0}
                className="min-w-[120px]"
              >
                Apply {validFilters.length > 0 && `(${validFilters.length})`}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
