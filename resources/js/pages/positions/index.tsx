import { CustomModalForm } from '@/components/custom-modal-form'
import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable'
import { CustomToast, toast } from '@/components/custom-toast'
import { TableToolbar } from '@/components/table-toolbar'
import { PositionModalFormConfig, POSITION_CATEGORY_OPTIONS, POSITION_CATEGORY_DESCRIPTIONS } from '@/config/forms/position-modal-form'
import { PositionTableConfig } from '@/config/tables/position-table'
import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { route } from 'ziggy-js'
import { hasPermission } from '@/utils/authorization'
import { useEffect, useRef, useState, useMemo } from 'react'
import { ArrowUpDown, ChevronLeft, ChevronRight, Archive, ArchiveRestore } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DetailDrawer } from '@/components/DetailDrawer'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Manage Positions', href: '/positions' },
]

interface Position {
  id: number
  pos_code: string
  pos_name: string
  description?: string
  position_category?: string | null
  faculty_id?: number | null
  faculty?: {
    id: number
    name: string
    code: string
  } | null
  department_id?: number | null
  department?: {
    id: number
    name: string
    code: string
  } | null
  position_type?: string | null
  hierarchy_level?: number | null
  capacity?: number | null
  creation_type?: 'manual' | 'auto' | null
}

interface DepartmentOption {
  id: number
  name: string
  code: string
  type?: string
  faculty_id?: number | null
}

interface Pagination<T> {
  data: T[]
  links: any[]
  from: number
  to: number
  total: number
  meta?: {
    current_page: number
    from: number
    to: number
    total: number
    last_page: number
    per_page: number
    path: string
  }
}

interface FlashProps {
  flash?: {
    success?: string
    error?: string
  }
}

interface FilterProps {
  search: string
  perPage: string
  department_id?: string
  position_category?: string
  show_deleted?: boolean
}

interface FacultyOption {
  id: number
  name: string
  code: string
}

interface IndexProps {
  positions: Pagination<Position>
  departments: DepartmentOption[]
  faculties: FacultyOption[]
  filters?: FilterProps
}

const DEFAULT_HIERARCHY_LEVEL = '1'

