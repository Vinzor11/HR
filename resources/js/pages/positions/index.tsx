import { CustomModalForm } from '@/components/custom-modal-form'
import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable'
import { CustomToast, toast } from '@/components/custom-toast'
import { PageLayout } from '@/components/page-layout'
import { IconButton } from '@/components/ui/icon-button'
import { PositionModalFormConfig } from '@/config/forms/position-modal-form'
import { PositionTableConfig } from '@/config/tables/position-table'
import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { route } from 'ziggy-js'
import { hasPermission } from '@/utils/authorization'
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { ArrowUpDown, Archive, ArchiveRestore, Plus, Download } from 'lucide-react'
import { CompactPagination } from '@/components/CompactPagination'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DetailDrawer } from '@/components/DetailDrawer'
import { TwoFactorVerifyDialog } from '@/components/two-factor-verify-dialog'
import { Require2FAPromptDialog } from '@/components/require-2fa-prompt-dialog'
import { useForceDeleteWith2FA } from '@/hooks/use-force-delete-with-2fa'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Manage Positions', href: '/positions' },
]

interface Position {
  id: number
  pos_code: string
  pos_name: string
  description?: string
  position_type?: string | null
  creation_type?: 'manual' | 'auto' | null
  sector_id?: number | null
  sector?: {
    id: number
    name: string
    code?: string | null
  } | null
  authority_level?: number | null
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
  sector_id?: string
  show_deleted?: boolean
}

interface SectorOption {
  id: number
  name: string
  code?: string | null
}

interface IndexProps {
  positions: Pagination<Position>
  sectors: SectorOption[]
  filters?: FilterProps
}

export default function PositionIndex({ positions, sectors, filters }: IndexProps) {
  const { flash, auth } = usePage<FlashProps & { auth?: { permissions?: string[]; user?: { two_factor_enabled?: boolean } } }>().props
  const permissions = auth?.permissions || []
  const twoFactorEnabled = auth?.user?.two_factor_enabled ?? false
  const [showRequire2FAForceDeleteDialog, setShowRequire2FAForceDeleteDialog] = useState(false)

  const {
    show2FADialog: show2FAForceDeleteDialog,
    setShow2FADialog: setShow2FAForceDeleteDialog,
    requestForceDelete,
    handle2FAVerify: handle2FAForceDeleteVerify,
    close2FADialog: close2FAForceDeleteDialog,
  } = useForceDeleteWith2FA('positions.force-delete', {
    twoFactorEnabled,
    onSuccess: () => triggerFetch({}),
    onError: (msg) => toast.error(msg ?? 'Failed to permanently delete position'),
    on2FARequired: () => setShowRequire2FAForceDeleteDialog(true),
  })
  const flashMessage = flash?.success || flash?.error
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create')
  const [selectedItem, setSelectedItem] = useState<Position | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedPositionForView, setSelectedPositionForView] = useState<Position | null>(null)
  const [sortKey, setSortKey] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'authority-desc' | 'authority-asc'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('positions_sortKey')
      if (saved && ['name-asc', 'name-desc', 'date-asc', 'date-desc', 'authority-desc', 'authority-asc'].includes(saved)) {
        return saved as typeof sortKey
      }
    }
    return 'authority-desc' // Default to highest authority first
  })
  const [searchTerm, setSearchTerm] = useState(filters?.search ?? '')
  const [searchMode, setSearchMode] = useState<'any' | 'pos_name' | 'code' | 'description' | 'sector'>(() =>
    (filters?.search_mode as 'any' | 'pos_name' | 'code' | 'description' | 'sector') || 'any'
  )
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
  const [sectorFilter, setSectorFilter] = useState(filters?.sector_id ?? '')
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
    sector_id: '',
    authority_level: '',
    description: '',
    _method: 'POST',
  })

  const sectorOptions = (sectors || []).map((sector) => ({
    key: String(sector.id),
    value: String(sector.id),
    label: sector.name,
  }))

  // Flash messages
  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.error) toast.error(flash.error);
  }, [flash]);

  // Auto-set authority level to 80 when position name contains "Head", "Dean", "Director", or "President"
  useEffect(() => {
    if (data.pos_name && (data.pos_name.includes('Head') || data.pos_name.includes('Dean') || data.pos_name.includes('Director') || data.pos_name.includes('President'))) {
      const currentLevel = parseInt(data.authority_level || '1')
      if (currentLevel < 80) {
        setData('authority_level', '80')
        if (mode === 'edit' || mode === 'create') {
          toast.info('Leadership position authority level automatically set to 80')
        }
      }
    }
  }, [data.pos_name, mode])

  const modalFields = useMemo(() => {
    return PositionModalFormConfig.fields.map((field) => {
    if (field.name === 'sector_id') {
      return {
        ...field,
        options: sectorOptions,
        visible: true,
        required: true,
      }
    }
    return field
  })
  }, [sectorOptions])

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


