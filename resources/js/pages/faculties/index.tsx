import { CustomModalForm } from '@/components/custom-modal-form'
import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable'
import { CustomToast, toast } from '@/components/custom-toast'
import { PageLayout } from '@/components/page-layout'
import { IconButton } from '@/components/ui/icon-button'
import { FacultyModalFormConfig } from '@/config/forms/faculty-modal-form'
import { FacultyTableConfig } from '@/config/tables/faculty-table'
import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { route } from 'ziggy-js'
import { hasPermission } from '@/utils/authorization'
import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowUpDown, ChevronLeft, ChevronRight, Archive, ArchiveRestore, Plus, Download } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DetailDrawer } from '@/components/DetailDrawer'

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Manage Faculties', href: '/faculties' }]

type FacultyStatus = 'active' | 'inactive'

interface Faculty {
  id: number
  code: string
  name: string
  description?: string | null
  status: FacultyStatus
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
  status?: FacultyStatus | ''
  show_deleted?: boolean
}

interface IndexProps {
  faculties: Pagination<Faculty>
  filters?: FilterProps
}

export default function FacultyIndex({ faculties, filters }: IndexProps) {
  const { flash, auth } = usePage<FlashProps & { auth?: { permissions?: string[] } }>().props
  const permissions = auth?.permissions || []
  const flashMessage = flash?.success || flash?.error
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create')
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedFacultyForView, setSelectedFacultyForView] = useState<Faculty | null>(null)
  const [sortKey, setSortKey] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('faculties_sortKey')
      if (saved && ['name-asc', 'name-desc', 'date-asc', 'date-desc'].includes(saved)) {
        return saved as typeof sortKey
      }
    }
    return 'name-asc'
  })
  const [searchTerm, setSearchTerm] = useState(filters?.search ?? '')
  const [perPage, setPerPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('faculties_perPage')
      if (saved && ['5', '10', '25', '50', '100'].includes(saved)) {
        return saved
      }
    }
    return String(filters?.perPage ?? 10)
  })
  const [statusFilter, setStatusFilter] = useState<FacultyStatus | ''>(
    (filters?.status as FacultyStatus | '') ?? ''
  )
  const [showDeleted, setShowDeleted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('faculties_filter_show_deleted')
      if (saved === 'true') return true
      if (saved === 'false') return false
    }
    return filters?.show_deleted || false
  })
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const hasSyncedRef = useRef(false)

  const { data, setData, errors, processing, reset, post } = useForm({
    code: '',
    name: '',
    status: 'active' as FacultyStatus,
    description: '',
    _method: 'POST',
  })

  // Flash messages
  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.error) toast.error(flash.error);
  }, [flash]);

  const closeModal = () => {
    setMode('create')
    setSelectedFaculty(null)
    reset()
    setModalOpen(false)
  }

  const handleModalToggle = (open: boolean) => {
    setModalOpen(open)
    if (!open) closeModal()
  }

  const refreshTable = () => {
    triggerFetch()
  }

  // Handle view faculty
  const handleViewFaculty = (row: any) => {
    setSelectedFacultyForView(row)
    setDrawerOpen(true)
  }

  const openModal = (nextMode: 'create' | 'view' | 'edit', faculty?: Faculty) => {
    // If view mode, use drawer instead
    if (nextMode === 'view') {
      handleViewFaculty(faculty)
      return
    }

    setMode(nextMode)
    if (faculty) {
      setSelectedFaculty(faculty)
      setData({
        code: faculty.code,
        name: faculty.name,
        status: faculty.status,
        description: faculty.description || '',
        _method: 'PUT',
      })
    } else {
      reset()
    }
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submission - check if already processing
    if (processing) {
      return
    }
    
    const isEditMode = mode === 'edit' && selectedFaculty
    data._method = isEditMode ? 'PUT' : 'POST'

    const routePath = isEditMode
      ? route('faculties.update', { faculty: selectedFaculty!.id })
      : route('faculties.store')

    post(routePath, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        // Flash message will be handled by useEffect watching flash prop
        closeModal()
        refreshTable()
      },
      onError: (error: Record<string, string | string[]>) => {
        if (typeof error?.message === 'string') {
          toast.error(error.message)
        }
      },
    })
  }

  const handleRestore = (id: string | number) => {
    router.post(route('faculties.restore', id), {}, {
      preserveScroll: true,
      onSuccess: () => {
        triggerFetch({})
      },
      onError: () => toast.error('Failed to restore faculty'),
    })
  }

  const handleForceDelete = (id: string | number) => {
    router.delete(route('faculties.force-delete', id), {
      preserveScroll: true,
      onSuccess: () => {
        // Flash message will be handled by useEffect watching flash prop
        triggerFetch({})
      },
      onError: () => toast.error('Failed to permanently delete faculty'),
    })
  }

  const handleDelete = (routePath: string) => {
    router.delete(routePath, {
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

  // Convert sortKey to sort_by and sort_order
  const getSortParams = (key: typeof sortKey) => {
    const [field, order] = key.split('-')
    const sortByMap: Record<string, string> = {
      'name': 'name',
      'date': 'created_at',
    }
    return {
      sort_by: sortByMap[field] || 'name',
      sort_order: order || 'asc',
    }
  }

  // No client-side sorting - backend handles it
  const tableData = faculties.data.map((faculty) => ({
    ...faculty,
    status_label: faculty.status === 'active' ? 'Active' : 'Inactive',
  }))

  const triggerFetch = (params: Record<string, any> = {}) => {
    const sortParams = getSortParams(sortKey)
    router.get(route('faculties.index'), {
      search: searchTerm,
      perPage,
      status: statusFilter,
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
      localStorage.setItem('faculties_perPage', value)
    }
    triggerFetch({ perPage: value })
  }

  const handleStatusFilterChange = (value: string) => {
    const normalized = value === 'all' ? '' : (value as FacultyStatus)
    setStatusFilter(normalized)
    triggerFetch({ status: normalized, page: 1 })
  }

  const handleSortKeyChange = (value: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc') => {
    setSortKey(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem('faculties_sortKey', value)
    }
    const sortParams = getSortParams(value)
    triggerFetch({ sort_by: sortParams.sort_by, sort_order: sortParams.sort_order, page: 1 })
  }

  const from = faculties?.from ?? 0
  const to = faculties?.to ?? 0
  const total = faculties?.total ?? 0
  const currentPage = faculties?.meta?.current_page || (from > 0 ? Math.floor((from - 1) / (parseInt(perPage) || 10)) + 1 : 1)
  const lastPage = faculties?.meta?.last_page || (total > 0 ? Math.ceil(total / (parseInt(perPage) || 10)) : 1)

  const handlePageChange = (page: number) => {
    const validPage = Math.max(1, Math.min(page, lastPage || 1))
    triggerFetch({ page: validPage })
  }

  // Export to CSV function
  const exportToCSV = useCallback(() => {
    const columns = FacultyTableConfig.columns.filter(col => !col.isAction && !col.alwaysVisible)
    const headers = columns.map(col => col.label)
    
    const rows = tableData.map(item => 
      columns.map(col => {
        const value = getNestedValue(item, col.key)
        return value || '-'
      })
    )

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `faculties_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Data exported to CSV')
  }, [tableData])

  // Helper function for nested values
  const getNestedValue = (obj: any, path: string): any => {
    if (!obj || typeof obj !== 'object') return null
    return path.split('.').reduce((acc, key) => {
      if (acc === null || acc === undefined || typeof acc !== 'object') return null
      return acc[key] !== undefined ? acc[key] : null
    }, obj)
  }

  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
    }
  }, [])

  useEffect(() => {
    if (hasSyncedRef.current) return
    hasSyncedRef.current = true

    const savedPerPage = typeof window !== 'undefined' ? localStorage.getItem('faculties_perPage') : null
    const currentPerPage = String(filters?.perPage ?? 10)

    if (savedPerPage && savedPerPage !== currentPerPage && ['5', '10', '25', '50', '100'].includes(savedPerPage)) {
      triggerFetch({ search: searchTerm, perPage: savedPerPage })
    }
  }, [])

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
      <Head title="Faculties" />
      <CustomToast />

      <PageLayout
        title="Faculties"
        subtitle={showDeleted ? "Viewing deleted faculties. You can restore or permanently delete them." : "Manage academic faculties and organizational structure."}
        primaryAction={{
          label: 'Add Faculty',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => openModal('create'),
          permission: hasPermission(permissions, 'create-faculty'),
        }}
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        isSearching={isSearching}
        searchPlaceholder="Search faculties..."
        perPage={{
          value: perPage,
          onChange: handlePerPageChange,
        }}
        filtersSlot={
          <>
            {/* Status Filter */}
            <div className="hidden md:flex items-center">
              <Select value={statusFilter || 'all'} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        }
        actionsSlot={
          <>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton
                    icon={<ArrowUpDown className="h-4 w-4" />}
                    tooltip="Sort"
                    variant="outline"
                    aria-label="Sort"
                    className="h-9 w-9 rounded-lg"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSortKeyChange('name-asc')}>A → Z</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('name-desc')}>Z → A</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('date-asc')}>Oldest First</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('date-desc')}>Newest First</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {(hasPermission(permissions, 'restore-faculty') || hasPermission(permissions, 'force-delete-faculty')) && (
                <IconButton
                  icon={showDeleted ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  tooltip={showDeleted ? "Show Active" : "Show Deleted"}
                  variant={showDeleted ? "default" : "outline"}
                  onClick={() => {
                    const newValue = !showDeleted
                    setShowDeleted(newValue)
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('faculties_filter_show_deleted', String(newValue))
                    }
                    triggerFetch({ show_deleted: newValue, page: 1, perPage })
                  }}
                  aria-label={showDeleted ? "Show Active" : "Show Deleted"}
                  className="h-9 w-9 rounded-lg"
                />
              )}
            </div>

            {/* Export Button */}
            <IconButton
              icon={<Download className="h-4 w-4" />}
              tooltip="Export"
              variant="outline"
              onClick={exportToCSV}
              aria-label="Export"
              className="h-9 w-9 rounded-lg"
            />
          </>
        }
        pagination={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3">
            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              <span className="hidden sm:inline">
                Showing <span className="font-semibold text-foreground">{from || 0}</span> to{' '}
                <span className="font-semibold text-foreground">{to || 0}</span> of{' '}
                <span className="font-semibold text-foreground">{total || 0}</span> faculties
              </span>
              <span className="sm:hidden">
                <span className="font-semibold text-foreground">{from || 0}</span>-
                <span className="font-semibold text-foreground">{to || 0}</span> of{' '}
                <span className="font-semibold text-foreground">{total || 0}</span>
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                className="h-8 sm:h-9 px-2 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>
              <div className="hidden sm:flex items-center gap-1">
                {lastPage > 1 ? (
                  <>
                    {currentPage > 1 && (
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} className="h-9 min-w-[40px] hover:bg-muted">1</Button>
                    )}
                    {currentPage > 3 && <span className="px-2 text-muted-foreground">...</span>}
                    {Array.from({ length: Math.min(5, lastPage - 2) }, (_, i) => {
                      const page = Math.max(2, Math.min(currentPage - 2, lastPage - 4)) + i;
                      if (page >= 2 && page < lastPage) {
                        return (
                          <Button key={page} variant="outline" size="sm" onClick={() => handlePageChange(page)}
                            className={`h-9 min-w-[40px] ${currentPage === page ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' : 'hover:bg-muted'}`}>
                            {page}
                          </Button>
                        );
                      }
                      return null;
                    })}
                    {currentPage < lastPage - 2 && <span className="px-2 text-muted-foreground">...</span>}
                    {lastPage > 1 && (
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(lastPage)}
                        className={`h-9 min-w-[40px] ${currentPage === lastPage ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' : 'hover:bg-muted'}`}>
                        {lastPage}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button variant="outline" size="sm" disabled className="h-9 min-w-[40px] bg-primary text-primary-foreground border-primary">1</Button>
                )}
              </div>
              <div className="flex sm:hidden items-center gap-1 px-2 text-sm">
                <span className="font-semibold text-foreground">{currentPage}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{lastPage || 1}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === lastPage || lastPage === 0}
                className="h-8 sm:h-9 px-2 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        }
      >
        {/* Subtle Status Indicator */}
        {showDeleted && (
          <div className="mb-3 px-3 md:px-6">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Archive className="h-4 w-4" />
              <span>Viewing deleted faculties</span>
            </div>
          </div>
        )}
        <EnterpriseEmployeeTable
          columns={FacultyTableConfig.columns}
          actions={FacultyTableConfig.actions}
          data={tableData}
          from={faculties.from}
          onDelete={handleDelete}
          onView={handleViewFaculty}
          onEdit={(item) => openModal('edit', item)}
          onRestore={handleRestore}
          onForceDelete={handleForceDelete}
          resourceType="faculty"
          enableExpand={false}
          viewMode="table"
        />
      </PageLayout>

      {/* Faculty Modal */}
      <CustomModalForm
        addButtonWrapperClassName="hidden"
        addButton={{
          ...FacultyModalFormConfig.addButton,
          label: '',
          className: 'h-9 w-9 p-0',
        }}
        title={mode === 'view' ? 'View Faculty' : mode === 'edit' ? 'Update Faculty' : FacultyModalFormConfig.title}
        description={FacultyModalFormConfig.description}
        fields={FacultyModalFormConfig.fields}
        buttons={FacultyModalFormConfig.buttons}
        data={data}
        setData={setData}
        errors={errors}
        processing={processing}
        handleSubmit={handleSubmit}
        open={modalOpen}
        onOpenChange={handleModalToggle}
        mode={mode}
      />

      {/* Faculty Detail Drawer */}
      {selectedFacultyForView && (
        <DetailDrawer
          item={selectedFacultyForView}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          fields={FacultyModalFormConfig.fields}
          titleKey="name"
          subtitleKey="id"
          subtitleLabel="Faculty ID"
        />
      )}
    </AppLayout>
  )
}