export default function PositionIndex({ positions, departments, faculties, filters }: IndexProps) {
  const { flash, auth } = usePage<FlashProps & { auth?: { permissions?: string[] } }>().props
  const permissions = auth?.permissions || []
  const flashMessage = flash?.success || flash?.error
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create')
  const [selectedItem, setSelectedItem] = useState<Position | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedPositionForView, setSelectedPositionForView] = useState<Position | null>(null)
  const [sortKey, setSortKey] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('positions_sortKey')
      if (saved && ['name-asc', 'name-desc', 'date-asc', 'date-desc'].includes(saved)) {
        return saved as typeof sortKey
      }
    }
    return 'name-asc'
  })
  const [searchTerm, setSearchTerm] = useState(filters?.search ?? '')
  const [perPage, setPerPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('positions_perPage')
      if (saved && ['5', '10', '25', '50', '100'].includes(saved)) {
        return saved
      }
    }
    return String(filters?.perPage ?? 10)
  })
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const hasSyncedRef = useRef(false)
  const [departmentFilter, setDepartmentFilter] = useState(filters?.department_id ? String(filters?.department_id) : '')
  const [categoryFilter, setCategoryFilter] = useState(filters?.position_category ?? '')
  const [showDeleted, setShowDeleted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('positions_filter_show_deleted')
      if (saved === 'true') return true
      if (saved === 'false') return false
    }
    return filters?.show_deleted || false
  })

  const { data, setData, errors, processing, reset, post, transform } = useForm({
    pos_code: '',
    pos_name: '',
    position_category: '',
    faculty_id: '',
    department_id: '',
    hierarchy_level: DEFAULT_HIERARCHY_LEVEL,
    capacity: '',
    description: '',
    _method: 'POST',
  })

  const facultyOptions = faculties.map((faculty) => ({
    key: String(faculty.id),
    value: String(faculty.id),
    label: `${faculty.code} - ${faculty.name}`,
  }))

  // Flash messages
  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.error) toast.error(flash.error);
  }, [flash]);

  // Get position category to determine field visibility
  const positionCategory = data.position_category

  // Determine which fields should be visible/required based on category
  const getFieldVisibility = (fieldName: string) => {
    if (!positionCategory) return { visible: true, required: false }

    switch (positionCategory) {
      case 'executive':
      case 'administrative_non_teaching':
      case 'support_utility':
      case 'specialized_compliance':
        // Office only (administrative departments)
        if (fieldName === 'faculty_id') return { visible: false, required: false }
        if (fieldName === 'department_id') return { visible: true, required: true }
        return { visible: true, required: false }

      case 'academic_teaching':
        // Faculty + Department required
        if (fieldName === 'faculty_id') return { visible: true, required: true }
        if (fieldName === 'department_id') return { visible: true, required: true }
        return { visible: true, required: false }

      case 'academic_support':
        // Can be Faculty+Department OR Faculty only OR Office only
        if (fieldName === 'faculty_id') return { visible: true, required: false }
        if (fieldName === 'department_id') return { visible: true, required: false }
        return { visible: true, required: false }

      case 'technical_skilled':
        // Can be Faculty+Department OR Office only
        if (fieldName === 'faculty_id') return { visible: true, required: false }
        if (fieldName === 'department_id') return { visible: true, required: false }
        return { visible: true, required: false }

      default:
        return { visible: true, required: false }
    }
  }

  // Filter departments based on category
  const getFilteredDepartmentOptions = () => {
    if (!positionCategory) return departmentOptions

    switch (positionCategory) {
      case 'executive':
      case 'administrative_non_teaching':
      case 'support_utility':
      case 'specialized_compliance':
        // Show only administrative departments (offices)
        return departments
          .filter((dept) => dept.type === 'administrative')
          .map((dept) => ({
            key: String(dept.id),
            value: String(dept.id),
            label: `${dept.name} (${dept.code})`,
          }))

      case 'academic_teaching':
      case 'technical_skilled':
        // Show academic departments, optionally filtered by faculty
        let filtered = departments.filter((dept) => dept.type === 'academic')
        
        // If faculty is selected, filter by faculty
        if (data.faculty_id) {
          filtered = filtered.filter((dept) => dept.faculty_id === Number(data.faculty_id))
        }
        
        return filtered.map((dept) => ({
          key: String(dept.id),
          value: String(dept.id),
          label: `${dept.name} (${dept.code})`,
        }))

      case 'academic_support':
        // Show both academic departments (if faculty selected) and administrative departments (offices)
        const academicDepts = data.faculty_id
          ? departments.filter((dept) => dept.type === 'academic' && dept.faculty_id === Number(data.faculty_id))
          : departments.filter((dept) => dept.type === 'academic')
        const adminDepts = departments.filter((dept) => dept.type === 'administrative')
        
        return [...academicDepts, ...adminDepts].map((dept) => ({
          key: String(dept.id),
          value: String(dept.id),
          label: `${dept.name} (${dept.code})${dept.type === 'administrative' ? ' (Office)' : ''}`,
        }))

      default:
        return departmentOptions
    }
  }

  const departmentOptions = departments.map((dept) => ({
    key: String(dept.id),
    value: String(dept.id),
    label: `${dept.name} (${dept.code})`,
  }))

  const filteredDepartmentOptions = getFilteredDepartmentOptions()

  // Clear fields when category changes
  useEffect(() => {
    if (positionCategory) {
      const category = positionCategory
      
      // Clear fields that should be hidden based on category
      if (['executive', 'administrative_non_teaching', 'support_utility', 'specialized_compliance'].includes(category)) {
        // Office only - clear faculty
        if (data.faculty_id) {
          setData('faculty_id', '')
        }
      }
    }
  }, [positionCategory])

  // Clear faculty when Office (administrative department) is selected for Academic Support or Technical/Skilled
  useEffect(() => {
    if (positionCategory && ['academic_support', 'technical_skilled'].includes(positionCategory) && data.department_id) {
      const selectedDept = departments.find((d) => String(d.id) === String(data.department_id))
      if (selectedDept && selectedDept.type === 'administrative' && data.faculty_id) {
        // Office selected - clear faculty
        setData('faculty_id', '')
      } else if (selectedDept && selectedDept.type === 'academic' && !data.faculty_id) {
        // Academic department selected but no faculty - this will be validated on submit
      }
    }
  }, [data.department_id, positionCategory])

  const modalFields = useMemo(() => {
    return PositionModalFormConfig.fields.map((field) => {
    const visibility = getFieldVisibility(field.name)
    
    if (field.name === 'position_category') {
      return {
        ...field,
        visible: visibility.visible,
        required: visibility.required,
        description: positionCategory && POSITION_CATEGORY_DESCRIPTIONS[positionCategory]
          ? POSITION_CATEGORY_DESCRIPTIONS[positionCategory]
          : undefined,
      }
    }
    if (field.name === 'faculty_id') {
      return {
        ...field,
        options: facultyOptions,
        visible: visibility.visible,
        required: visibility.required,
      }
    }
    if (field.name === 'department_id') {
      return {
        ...field,
        options: filteredDepartmentOptions,
        visible: visibility.visible,
        required: visibility.required,
        label: positionCategory && ['executive', 'administrative_non_teaching', 'support_utility', 'specialized_compliance'].includes(positionCategory)
          ? 'Office'
          : 'Department / Office',
      }
    }
    return {
      ...field,
      visible: visibility.visible,
      required: visibility.required,
    }
  }).filter((field) => field.visible !== false)
  }, [positionCategory, data.faculty_id, filteredDepartmentOptions])

  const closeModal = () => {
    setMode('create')
    setSelectedItem(null)
    reset()
    setModalOpen(false)
  }

  const handleModalToggle = (open: boolean) => {
    setModalOpen(open)
    if (!open) closeModal()
  }

