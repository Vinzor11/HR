import { CustomModalForm } from '@/components/custom-modal-form'
import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable'
import { CustomToast, toast } from '@/components/custom-toast'
import { PageLayout } from '@/components/page-layout'
import { IconButton } from '@/components/ui/icon-button'
import { UnitModalFormConfig, UNIT_TYPE_OPTIONS, UNIT_TYPE_DESCRIPTIONS } from '@/config/forms/unit-modal-form'
import { UnitTableConfig } from '@/config/tables/unit-table'
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

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Manage Units', href: '/units' }]

interface Sector {
  id: number
  name: string
  code?: string | null
}

interface Unit {
  id: number
  sector_id: number
  unit_type: 'college' | 'program' | 'office'
  name: string
  code?: string | null
  parent_unit_id?: number | null
  description?: string | null
  is_active: boolean
  sector?: Sector | null
  parentUnit?: Unit | null
  parent_unit?: Unit | null
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
  unit_type?: string
  sector_id?: string
  parent_unit_id?: string
  show_deleted?: boolean
}

interface IndexProps {
  units: Pagination<Unit>
  sectors: Sector[]
  parentUnits: Unit[]
  filters?: FilterProps
}

export default function UnitIndex({ units, sectors, parentUnits, filters }: IndexProps) {
  const { flash, auth } = usePage<FlashProps & { auth?: { permissions?: string[] } }>().props
  const permissions = auth?.permissions || []
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create')
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedUnitForView, setSelectedUnitForView] = useState<Unit | null>(null)
  const [sortKey, setSortKey] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'>('name-asc')
  const [searchTerm, setSearchTerm] = useState(filters?.search ?? '')
  const [searchMode, setSearchMode] = useState<'any' | 'name' | 'code'>((filters?.search_mode as any) || 'any')
  const [perPage, setPerPage] = useState(String(filters?.perPage ?? 10))
  const [unitTypeFilter, setUnitTypeFilter] = useState(filters?.unit_type ?? '')
  const [sectorFilter, setSectorFilter] = useState(filters?.sector_id ?? '')
  const [showDeleted, setShowDeleted] = useState(filters?.show_deleted || false)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const { data, setData, errors, processing, reset, post } = useForm({
    sector_id: '',
    unit_type: 'college' as 'college' | 'program' | 'office',
    name: '',
    code: '',
    parent_unit_id: '',
    description: '',
    is_active: true,
    _method: 'POST',
  })

  useEffect(() => {
    if (flash?.success) toast.success(flash.success)
    if (flash?.error) toast.error(flash.error)
  }, [flash])

  // Clear parent_unit_id when unit_type changes to college
  useEffect(() => {
    if (data.unit_type === 'college' && data.parent_unit_id) {
      setData('parent_unit_id', '')
    }
  }, [data.unit_type])

  const closeModal = () => {
    setMode('create')
    setSelectedUnit(null)
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

  const handleViewUnit = (row: any) => {
    setSelectedUnitForView(row)
    setDrawerOpen(true)
  }

  const openModal = (nextMode: 'create' | 'view' | 'edit', unit?: Unit) => {
    if (nextMode === 'view') {
      handleViewUnit(unit)
      return
    }

    setMode(nextMode)
    if (unit) {
      setSelectedUnit(unit)
      setData({
        sector_id: String(unit.sector_id),
        unit_type: unit.unit_type,
        name: unit.name,
        code: unit.code || '',
        parent_unit_id: unit.parent_unit_id ? String(unit.parent_unit_id) : '',
        description: unit.description || '',
        is_active: unit.is_active,
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
    
    const isEditMode = mode === 'edit' && selectedUnit
    data._method = isEditMode ? 'PUT' : 'POST'

    const routePath = isEditMode
      ? route('units.update', { unit: selectedUnit!.id })
      : route('units.store')

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
    router.post(route('units.restore', id), {}, {
      preserveScroll: true,
      onSuccess: () => triggerFetch({}),
      onError: () => toast.error('Failed to restore unit'),
    })
  }

  const handleForceDelete = (id: string | number) => {
    router.delete(route('units.force-delete', id), {
      preserveScroll: true,
      onSuccess: () => triggerFetch({}),
      onError: () => toast.error('Failed to permanently delete unit'),
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
    const sortByMap: Record<string, string> = { 'name': 'name', 'date': 'created_at' }
    return { sort_by: sortByMap[field] || 'name', sort_order: order || 'asc' }
  }

  const tableData = units.data.map((unit) => ({
    ...unit,
    status_label: unit.is_active ? 'Active' : 'Inactive',
  }))

  const triggerFetch = (params: Record<string, any> = {}) => {
    const sortParams = getSortParams(sortKey)
    router.get(route('units.index'), {
      search: params.search !== undefined ? params.search : searchTerm,
      search_mode: params.search_mode !== undefined ? params.search_mode : searchMode,
      perPage,
      unit_type: params.unit_type !== undefined ? params.unit_type : unitTypeFilter,
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
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      triggerFetch({ search: value, search_mode: searchMode })
    }, 300)
  }

  const handlePerPageChange = (value: string) => {
    setPerPage(value)
    triggerFetch({ perPage: value })
  }

  const handleSortKeyChange = (value: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc') => {
    setSortKey(value)
    const sortParams = getSortParams(value)
    triggerFetch({ sort_by: sortParams.sort_by, sort_order: sortParams.sort_order, page: 1 })
  }

  const handleUnitTypeFilterChange = (value: string) => {
    const normalized = value === 'all' ? '' : value
    setUnitTypeFilter(normalized)
    triggerFetch({ unit_type: normalized, page: 1 })
  }

  const handleSectorFilterChange = (value: string) => {
    const normalized = value === 'all' ? '' : value
    setSectorFilter(normalized)
    triggerFetch({ sector_id: normalized, page: 1 })
  }

  const from = units?.from ?? 0
  const total = units?.total ?? 0
  const currentPage = units?.meta?.current_page || 1
  const lastPage = units?.meta?.last_page || 1

  const handlePageChange = (page: number) => {
    const validPage = Math.max(1, Math.min(page, lastPage || 1))
    triggerFetch({ page: validPage, search: searchTerm, search_mode: searchMode })
  }

  // Build modal fields with dynamic options
  const sectorOptions = sectors.map((s) => ({ key: String(s.id), value: String(s.id), label: s.name }))
  const parentUnitOptions = parentUnits.map((u) => ({ key: String(u.id), value: String(u.id), label: u.name }))

  const modalFields = UnitModalFormConfig.fields.map((field) => {
    if (field.name === 'sector_id') {
      return { ...field, options: sectorOptions }
    }
    if (field.name === 'parent_unit_id') {
      return {
        ...field,
        options: parentUnitOptions,
        required: data.unit_type === 'program',
        description: data.unit_type === 'program' ? 'Required for programs. Select the parent college.' : undefined,
      }
    }
    if (field.name === 'unit_type') {
      return {
        ...field,
        description: data.unit_type && UNIT_TYPE_DESCRIPTIONS[data.unit_type] ? UNIT_TYPE_DESCRIPTIONS[data.unit_type] : undefined,
      }
    }
    return field
  }).filter((field) => field.name !== 'parent_unit_id' || data.unit_type === 'program')

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
      <Head title="Units" />
      <CustomToast />

      <PageLayout
        title="Units"
        subtitle={showDeleted ? "Viewing deleted units. You can restore or permanently delete them." : "Manage organizational units (Colleges, Programs, Offices)."}
        primaryAction={{
          label: 'Add Unit',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => openModal('create'),
          permission: hasPermission(permissions, 'create-unit'),
        }}
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        isSearching={isSearching}
        searchPlaceholder="Search units..."
        searchMode={{
          value: searchMode,
          options: [
            { value: 'any', label: 'Any' },
            { value: 'name', label: 'Name' },
            { value: 'code', label: 'Code' },
          ],
          onChange: (value: string) => {
            setSearchMode(value as any)
            if (searchTerm) triggerFetch({ search_mode: value, search: searchTerm, page: 1 })
          },
        }}
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
                  <SelectItem value="college">Colleges</SelectItem>
                  <SelectItem value="program">Programs</SelectItem>
                  <SelectItem value="office">Offices</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden lg:flex items-center">
              <Select value={sectorFilter || 'all'} onValueChange={handleSectorFilterChange}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="All Sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {sectors.map((sector) => (
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
                  <IconButton icon={<ArrowUpDown className="h-4 w-4" />} tooltip="Sort" variant="outline" aria-label="Sort" className="h-9 w-9 rounded-lg" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSortKeyChange('name-asc')}>A → Z</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('name-desc')}>Z → A</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('date-asc')}>Oldest First</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('date-desc')}>Newest First</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {(hasPermission(permissions, 'restore-unit') || hasPermission(permissions, 'force-delete-unit')) && (
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
            perPageOptions={['5', '10', '25', '50', '100']}
          />
        }
      >
        {showDeleted && (
          <div className="mb-3 px-3 md:px-6">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Archive className="h-4 w-4" />
              <span>Viewing deleted units</span>
            </div>
          </div>
        )}
        <EnterpriseEmployeeTable
          columns={UnitTableConfig.columns}
          actions={UnitTableConfig.actions}
          data={tableData}
          from={units.from}
          onDelete={handleDelete}
          onView={handleViewUnit}
          onEdit={(item) => openModal('edit', item)}
          onRestore={handleRestore}
          onForceDelete={handleForceDelete}
          resourceType="unit"
          enableExpand={false}
          viewMode="table"
        />
      </PageLayout>

      <CustomModalForm
        addButtonWrapperClassName="hidden"
        addButton={{ ...UnitModalFormConfig.addButton, label: '', className: 'h-9 w-9 p-0' }}
        title={mode === 'view' ? 'View Unit' : mode === 'edit' ? 'Update Unit' : UnitModalFormConfig.title}
        description={UnitModalFormConfig.description}
        fields={modalFields}
        buttons={UnitModalFormConfig.buttons}
        data={data}
        setData={setData}
        errors={errors}
        processing={processing}
        handleSubmit={handleSubmit}
        open={modalOpen}
        onOpenChange={handleModalToggle}
        mode={mode}
      />

      {selectedUnitForView && (
        <DetailDrawer
          item={selectedUnitForView}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          fields={UnitModalFormConfig.fields}
          titleKey="name"
          subtitleKey="id"
          subtitleLabel="Unit ID"
          extraData={{ sectors: sectors.map((s) => ({ id: s.id, name: s.name, label: s.name, value: s.id.toString() })) }}
        />
      )}
    </AppLayout>
  )
}