const handleSectorFilterChange = (value: string) => {
  const normalized = value === 'all' ? '' : value
  setSectorFilter(normalized)
  triggerFetch({ sector_id: normalized, page: 1 })
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
      
      // Auto-fix leadership position authority level if it's incorrect
      let authorityLevel = item.authority_level !== undefined && item.authority_level !== null
        ? String(item.authority_level)
        : ''
      
      // Check if this is a leadership position with incorrect authority level
      const isLeadershipPosition = (
        item.pos_name?.includes('Head') || 
        item.pos_name?.includes('Dean') ||
        item.pos_name?.includes('Director') ||
        item.pos_name?.includes('President') ||
        item.pos_code?.includes('HEAD') ||
        item.pos_code?.includes('DEAN')
      )
      
      if (isLeadershipPosition && (!authorityLevel || parseInt(authorityLevel) < 80)) {
        authorityLevel = '80'
        toast.success('Auto-corrected leadership position authority level to 80')
      }
      
      setData({
        pos_code: item.pos_code,
        pos_name: item.pos_name,
        sector_id: item.sector_id ? String(item.sector_id) : '',
        authority_level: authorityLevel,
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
    
    // Prevent double submission - check if already processing
    if (processing) {
      return
    }
    
    const isEditMode = mode === 'edit' && selectedItem
    data._method = isEditMode ? 'PUT' : 'POST'

    transform((formData) => ({
      ...formData,
      sector_id: formData.sector_id ? Number(formData.sector_id) : null,
      authority_level: formData.authority_level ? Number(formData.authority_level) : null,
    }))

    const routePath = isEditMode
      ? route('positions.update', { position: selectedItem!.id })
      : route('positions.store')

    post(
      routePath,
      {
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
      }
    )
  }
  
  const handleRestore = (id: string | number) => {
    router.post(route('positions.restore', id), {}, {
      preserveScroll: true,
      onSuccess: () => {
        triggerFetch({})
      },
      onError: () => toast.error('Failed to restore position'),
    })
  }

  const handleForceDelete = requestForceDelete

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
      sector: pos.sector || null,
    }
  })

  // Convert sortKey to sort_by and sort_order
  const getSortParams = (key: typeof sortKey) => {
    const [field, order] = key.split('-')
    const sortByMap: Record<string, string> = {
      'name': 'pos_name',
      'date': 'created_at',
      'authority': 'authority_level',
    }
    return {
      sort_by: sortByMap[field] || 'created_at',
      sort_order: order || 'asc',
    }
  }

  const triggerFetch = (params: Record<string, any> = {}) => {
    const sortParams = getSortParams(sortKey)
    router.get(route('positions.index'), {
      search: params.search !== undefined ? params.search : searchTerm,
      search_mode: params.search_mode !== undefined ? params.search_mode : searchMode,
      perPage,
      sector_id: params.sector_id !== undefined ? params.sector_id : sectorFilter,
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
      localStorage.setItem('positions_perPage', value)
    }
    triggerFetch({ perPage: value })
  }

  const handleSortKeyChange = (value: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'authority-desc' | 'authority-asc') => {
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
    const validPage = Math.max(1, Math.min(page, lastPage || 1))
    triggerFetch({ page: validPage, search: searchTerm, search_mode: searchMode })
  }

  // Export to CSV function
  const exportToCSV = useCallback(() => {
    const columns = PositionTableConfig.columns.filter(col => !col.isAction && !col.alwaysVisible)
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
    link.setAttribute('download', `positions_${new Date().toISOString().split('T')[0]}.csv`)
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

  // Sync localStorage values with backend on mount
  useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    
    const savedPerPage = typeof window !== 'undefined' ? localStorage.getItem('positions_perPage') : null;
    const currentPerPage = String(filters?.perPage ?? 10);
    
    // If localStorage has a different perPage than what backend sent, sync it
    if (savedPerPage && savedPerPage !== currentPerPage && ['5', '10', '25', '50', '100'].includes(savedPerPage)) {
      triggerFetch({ search: searchTerm, search_mode: searchMode, perPage: savedPerPage });
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

      <PageLayout
        title="Positions"
        subtitle={showDeleted ? "Viewing deleted positions. You can restore or permanently delete them." : "Manage job positions and organizational structure."}
        primaryAction={{
          label: 'Add Position',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => openModal('create'),
          permission: hasPermission(permissions, 'create-position'),
        }}
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        isSearching={isSearching}
        searchPlaceholder="Search positions..."
        searchMode={{
          value: searchMode,
          options: [
            { value: 'any', label: 'Any' },
            { value: 'pos_name', label: 'Position' },
            { value: 'code', label: 'Code' },
            { value: 'description', label: 'Description' },
            { value: 'sector', label: 'Sector' },
          ],
          onChange: (value: string) => {
            setSearchMode(value as 'any' | 'pos_name' | 'code' | 'description' | 'sector')
            if (searchTerm) triggerFetch({ search_mode: value, search: searchTerm, page: 1 })
          },
        }}
        perPage={{
          value: perPage,
          onChange: handlePerPageChange,
        }}
        filtersSlot={
          <>
            {/* Sector filter */}
            <div className="hidden xl:flex items-center">
              <Select value={sectorFilter || 'all'} onValueChange={handleSectorFilterChange}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {(sectors || []).map((sector) => (
                    <SelectItem key={sector.id} value={String(sector.id)}>
                      {sector.name}
                    </SelectItem>
                  ))}
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
                                  <DropdownMenuItem onClick={() => handleSortKeyChange('authority-desc')}>Highest Authority First</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortKeyChange('authority-asc')}>Lowest Authority First</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortKeyChange('name-asc')}>A → Z</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortKeyChange('name-desc')}>Z → A</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortKeyChange('date-asc')}>Oldest First</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSortKeyChange('date-desc')}>Newest First</DropdownMenuItem>
                                </DropdownMenuContent>
              </DropdownMenu>

              {(hasPermission(permissions, 'restore-position') || hasPermission(permissions, 'force-delete-position')) && (
                <IconButton
                  icon={showDeleted ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  tooltip={showDeleted ? "Show Active" : "Show Deleted"}
                  variant={showDeleted ? "default" : "outline"}
                  onClick={() => {
                    const newValue = !showDeleted
                    setShowDeleted(newValue)
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('positions_filter_show_deleted', String(newValue))
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
              <span>Viewing deleted positions</span>
            </div>
          </div>
        )}
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
      </PageLayout>

      {/* Position Modal */}
      <CustomModalForm
        addButtonWrapperClassName="hidden"
        addButton={{
          ...PositionModalFormConfig.addButton,
          label: '',
          className: 'h-9 w-9 p-0',
        }}
        title={mode === 'view' ? 'View Position' : mode === 'edit' ? 'Update Position' : PositionModalFormConfig.title}
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
            sectors: sectorOptions,
          }}
      />

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
            sectors: (sectors || []).map((s) => ({ id: s.id, name: s.name, label: s.name, value: s.id.toString() })),
          }}
        />
      )}

      {/* 2FA required (user has no 2FA) */}
      <Require2FAPromptDialog
        open={showRequire2FAForceDeleteDialog}
        onOpenChange={setShowRequire2FAForceDeleteDialog}
        description="To permanently delete positions you must enable two-factor authentication (2FA). You can set it up now in just a few steps."
        actionLabel="Let's go"
      />

      {/* 2FA verification for permanent delete */}
      <TwoFactorVerifyDialog
        open={show2FAForceDeleteDialog}
        onOpenChange={(open) => {
          setShow2FAForceDeleteDialog(open)
          if (!open) close2FAForceDeleteDialog()
        }}
        onVerify={handle2FAForceDeleteVerify}
        title="Verify to permanently delete"
        description="Enter your 6-digit verification code to confirm permanent deletion. This action cannot be undone."
        verifyButtonLabel="Verify and delete"
      />
    </AppLayout>
  )
}