const handleDepartmentFilterChange = (value: string) => {
  const normalized = value === 'all' ? '' : value
  setDepartmentFilter(normalized)
  triggerFetch({ department_id: normalized, page: 1 })
}

const handleCategoryFilterChange = (value: string) => {
  const normalized = value === 'all' ? '' : value
  setCategoryFilter(normalized)
  triggerFetch({ position_category: normalized, page: 1 })
}

  const refreshTable = () => {
    triggerFetch()
  }

  // Handle view position
  const handleViewPosition = (row: any) => {
    setSelectedPositionForView(row)
    setDrawerOpen(true)
  }

  const openModal = (mode: 'create' | 'view' | 'edit', item?: Position) => {
    // If view mode, use drawer instead
    if (mode === 'view') {
      handleViewPosition(item)
      return
    }

    setMode(mode)
    if (item) {
      setSelectedItem(item)
      setData({
        pos_code: item.pos_code,
        pos_name: item.pos_name,
        position_category: (item as any).position_category || '',
        faculty_id: item.faculty_id ? String(item.faculty_id) : '',
        department_id: item.department_id ? String(item.department_id) : '',
        hierarchy_level:
          item.hierarchy_level !== undefined && item.hierarchy_level !== null
            ? String(item.hierarchy_level)
            : DEFAULT_HIERARCHY_LEVEL,
        capacity: item.capacity !== undefined && item.capacity !== null
          ? String(item.capacity)
          : '',
        description: item.description || '',
        _method: 'PUT',
      })
    } else {
      reset()
    }
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const isEditMode = mode === 'edit' && selectedItem
    data._method = isEditMode ? 'PUT' : 'POST'

    transform((formData) => ({
      ...formData,
      faculty_id: formData.faculty_id ? Number(formData.faculty_id) : null,
      department_id: formData.department_id ? Number(formData.department_id) : null,
      hierarchy_level: formData.hierarchy_level ? Number(formData.hierarchy_level) : null,
      capacity: formData.capacity ? Number(formData.capacity) : null,
    }))

    const routePath = isEditMode
      ? route('positions.update', { position: selectedItem!.id })
      : route('positions.store')

    post(
      routePath,
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: (response: { props: FlashProps }) => {
          const successMessage = response.props.flash?.success
          if (successMessage) {
            toast.success(successMessage)
          }
          closeModal()
          refreshTable()
        },
        onError: (error: Record<string, string | string[]>) => {
          if (typeof error?.message === 'string') {
            toast.error(error.message)
          }
        },
      }
    )
  }
  
  const handleRestore = (id: string | number) => {
    router.post(route('positions.restore', id), {}, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Position restored successfully')
        triggerFetch({})
      },
      onError: () => toast.error('Failed to restore position'),
    })
  }

  const handleForceDelete = (id: string | number) => {
    router.delete(route('positions.force-delete', id), {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Position permanently deleted')
        triggerFetch({})
      },
      onError: () => toast.error('Failed to permanently delete position'),
    })
  }

  const handleDelete = (routeStr: string) => {
    router.delete(routeStr, {
      preserveScroll: true,
      onSuccess: () => {
        closeModal()
        refreshTable()
      },
      onError: (error: Record<string, string | string[]>) => {
        if (typeof error?.message === 'string') {
          toast.error(error.message)
        }
        closeModal()
      },
    })
  }

  // No client-side sorting - backend handles it
  const tableData = positions.data.map((pos) => {
    return {
      ...pos,
      faculty: pos.faculty || null,
      department: pos.department || null,
    }
  })

  // Convert sortKey to sort_by and sort_order
  const getSortParams = (key: typeof sortKey) => {
    const [field, order] = key.split('-')
    const sortByMap: Record<string, string> = {
      'name': 'pos_name',
      'date': 'created_at',
    }
    return {
      sort_by: sortByMap[field] || 'created_at',
      sort_order: order || 'asc',
    }
  }

  const triggerFetch = (params: Record<string, any> = {}) => {
    const sortParams = getSortParams(sortKey)
    router.get(route('positions.index'), {
      search: searchTerm,
      perPage,
      department_id: departmentFilter,
      position_category: categoryFilter,
      show_deleted: params.show_deleted !== undefined ? params.show_deleted : showDeleted,
      sort_by: params.sort_by !== undefined ? params.sort_by : sortParams.sort_by,
      sort_order: params.sort_order !== undefined ? params.sort_order : sortParams.sort_order,
      ...params,
    }, {
      preserveState: true,
      replace: true,
      preserveScroll: false,
      onStart: () => setIsSearching(true),
      onFinish: () => setIsSearching(false),
    })
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    searchTimeout.current = setTimeout(() => {
      triggerFetch({ search: value })
    }, 300)
  }

  const handlePerPageChange = (value: string) => {
    setPerPage(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem('positions_perPage', value)
    }
    triggerFetch({ perPage: value })
  }

  const handleSortKeyChange = (value: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc') => {
    setSortKey(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem('positions_sortKey', value)
    }
    const sortParams = getSortParams(value)
    triggerFetch({ sort_by: sortParams.sort_by, sort_order: sortParams.sort_order, page: 1 })
  }

  // Pagination data - use root level properties (Laravel paginator structure)
  const from = positions?.from ?? 0
  const to = positions?.to ?? 0
  const total = positions?.total ?? 0
  const currentPage = positions?.meta?.current_page || (from > 0 ? Math.floor((from - 1) / (parseInt(perPage) || 10)) + 1 : 1)
  const lastPage = positions?.meta?.last_page || (total > 0 ? Math.ceil(total / (parseInt(perPage) || 10)) : 1)

  const handlePageChange = (page: number) => {
    // Ensure page is a valid positive number
    const validPage = Math.max(1, Math.min(page, lastPage || 1))
    triggerFetch({ page: validPage })
  }

  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
    }
  }, [])

  // Sync localStorage values with backend on mount
  useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    
    const savedPerPage = typeof window !== 'undefined' ? localStorage.getItem('positions_perPage') : null;
    const currentPerPage = String(filters?.perPage ?? 10);
    
    // If localStorage has a different perPage than what backend sent, sync it
    if (savedPerPage && savedPerPage !== currentPerPage && ['5', '10', '25', '50', '100'].includes(savedPerPage)) {
      triggerFetch({ search: searchTerm, perPage: savedPerPage });
    }
  }, []); // Only run on mount

  // Disable page scrolling
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    
    const originalHtmlOverflow = html.style.overflow
    const originalBodyOverflow = body.style.overflow
    
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    
    return () => {
      html.style.overflow = originalHtmlOverflow
      body.style.overflow = originalBodyOverflow
    }
  }, [])

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Positions" />
      <CustomToast />

      <div className="flex flex-col overflow-hidden bg-background rounded-xl" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="flex-shrink-0 border-b border-border bg-card px-4 py-2 shadow-sm">
          <TableToolbar
            searchValue={searchTerm}
            onSearchChange={handleSearchChange}
            perPage={perPage}
            onPerPageChange={handlePerPageChange}
            isSearching={isSearching}
            actionSlot={
              <div className="flex flex-row flex-wrap items-center gap-2">
                {/* Sort by icon button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      <span className="hidden sm:inline">Sort</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleSortKeyChange('name-asc')}>
                      A → Z
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSortKeyChange('name-desc')}>
                      Z → A
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSortKeyChange('date-asc')}>
                      Oldest First
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSortKeyChange('date-desc')}>
                      Newest First
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Rows selector */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Select value={perPage} onValueChange={handlePerPageChange}>
                    <SelectTrigger className="h-9 w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['5', '10', '25', '50', '100'].map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department filter */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Select value={departmentFilter || 'all'} onValueChange={handleDepartmentFilterChange}>
                    <SelectTrigger className="h-9 w-[180px]">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.name || dept.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Position Category filter */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Select value={categoryFilter || 'all'} onValueChange={handleCategoryFilterChange}>
                    <SelectTrigger className="h-9 w-[200px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {POSITION_CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Show Deleted Positions Toggle - Only show if user has restore or force delete permission */}
                {(hasPermission(permissions, 'restore-position') || hasPermission(permissions, 'force-delete-position')) && (
                  <Button
                    variant={showDeleted ? "default" : "outline"}
                    size="sm"
                    className="gap-2 h-9"
                    onClick={() => {
                      const newValue = !showDeleted
                      setShowDeleted(newValue)
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('positions_filter_show_deleted', String(newValue))
                      }
                      triggerFetch({ show_deleted: newValue, page: 1, perPage })
                    }}
                  >
                    {showDeleted ? (
                      <>
                        <ArchiveRestore className="h-4 w-4" />
                        Show Active
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4" />
                        Show Deleted
                      </>
                    )}
                  </Button>
                )}

                <div className="flex-shrink-0">
                  <CustomModalForm
                    addButtonWrapperClassName="flex mb-0"
                  addButton={PositionModalFormConfig.addButton}
                  title={
                    mode === 'view'
                      ? 'View Position'
                      : mode === 'edit'
                      ? 'Update Position'
                      : PositionModalFormConfig.title
                  }
                  description={PositionModalFormConfig.description}
                  fields={modalFields}
                  buttons={PositionModalFormConfig.buttons}
                  data={data}
                  setData={setData}
                  errors={errors}
                  processing={processing}
                  handleSubmit={handleSubmit}
                  open={modalOpen}
                  onOpenChange={handleModalToggle}
                  mode={mode}
                  extraData={{
                    faculties: facultyOptions,
                    departments: departmentOptions,
                  }}
                />
                </div>
              </div>
            }
          />
        </div>

        <div className="flex-1 min-h-0 bg-background p-4 overflow-y-auto">
          <EnterpriseEmployeeTable
            columns={PositionTableConfig.columns}
            actions={PositionTableConfig.actions}
            data={tableData}
            from={positions.from}
            onDelete={handleDelete}
            onView={handleViewPosition}
            onEdit={(item) => openModal('edit', item)}
            onRestore={handleRestore}
            onForceDelete={handleForceDelete}
            resourceType="position"
            enableExpand={false}
            viewMode="table"
          />
        </div>

        {/* Pagination - Fixed at bottom of viewport */}
        <div className="flex-shrink-0 bg-card border-t border-border shadow-sm z-30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3">
            {/* Results Info */}
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{from || 0}</span> to{' '}
              <span className="font-semibold text-foreground">{to || 0}</span> of{' '}
              <span className="font-semibold text-foreground">{total || 0}</span> positions
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-9 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {lastPage > 1 ? (
                  <>
                    {/* First Page */}
                    {currentPage > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        className="h-9 min-w-[40px] hover:bg-muted"
                      >
                        1
                      </Button>
                    )}

                    {/* Ellipsis before current pages */}
                    {currentPage > 3 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}

                    {/* Current page range */}
                    {Array.from({ length: Math.min(5, lastPage - 2) }, (_, i) => {
                      const page =
                        Math.max(2, Math.min(currentPage - 2, lastPage - 4)) + i;
                      if (page >= 2 && page < lastPage) {
                        return (
                          <Button
                            key={page}
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className={`h-9 min-w-[40px] ${
                              currentPage === page
                                ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                                : 'hover:bg-muted'
                            }`}
                          >
                            {page}
                          </Button>
                        );
                      }
                      return null;
                    })}

                    {/* Ellipsis after current pages */}
                    {currentPage < lastPage - 2 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}

                    {/* Last Page */}
                    {lastPage > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(lastPage)}
                        className={`h-9 min-w-[40px] ${
                          currentPage === lastPage
                            ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {lastPage}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="h-9 min-w-[40px] bg-primary text-primary-foreground border-primary"
                  >
                    1
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === lastPage || lastPage === 0}
                className="h-9 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Position Detail Drawer */}
      {selectedPositionForView && (
        <DetailDrawer
          item={selectedPositionForView}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          fields={PositionModalFormConfig.fields}
          titleKey="pos_name"
          subtitleKey="id"
          subtitleLabel="Position ID"
          extraData={{
            faculties: faculties.map((f) => ({ id: f.id, name: f.name, label: f.name, value: f.id.toString() })),
            departments: departments.map((d) => ({ id: d.id, name: d.name, label: d.name, value: d.id.toString() }))
          }}
        />
      )}
    </AppLayout>
  )
}

