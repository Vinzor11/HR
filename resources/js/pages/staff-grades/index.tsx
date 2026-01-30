import { CustomModalForm } from '@/components/custom-modal-form'
import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable'
import { CustomToast, toast } from '@/components/custom-toast'
import { PageLayout } from '@/components/page-layout'
import { IconButton } from '@/components/ui/icon-button'
import { StaffGradeModalFormConfig } from '@/config/forms/staff-grade-modal-form'
import { StaffGradeTableConfig } from '@/config/tables/staff-grade-table'
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

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Staff Grades', href: '/staff-grades' }]

interface StaffGrade {
  id: number
  name: string
  code?: string | null
  level: number
  description?: string | null
  is_active: boolean
  sort_order: number
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
  staffGrades: Pagination<StaffGrade>
  filters?: FilterProps
}

export default function StaffGradeIndex({ staffGrades, filters }: IndexProps) {
  const { flash, auth } = usePage<FlashProps & { auth?: { permissions?: string[] } }>().props
  const permissions = auth?.permissions || []
  const twoFactorEnabled = (auth as { user?: { two_factor_enabled?: boolean } })?.user?.two_factor_enabled ?? false
  const [showRequire2FAForceDeleteDialog, setShowRequire2FAForceDeleteDialog] = useState(false)
  const {
    show2FADialog: show2FAForceDeleteDialog,
    setShow2FADialog: setShow2FAForceDeleteDialog,
    requestForceDelete,
    handle2FAVerify: handle2FAForceDeleteVerify,
    close2FADialog: close2FAForceDeleteDialog,
  } = useForceDeleteWith2FA('staff-grades.force-delete', {
    twoFactorEnabled,
    onSuccess: () => triggerFetch({}),
    onError: (msg) => toast.error(msg ?? 'Failed to permanently delete staff grade'),
    on2FARequired: () => setShowRequire2FAForceDeleteDialog(true),
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create')
  const [selectedItem, setSelectedItem] = useState<StaffGrade | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedItemForView, setSelectedItemForView] = useState<StaffGrade | null>(null)
  const [sortKey, setSortKey] = useState<'name-asc' | 'name-desc' | 'level-asc' | 'level-desc' | 'sort-asc' | 'sort-desc'>('sort-asc')
  const [searchTerm, setSearchTerm] = useState(filters?.search ?? '')
  const [perPage, setPerPage] = useState(String(filters?.perPage ?? 10))
  const [showDeleted, setShowDeleted] = useState(filters?.show_deleted || false)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const { data, setData, errors, processing, reset, post } = useForm({
    name: '',
    code: '',
    level: 1,
    description: '',
    is_active: true,
    sort_order: 0,
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

  const openModal = (nextMode: 'create' | 'view' | 'edit', item?: StaffGrade) => {
    if (nextMode === 'view') {
      handleViewItem(item)
      return
    }

    setMode(nextMode)
    if (item) {
      setSelectedItem(item)
      setData({
        name: item.name,
        code: item.code || '',
        level: item.level,
        description: item.description || '',
        is_active: item.is_active,
        sort_order: item.sort_order || 0,
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
      ? route('staff-grades.update', { staff_grade: selectedItem!.id })
      : route('staff-grades.store')

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
    router.post(route('staff-grades.restore', id), {}, {
      preserveScroll: true,
      onSuccess: () => triggerFetch({}),
      onError: () => toast.error('Failed to restore staff grade'),
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
    const sortMap: Record<string, { sort_by: string; sort_order: string }> = {
      'name-asc': { sort_by: 'name', sort_order: 'asc' },
      'name-desc': { sort_by: 'name', sort_order: 'desc' },
      'level-asc': { sort_by: 'level', sort_order: 'asc' },
      'level-desc': { sort_by: 'level', sort_order: 'desc' },
      'sort-asc': { sort_by: 'sort_order', sort_order: 'asc' },
      'sort-desc': { sort_by: 'sort_order', sort_order: 'desc' },
    }
    return sortMap[key] || { sort_by: 'sort_order', sort_order: 'asc' }
  }

  const tableData = staffGrades.data.map((item) => ({
    ...item,
    status_label: item.is_active ? 'Active' : 'Inactive',
  }))

  const triggerFetch = (params: Record<string, any> = {}) => {
    const sortParams = getSortParams(sortKey)
    router.get(route('staff-grades.index'), {
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

  const handleSortKeyChange = (value: typeof sortKey) => {
    setSortKey(value)
    const sortParams = getSortParams(value)
    triggerFetch({ sort_by: sortParams.sort_by, sort_order: sortParams.sort_order, page: 1 })
  }

  const from = staffGrades?.from ?? 0
  const total = staffGrades?.total ?? 0
  const currentPage = staffGrades?.meta?.current_page || 1
  const lastPage = staffGrades?.meta?.last_page || 1

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
      <Head title="Staff Grades" />
      <CustomToast />

      <PageLayout
        title="Staff Grades"
        subtitle={showDeleted ? "Viewing deleted staff grades. You can restore or permanently delete them." : "Manage staff grades for administrative positions (e.g., SG-1 to SG-33)."}
        primaryAction={{
          label: 'Add Staff Grade',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => openModal('create'),
          permission: hasPermission(permissions, 'create-staff-grade'),
        }}
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        isSearching={isSearching}
        searchPlaceholder="Search staff grades..."
        perPage={{ value: perPage, onChange: handlePerPageChange }}
        actionsSlot={
          <>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton icon={<ArrowUpDown className="h-4 w-4" />} tooltip="Sort" variant="outline" aria-label="Sort" className="h-9 w-9 rounded-lg" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSortKeyChange('name-asc')}>Name A → Z</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('name-desc')}>Name Z → A</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('level-asc')}>Level Low → High</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('level-desc')}>Level High → Low</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('sort-asc')}>Sort Order Asc</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('sort-desc')}>Sort Order Desc</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {(hasPermission(permissions, 'restore-staff-grade') || hasPermission(permissions, 'force-delete-staff-grade')) && (
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
              <span>Viewing deleted staff grades</span>
            </div>
          </div>
        )}
        <EnterpriseEmployeeTable
          columns={StaffGradeTableConfig.columns}
          actions={StaffGradeTableConfig.actions}
          data={tableData}
          from={staffGrades.from}
          onDelete={handleDelete}
          onView={handleViewItem}
          onEdit={(item) => openModal('edit', item)}
          onRestore={handleRestore}
          onForceDelete={handleForceDelete}
          resourceType="staff-grade"
          enableExpand={false}
          viewMode="table"
        />
      </PageLayout>

      <CustomModalForm
        addButtonWrapperClassName="hidden"
        addButton={{ ...StaffGradeModalFormConfig.addButton, label: '', className: 'h-9 w-9 p-0' }}
        title={mode === 'view' ? 'View Staff Grade' : mode === 'edit' ? 'Update Staff Grade' : StaffGradeModalFormConfig.title}
        description={StaffGradeModalFormConfig.description}
        fields={StaffGradeModalFormConfig.fields}
        buttons={StaffGradeModalFormConfig.buttons}
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
          fields={StaffGradeModalFormConfig.fields}
          titleKey="name"
          subtitleKey="id"
          subtitleLabel="Staff Grade ID"
        />
      )}

      <Require2FAPromptDialog
        open={showRequire2FAForceDeleteDialog}
        onOpenChange={setShowRequire2FAForceDeleteDialog}
        description="To permanently delete staff grades you must enable two-factor authentication (2FA). You can set it up now in just a few steps."
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
