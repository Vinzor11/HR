import { CustomModalForm } from '@/components/custom-modal-form'
import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable'
import { CustomToast, toast } from '@/components/custom-toast'
import { PageLayout } from '@/components/page-layout'
import { IconButton } from '@/components/ui/icon-button'
import { SectorModalFormConfig } from '@/config/forms/sector-modal-form'
import { SectorTableConfig } from '@/config/tables/sector-table'
import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { route } from 'ziggy-js'
import { hasPermission } from '@/utils/authorization'
import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowUpDown, Archive, ArchiveRestore, Plus, Download } from 'lucide-react'
import { CompactPagination } from '@/components/CompactPagination'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DetailDrawer } from '@/components/DetailDrawer'
import { TwoFactorVerifyDialog } from '@/components/two-factor-verify-dialog'
import { Require2FAPromptDialog } from '@/components/require-2fa-prompt-dialog'
import { useForceDeleteWith2FA } from '@/hooks/use-force-delete-with-2fa'

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Manage Sectors', href: '/sectors' }]

interface Sector {
  id: number
  name: string
  code?: string | null
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
  show_deleted?: boolean
}

interface IndexProps {
  sectors: Pagination<Sector>
  filters?: FilterProps
}

export default function SectorIndex({ sectors, filters }: IndexProps) {
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
  } = useForceDeleteWith2FA('sectors.force-delete', {
    twoFactorEnabled,
    onSuccess: () => triggerFetch({}),
    onError: (msg) => toast.error(msg ?? 'Failed to permanently delete sector'),
    on2FARequired: () => setShowRequire2FAForceDeleteDialog(true),
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create')
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSectorForView, setSelectedSectorForView] = useState<Sector | null>(null)
  const [sortKey, setSortKey] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'>('name-asc')
  const [searchTerm, setSearchTerm] = useState(filters?.search ?? '')
  const [perPage, setPerPage] = useState(String(filters?.perPage ?? 10))
  const [showDeleted, setShowDeleted] = useState(filters?.show_deleted || false)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const { data, setData, errors, processing, reset, post } = useForm({
    name: '',
    code: '',
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
    setSelectedSector(null)
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

  const handleViewSector = (row: any) => {
    setSelectedSectorForView(row)
    setDrawerOpen(true)
  }

  const openModal = (nextMode: 'create' | 'view' | 'edit', sector?: Sector) => {
    if (nextMode === 'view') {
      handleViewSector(sector)
      return
    }

    setMode(nextMode)
    if (sector) {
      setSelectedSector(sector)
      setData({
        name: sector.name,
        code: sector.code || '',
        description: sector.description || '',
        is_active: sector.is_active,
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
    
    const isEditMode = mode === 'edit' && selectedSector
    data._method = isEditMode ? 'PUT' : 'POST'

    const routePath = isEditMode
      ? route('sectors.update', { sector: selectedSector!.id })
      : route('sectors.store')

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
    router.post(route('sectors.restore', id), {}, {
      preserveScroll: true,
      onSuccess: () => triggerFetch({}),
      onError: () => toast.error('Failed to restore sector'),
    })
  }

  const handleForceDelete = requestForceDelete

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

  const tableData = sectors.data.map((sector) => ({
    ...sector,
    status_label: sector.is_active ? 'Active' : 'Inactive',
  }))

  const triggerFetch = (params: Record<string, any> = {}) => {
    const sortParams = getSortParams(sortKey)
    router.get(route('sectors.index'), {
      search: params.search !== undefined ? params.search : searchTerm,
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
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      triggerFetch({ search: value })
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

  const from = sectors?.from ?? 0
  const total = sectors?.total ?? 0
  const currentPage = sectors?.meta?.current_page || 1
  const lastPage = sectors?.meta?.last_page || 1

  const handlePageChange = (page: number) => {
    const validPage = Math.max(1, Math.min(page, lastPage || 1))
    triggerFetch({ page: validPage, search: searchTerm })
  }

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
      <Head title="Sectors" />
      <CustomToast />

      <PageLayout
        title="Sectors"
        subtitle={showDeleted ? "Viewing deleted sectors. You can restore or permanently delete them." : "Manage organizational sectors (Academic, Administrative)."}
        primaryAction={{
          label: 'Add Sector',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => openModal('create'),
          permission: hasPermission(permissions, 'create-sector'),
        }}
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        isSearching={isSearching}
        searchPlaceholder="Search sectors..."
        perPage={{ value: perPage, onChange: handlePerPageChange }}
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

              {(hasPermission(permissions, 'restore-sector') || hasPermission(permissions, 'force-delete-sector')) && (
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
              <span>Viewing deleted sectors</span>
            </div>
          </div>
        )}
        <EnterpriseEmployeeTable
          columns={SectorTableConfig.columns}
          actions={SectorTableConfig.actions}
          data={tableData}
          from={sectors.from}
          onDelete={handleDelete}
          onView={handleViewSector}
          onEdit={(item) => openModal('edit', item)}
          onRestore={handleRestore}
          onForceDelete={handleForceDelete}
          resourceType="sector"
          enableExpand={false}
          viewMode="table"
        />
      </PageLayout>

      <CustomModalForm
        addButtonWrapperClassName="hidden"
        addButton={{ ...SectorModalFormConfig.addButton, label: '', className: 'h-9 w-9 p-0' }}
        title={mode === 'view' ? 'View Sector' : mode === 'edit' ? 'Update Sector' : SectorModalFormConfig.title}
        description={SectorModalFormConfig.description}
        fields={SectorModalFormConfig.fields}
        buttons={SectorModalFormConfig.buttons}
        data={data}
        setData={setData}
        errors={errors}
        processing={processing}
        handleSubmit={handleSubmit}
        open={modalOpen}
        onOpenChange={handleModalToggle}
        mode={mode}
      />

      {selectedSectorForView && (
        <DetailDrawer
          item={selectedSectorForView}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          fields={SectorModalFormConfig.fields}
          titleKey="name"
          subtitleKey="id"
          subtitleLabel="Sector ID"
        />
      )}

      <Require2FAPromptDialog
        open={showRequire2FAForceDeleteDialog}
        onOpenChange={setShowRequire2FAForceDeleteDialog}
        description="To permanently delete sectors you must enable two-factor authentication (2FA). You can set it up now in just a few steps."
        actionLabel="Let's go"
      />

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
