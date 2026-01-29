import { CustomModalForm } from '@/components/custom-modal-form'
import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable'
import { CustomToast, toast } from '@/components/custom-toast'
import { PageLayout } from '@/components/page-layout'
import { IconButton } from '@/components/ui/icon-button'
import { UnitPositionModalFormConfig, UNIT_TYPE_OPTIONS } from '@/config/forms/unit-position-modal-form'
import { UnitPositionTableConfig } from '@/config/tables/unit-position-table'
import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { route } from 'ziggy-js'
import { hasPermission } from '@/utils/authorization'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpDown, Archive, ArchiveRestore, Plus } from 'lucide-react'
import { CompactPagination } from '@/components/CompactPagination'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DetailDrawer } from '@/components/DetailDrawer'

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Unit-Position Whitelist', href: '/unit-positions' }]

interface Position {
  id: number
  pos_code: string
  pos_name: string
  sector_id?: number | null
  sector?: { id: number; name: string } | null
  authority_level?: number | null
}

interface UnitPosition {
  id: number
  unit_type: 'college' | 'program' | 'office'
  position_id: number
  position?: Position | null
  description?: string | null
  is_active: boolean
}

interface Pagination<T> {
  data: T[]
  links: any[]
  from: number
  to: number
  total: number
  meta?: {
    current_page: number
    last_page: number
    per_page: number
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
  unit_type?: string
  show_deleted?: boolean
}

interface IndexProps {
  unitPositions: Pagination<UnitPosition>
  positions: Position[]
  filters?: FilterProps
}

export default function UnitPositionIndex({ unitPositions, positions, filters }: IndexProps) {
  const { flash, auth } = usePage<FlashProps & { auth?: { permissions?: string[] } }>().props
  const permissions = auth?.permissions || []
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create')
  const [selectedItem, setSelectedItem] = useState<UnitPosition | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedItemForView, setSelectedItemForView] = useState<UnitPosition | null>(null)
  const [sortKey, setSortKey] = useState<'name-asc' | 'name-desc' | 'type-asc' | 'type-desc'>('type-asc')
  const [searchTerm, setSearchTerm] = useState(filters?.search ?? '')
  const [perPage, setPerPage] = useState(String(filters?.perPage ?? 25))
  const [unitTypeFilter, setUnitTypeFilter] = useState(filters?.unit_type ?? '')
  const [showDeleted, setShowDeleted] = useState(filters?.show_deleted || false)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const { data, setData, errors, processing, reset, post } = useForm({
    unit_type: 'college' as 'college' | 'program' | 'office',
    position_id: '',
    description: '',
    is_active: true,
    _method: 'POST',
  })

  useEffect(() => {
    if (flash?.success) toast.success(flash.success)
    if (flash?.error) toast.error(flash.error)
  }, [flash])

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

  const refreshTable = () => {
    triggerFetch()
  }

  const handleViewItem = (row: any) => {
    setSelectedItemForView(row)
    setDrawerOpen(true)
  }

