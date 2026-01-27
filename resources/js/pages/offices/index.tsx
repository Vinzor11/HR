import { CustomModalForm } from '@/components/custom-modal-form'
import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable'
import { CustomToast, toast } from '@/components/custom-toast'
import { PageLayout } from '@/components/page-layout'
import { IconButton } from '@/components/ui/icon-button'
import { OfficeModalFormConfig } from '@/config/forms/office-modal-form'
import { OfficeTableConfig } from '@/config/tables/office-table'
import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { route } from 'ziggy-js'
import { hasPermission } from '@/utils/authorization'
import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowUpDown, Archive, ArchiveRestore, Plus, Download } from 'lucide-react'
import { CompactPagination } from '@/components/CompactPagination'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DetailDrawer } from '@/components/DetailDrawer'

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Manage Offices', href: '/offices' }]

interface Office {
  id: number
  code: string
  name: string
  description?: string | null
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
  search_mode?: string
  perPage: string
  show_deleted?: boolean
}

interface IndexProps {
  offices: Pagination<Office>
  filters?: FilterProps
}

export default function OfficeIndex({ offices, filters }: IndexProps) {
  const { flash, auth } = usePage<FlashProps & { auth?: { permissions?: string[] } }>().props
  const permissions = auth?.permissions || []
  const flashMessage = flash?.success || flash?.error
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create')
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedOfficeForView, setSelectedOfficeForView] = useState<Office | null>(null)
  const [sortKey, setSortKey] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('offices_sortKey')
      if (saved && ['name-asc', 'name-desc', 'date-asc', 'date-desc'].includes(saved)) {
        return saved as typeof sortKey
      }
    }
    return 'name-asc'
  })
  const [searchTerm, setSearchTerm] = useState(filters?.search ?? '')
  const [searchMode, setSearchMode] = useState<'any' | 'name' | 'code' | 'faculty' | 'description'>(() =>
    (filters?.search_mode as 'any' | 'name' | 'code' | 'faculty' | 'description') || 'any'
  )
  const [perPage, setPerPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('offices_perPage')
      if (saved && ['5', '10', '25', '50', '100'].includes(saved)) {
        return saved
      }
    }
    return String(filters?.perPage ?? 10)
  })
  const [showDeleted, setShowDeleted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('offices_filter_show_deleted')
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
    setSelectedOffice(null)
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

  // Handle view office
  const handleViewOffice = (row: any) => {
    setSelectedOfficeForView(row)
    setDrawerOpen(true)
  }

  const openModal = (nextMode: 'create' | 'view' | 'edit', office?: Office) => {
    // If view mode, use drawer instead
    if (nextMode === 'view') {
      handleViewOffice(office)
      return
    }

    setMode(nextMode)
    if (office) {
      setSelectedOffice(office)
      setData({
        code: office.code,
        name: office.name,
        description: office.description || '',
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
    
    const isEditMode = mode === 'edit' && selectedOffice
    data._method = isEditMode ? 'PUT' : 'POST'

    const routePath = isEditMode
      ? route('offices.update', { office: selectedOffice!.id })
      : route('offices.store')

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
    router.post(route('offices.restore', id), {}, {
      preserveScroll: true,
      onSuccess: () => {
        triggerFetch({})
      },
      onError: () => toast.error('Failed to restore office'),
    })
  }

  const handleForceDelete = (id: string | number) => {
    router.delete(route('offices.force-delete', id), {
      preserveScroll: true,
      onSuccess: () => {
        // Flash message will be handled by useEffect watching flash prop
        triggerFetch({})
      },
      onError: () => toast.error('Failed to permanently delete office'),
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
  const tableData = offices.data

  const triggerFetch = (params: Record<string, any> = {}) => {
    const sortParams = getSortParams(sortKey)
    router.get(route('offices.index'), {
      search: params.search !== undefined ? params.search : searchTerm,
      search_mode: params.search_mode !== undefined ? params.search_mode : searchMode,
      perPage,
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
      triggerFetch({ search: value, search_mode: searchMode })
    }, 300)
  }

  const handlePerPageChange = (value: string) => {
    setPerPage(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem('offices_perPage', value)
    }
    triggerFetch({ perPage: value })
  }

  const handleSortKeyChange = (value: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc') => {
    setSortKey(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem('offices_sortKey', value)
    }
    const sortParams = getSortParams(value)
    triggerFetch({ sort_by: sortParams.sort_by, sort_order: sortParams.sort_order, page: 1 })
  }

  const from = offices?.from ?? 0
  const to = offices?.to ?? 0
  const total = offices?.total ?? 0
  const currentPage = offices?.meta?.current_page || (from > 0 ? Math.floor((from - 1) / (parseInt(perPage) || 10)) + 1 : 1)
  const lastPage = offices?.meta?.last_page || (total > 0 ? Math.ceil(total / (parseInt(perPage) || 10)) : 1)

  const handlePageChange = (page: number) => {
    const validPage = Math.max(1, Math.min(page, lastPage || 1))
    triggerFetch({ page: validPage, search: searchTerm, search_mode: searchMode })
  }

  // Export to CSV function
  const exportToCSV = useCallback(() => {
    const columns = OfficeTableConfig.columns.filter(col => !col.isAction && !col.alwaysVisible)
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
    link.setAttribute('download', `offices_${new Date().toISOString().split('T')[0]}.csv`)
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

    const savedPerPage = typeof window !== 'undefined' ? localStorage.getItem('offices_perPage') : null
    const currentPerPage = String(filters?.perPage ?? 10)

    if (savedPerPage && savedPerPage !== currentPerPage && ['5', '10', '25', '50', '100'].includes(savedPerPage)) {
      triggerFetch({ search: searchTerm, search_mode: searchMode, perPage: savedPerPage })
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
      <Head title="Offices" />
      <CustomToast />

      <PageLayout
        title="Offices"
        subtitle={showDeleted ? "Viewing deleted offices. You can restore or permanently delete them." : "Manage administrative offices and organizational structure."}
        primaryAction={{
          label: 'Add Office',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => openModal('create'),
          permission: hasPermission(permissions, 'create-office'),
        }}
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        isSearching={isSearching}
        searchPlaceholder="Search offices..."
        searchMode={{
          value: searchMode,
          options: [
            { value: 'any', label: 'Any' },
            { value: 'name', label: 'Name' },
            { value: 'code', label: 'Code' },
            { value: 'faculty', label: 'Faculty' },
            { value: 'description', label: 'Description' },
          ],
          onChange: (value: string) => {
            setSearchMode(value as 'any' | 'name' | 'code' | 'faculty' | 'description')
            if (searchTerm) triggerFetch({ search_mode: value, search: searchTerm, page: 1 })
          },
        }}
        perPage={{
          value: perPage,
          onChange: handlePerPageChange,
        }}
        filtersSlot={null}
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

              {(hasPermission(permissions, 'restore-office') || hasPermission(permissions, 'force-delete-office')) && (
                <IconButton
                  icon={showDeleted ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  tooltip={showDeleted ? "Show Active" : "Show Deleted"}
                  variant={showDeleted ? "default" : "outline"}
                  onClick={() => {
                    const newValue = !showDeleted
                    setShowDeleted(newValue)
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('offices_filter_show_deleted', String(newValue))
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
          <CompactPagination
            currentPage={currentPage}
            lastPage={lastPage}
            perPage={perPage}
            total={total}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            perPageOptions={['5', '10', '25', '50', '100']}
          />
        }
      >
        {/* Subtle Status Indicator */}
        {showDeleted && (
          <div className="mb-3 px-3 md:px-6">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Archive className="h-4 w-4" />
              <span>Viewing deleted offices</span>
            </div>
          </div>
        )}
        <EnterpriseEmployeeTable
          columns={OfficeTableConfig.columns}
          actions={OfficeTableConfig.actions}
          data={tableData}
          from={offices.from}
          onDelete={handleDelete}
          onView={handleViewOffice}
          onEdit={(item) => openModal('edit', item)}
          onRestore={handleRestore}
          onForceDelete={handleForceDelete}
          resourceType="office"
          enableExpand={false}
          viewMode="table"
        />
      </PageLayout>

      {/* Office Modal */}
      <CustomModalForm
        addButtonWrapperClassName="hidden"
        addButton={{
          ...OfficeModalFormConfig.addButton,
          label: '',
          className: 'h-9 w-9 p-0',
        }}
        title={mode === 'view' ? 'View Office' : mode === 'edit' ? 'Update Office' : OfficeModalFormConfig.title}
        description={OfficeModalFormConfig.description}
        fields={OfficeModalFormConfig.fields}
        buttons={OfficeModalFormConfig.buttons}
        data={data}
        setData={setData}
        errors={errors}
        processing={processing}
        handleSubmit={handleSubmit}
        open={modalOpen}
        onOpenChange={handleModalToggle}
        mode={mode}
      />

      {/* Office Detail Drawer */}
      {selectedOfficeForView && (
        <DetailDrawer
          item={selectedOfficeForView}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          fields={OfficeModalFormConfig.fields}
          titleKey="name"
          subtitleKey="id"
          subtitleLabel="Office ID"
        />
      )}
    </AppLayout>
  )
}