  const openModal = (nextMode: 'create' | 'view' | 'edit', item?: UnitPosition) => {
    if (nextMode === 'view') {
      handleViewItem(item)
      return
    }

    setMode(nextMode)
    if (item) {
      setSelectedItem(item)
      setData({
        unit_type: item.unit_type,
        position_id: String(item.position_id),
        description: item.description || '',
        is_active: item.is_active,
        _method: 'PUT',
      })
    } else {
      reset()
    }
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (processing) return
    
    const isEditMode = mode === 'edit' && selectedItem
    data._method = isEditMode ? 'PUT' : 'POST'

    const routePath = isEditMode
      ? route('unit-positions.update', { unit_position: selectedItem!.id })
      : route('unit-positions.store')

    post(routePath, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
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
    router.post(route('unit-positions.restore', id), {}, {
      preserveScroll: true,
      onSuccess: () => triggerFetch({}),
      onError: () => toast.error('Failed to restore entry'),
    })
  }

  const handleForceDelete = (id: string | number) => {
    router.delete(route('unit-positions.force-delete', id), {
      preserveScroll: true,
      onSuccess: () => triggerFetch({}),
      onError: () => toast.error('Failed to permanently delete entry'),
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

  const getSortParams = (key: typeof sortKey) => {
    const [field, order] = key.split('-')
    const sortByMap: Record<string, string> = { 'name': 'position_name', 'type': 'unit_type' }
    return { sort_by: sortByMap[field] || 'unit_type', sort_order: order || 'asc' }
  }

  const tableData = unitPositions.data.map((item) => ({
    ...item,
    status_label: item.is_active ? 'Active' : 'Inactive',
  }))

  const triggerFetch = (params: Record<string, any> = {}) => {
    const sortParams = getSortParams(sortKey)
    router.get(route('unit-positions.index'), {
      search: params.search !== undefined ? params.search : searchTerm,
      perPage,
      unit_type: params.unit_type !== undefined ? params.unit_type : unitTypeFilter,
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
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      triggerFetch({ search: value })
    }, 300)
  }

  const handlePerPageChange = (value: string) => {
    setPerPage(value)
    triggerFetch({ perPage: value })
  }

  const handleSortKeyChange = (value: typeof sortKey) => {
    setSortKey(value)
    const sortParams = getSortParams(value)
    triggerFetch({ sort_by: sortParams.sort_by, sort_order: sortParams.sort_order, page: 1 })
  }

  const handleUnitTypeFilterChange = (value: string) => {
    const normalized = value === 'all' ? '' : value
    setUnitTypeFilter(normalized)
    triggerFetch({ unit_type: normalized, page: 1 })
  }

  const from = unitPositions?.from ?? 0
  const total = unitPositions?.total ?? 0
  const currentPage = unitPositions?.meta?.current_page || 1
  const lastPage = unitPositions?.meta?.last_page || 1

  const handlePageChange = (page: number) => {
    const validPage = Math.max(1, Math.min(page, lastPage || 1))
    triggerFetch({ page: validPage, search: searchTerm })
  }

  // Build modal fields with dynamic options
  const positionOptions = positions.map((p) => ({
    key: String(p.id),
    value: String(p.id),
    label: `${p.pos_code} - ${p.pos_name}${p.sector?.name ? ` (${p.sector.name})` : ' (System-wide)'}`,
  }))

  const modalFields = UnitPositionModalFormConfig.fields.map((field) => {
    if (field.name === 'position_id') {
      return { ...field, options: positionOptions }
    }
    return field
  })

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
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
      <Head title="Unit-Position Whitelist" />
      <CustomToast />

      <PageLayout
        title="Unit-Position Whitelist"
        subtitle={showDeleted ? "Viewing deleted entries. You can restore or permanently delete them." : "Define which positions can be assigned under each unit type."}
        primaryAction={{
          label: 'Add to Whitelist',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => openModal('create'),
          permission: hasPermission(permissions, 'create-unit-position'),
        }}
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        isSearching={isSearching}
        searchPlaceholder="Search positions..."
        perPage={{ value: perPage, onChange: handlePerPageChange }}
        filtersSlot={
          <>
            <div className="hidden md:flex items-center">
              <Select value={unitTypeFilter || 'all'} onValueChange={handleUnitTypeFilterChange}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="college">College</SelectItem>
                  <SelectItem value="program">Program</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
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
                  <IconButton icon={<ArrowUpDown className="h-4 w-4" />} tooltip="Sort" variant="outline" aria-label="Sort" className="h-9 w-9 rounded-lg" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSortKeyChange('type-asc')}>Unit Type A → Z</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('type-desc')}>Unit Type Z → A</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('name-asc')}>Position A → Z</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('name-desc')}>Position Z → A</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {(hasPermission(permissions, 'restore-unit-position') || hasPermission(permissions, 'force-delete-unit-position')) && (
                <IconButton
                  icon={showDeleted ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  tooltip={showDeleted ? "Show Active" : "Show Deleted"}
                  variant={showDeleted ? "default" : "outline"}
                  onClick={() => {
                    const newValue = !showDeleted
                    setShowDeleted(newValue)
                    triggerFetch({ show_deleted: newValue, page: 1, perPage })
                  }}
                  aria-label={showDeleted ? "Show Active" : "Show Deleted"}
                  className="h-9 w-9 rounded-lg"
                />
              )}
            </div>
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
            perPageOptions={['10', '25', '50', '100']}
          />
        }
      >
        {showDeleted && (
          <div className="mb-3 px-3 md:px-6">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Archive className="h-4 w-4" />
              <span>Viewing deleted entries</span>
            </div>
          </div>
        )}
        <EnterpriseEmployeeTable
          columns={UnitPositionTableConfig.columns}
          actions={UnitPositionTableConfig.actions}
          data={tableData}
          from={unitPositions.from}
          onDelete={handleDelete}
          onView={handleViewItem}
          onEdit={(item) => openModal('edit', item)}
          onRestore={handleRestore}
          onForceDelete={handleForceDelete}
          resourceType="unit-position"
          enableExpand={false}
          viewMode="table"
        />
      </PageLayout>

      <CustomModalForm
        addButtonWrapperClassName="hidden"
        addButton={{ ...UnitPositionModalFormConfig.addButton, label: '', className: 'h-9 w-9 p-0' }}
        title={mode === 'view' ? 'View Whitelist Entry' : mode === 'edit' ? 'Update Whitelist Entry' : UnitPositionModalFormConfig.title}
        description={UnitPositionModalFormConfig.description}
        fields={modalFields}
        buttons={UnitPositionModalFormConfig.buttons}
        data={data}
        setData={setData}
        errors={errors}
        processing={processing}
        handleSubmit={handleSubmit}
        open={modalOpen}
        onOpenChange={handleModalToggle}
        mode={mode}
      />

      {selectedItemForView && (
        <DetailDrawer
          item={selectedItemForView}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          fields={UnitPositionModalFormConfig.fields}
          titleKey="position.pos_name"
          subtitleKey="unit_type"
          subtitleLabel="Unit Type"
          extraData={{ positions: positionOptions }}
        />
      )}
    </AppLayout>
  )
}
