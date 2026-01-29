import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'
import { Head, router } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Calendar,
  Gift,
  History,
  Plus,
  Minus,
  Settings,
  FileText,
  User,
  Building,
  Briefcase,
} from 'lucide-react'
import { useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'

interface LeaveType {
  id: number
  name: string
  code: string
  color: string
  max_days_per_year: number | null
  is_special_leave: boolean
  gender_restriction: string
}

interface LeaveBalance {
  id: number
  entitled: number
  used: number
  pending: number
  balance: number
  accrued: number
  initial_balance: number
  carried_over: number
  is_manually_set: boolean
  balance_as_of_date: string | null
  migration_notes: string | null
}

interface BalanceItem {
  leave_type: LeaveType
  balance: LeaveBalance
  is_available: boolean
}

interface HistoryItem {
  id: number
  amount: number
  accrual_date: string
  accrual_type: string
  accrual_type_label: string
  notes: string | null
  supporting_document: string | null
  reference_number: string | null
  leave_type: LeaveType
  creator: { name: string } | null
  created_at: string
}

interface Employee {
  id: string
  first_name: string
  middle_name: string | null
  surname: string
  primary_designation?: {
    unit?: { name: string }
    position?: { pos_name: string }
  } | null
}

interface Props {
  employee: Employee
  balances: BalanceItem[]
  history: HistoryItem[]
  specialGrants: Array<{
    leave_type: string
    leave_type_code: string
    total_granted: number
    grants: Array<{
      amount: number
      date: string
      reason: string
      document: string | null
      reference: string | null
    }>
  }>
  year: number
  availableYears: number[]
  accrualTypes: Record<string, string>
}

export default function LeaveBalanceShow({
  employee,
  balances,
  history,
  specialGrants,
  year,
  availableYears,
  accrualTypes,
}: Props) {
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null)
  const [isInitialBalanceOpen, setIsInitialBalanceOpen] = useState(false)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const [isSpecialGrantOpen, setIsSpecialGrantOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Form states
  const [initialBalanceForm, setInitialBalanceForm] = useState({
    leave_type_id: '',
    balance: '',
    used_to_date: '',
    notes: '',
    as_of_date: new Date().toISOString().split('T')[0],
  })

  const [adjustmentForm, setAdjustmentForm] = useState({
    leave_type_id: '',
    amount: '',
    reason: '',
    adjustment_type: 'adjustment',
  })

  const [specialGrantForm, setSpecialGrantForm] = useState({
    leave_type_id: '',
    days: '',
    reason: '',
    supporting_document: '',
  })

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Leave Balance Management', href: '/admin/leave-balances' },
    {
      title: `${employee.surname}, ${employee.first_name}`,
      href: `/admin/leave-balances/${employee.id}`,
    },
  ]

  const handleYearChange = (newYear: string) => {
    router.get(`/admin/leave-balances/${employee.id}`, { year: parseInt(newYear) }, { preserveState: true })
  }

  const handleSetInitialBalance = async () => {
    setIsLoading(true)
    try {
      const response = await axios.post(`/admin/leave-balances/${employee.id}/initial-balance`, {
        ...initialBalanceForm,
        leave_type_id: parseInt(initialBalanceForm.leave_type_id),
        balance: parseFloat(initialBalanceForm.balance),
        used_to_date: initialBalanceForm.used_to_date ? parseFloat(initialBalanceForm.used_to_date) : 0,
        year,
      })

      if (response.data.success) {
        toast.success(response.data.message)
        setIsInitialBalanceOpen(false)
        setInitialBalanceForm({
          leave_type_id: '',
          balance: '',
          used_to_date: '',
          notes: '',
          as_of_date: new Date().toISOString().split('T')[0],
        })
        router.reload()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to set initial balance')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdjustBalance = async () => {
    setIsLoading(true)
    try {
      const response = await axios.post(`/admin/leave-balances/${employee.id}/adjust`, {
        ...adjustmentForm,
        leave_type_id: parseInt(adjustmentForm.leave_type_id),
        amount: parseFloat(adjustmentForm.amount),
        year,
      })

      if (response.data.success) {
        toast.success(response.data.message)
        setIsAdjustmentOpen(false)
        setAdjustmentForm({
          leave_type_id: '',
          amount: '',
          reason: '',
          adjustment_type: 'adjustment',
        })
        router.reload()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to adjust balance')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGrantSpecialLeave = async () => {
    setIsLoading(true)
    try {
      const response = await axios.post(`/admin/leave-balances/${employee.id}/grant-special`, {
        ...specialGrantForm,
        leave_type_id: parseInt(specialGrantForm.leave_type_id),
        days: parseFloat(specialGrantForm.days),
        year,
      })

      if (response.data.success) {
        toast.success(response.data.message)
        setIsSpecialGrantOpen(false)
        setSpecialGrantForm({
          leave_type_id: '',
          days: '',
          reason: '',
          supporting_document: '',
        })
        router.reload()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to grant special leave')
    } finally {
      setIsLoading(false)
    }
  }

  // Get special leave types for the grant dialog
  const specialLeaveTypes = balances
    .filter((b) => b.leave_type.is_special_leave && b.is_available)
    .map((b) => b.leave_type)

  // Get regular leave types for initial balance and adjustment
  const regularLeaveTypes = balances.filter((b) => b.is_available).map((b) => b.leave_type)

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Manage Leave - ${employee.surname}, ${employee.first_name}`} />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.get('/admin/leave-balances')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {employee.surname}, {employee.first_name}{' '}
                {employee.middle_name ? employee.middle_name.charAt(0) + '.' : ''}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {employee.id}
                </span>
                {employee.primary_designation?.unit && (
                  <span className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    {employee.primary_designation.unit.name}
                  </span>
                )}
                {employee.primary_designation?.position?.pos_name && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {employee.primary_designation.position.pos_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={year.toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Dialog open={isInitialBalanceOpen} onOpenChange={setIsInitialBalanceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Set Initial Balance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Set Initial Balance</DialogTitle>
                <DialogDescription>
                  Set the opening balance for a long-time employee when migrating from an old system.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <Select
                    value={initialBalanceForm.leave_type_id}
                    onValueChange={(v) =>
                      setInitialBalanceForm({ ...initialBalanceForm, leave_type_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {regularLeaveTypes.map((lt) => (
                        <SelectItem key={lt.id} value={lt.id.toString()}>
                          {lt.name} ({lt.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Current Balance</Label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="e.g., 45.5"
                      value={initialBalanceForm.balance}
                      onChange={(e) =>
                        setInitialBalanceForm({ ...initialBalanceForm, balance: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Already Used (Optional)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="e.g., 10"
                      value={initialBalanceForm.used_to_date}
                      onChange={(e) =>
                        setInitialBalanceForm({ ...initialBalanceForm, used_to_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>As of Date</Label>
                  <Input
                    type="date"
                    value={initialBalanceForm.as_of_date}
                    onChange={(e) =>
                      setInitialBalanceForm({ ...initialBalanceForm, as_of_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="e.g., Migrated from manual records"
                    value={initialBalanceForm.notes}
                    onChange={(e) =>
                      setInitialBalanceForm({ ...initialBalanceForm, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInitialBalanceOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSetInitialBalance} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Set Balance'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Adjust Balance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adjust Leave Balance</DialogTitle>
                <DialogDescription>
                  Add or deduct leave credits. Use negative values to deduct.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <Select
                    value={adjustmentForm.leave_type_id}
                    onValueChange={(v) => setAdjustmentForm({ ...adjustmentForm, leave_type_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {regularLeaveTypes.map((lt) => (
                        <SelectItem key={lt.id} value={lt.id.toString()}>
                          {lt.name} ({lt.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (days)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="e.g., 5 or -2"
                    value={adjustmentForm.amount}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use positive values to add, negative to deduct
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Adjustment Type</Label>
                  <Select
                    value={adjustmentForm.adjustment_type}
                    onValueChange={(v) =>
                      setAdjustmentForm({ ...adjustmentForm, adjustment_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adjustment">Balance Adjustment</SelectItem>
                      <SelectItem value="correction">Correction</SelectItem>
                      <SelectItem value="restored">Restored Credits</SelectItem>
                      <SelectItem value="forfeited">Forfeited Credits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    placeholder="Explain the reason for this adjustment"
                    value={adjustmentForm.reason}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAdjustmentOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdjustBalance} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Apply Adjustment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isSpecialGrantOpen} onOpenChange={setIsSpecialGrantOpen}>
            <DialogTrigger asChild>
              <Button>
                <Gift className="h-4 w-4 mr-2" />
                Grant Special Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Grant Special Leave</DialogTitle>
                <DialogDescription>
                  Grant special leave credits (Maternity, Paternity, Solo Parent, etc.)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <Select
                    value={specialGrantForm.leave_type_id}
                    onValueChange={(v) =>
                      setSpecialGrantForm({ ...specialGrantForm, leave_type_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select special leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialLeaveTypes.length > 0 ? (
                        specialLeaveTypes.map((lt) => (
                          <SelectItem key={lt.id} value={lt.id.toString()}>
                            {lt.name} ({lt.code})
                            {lt.max_days_per_year && ` - Max ${lt.max_days_per_year} days/year`}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No special leave types available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Days to Grant</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    placeholder="e.g., 105"
                    value={specialGrantForm.days}
                    onChange={(e) =>
                      setSpecialGrantForm({ ...specialGrantForm, days: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    placeholder="e.g., Maternity leave per RA 11210"
                    value={specialGrantForm.reason}
                    onChange={(e) =>
                      setSpecialGrantForm({ ...specialGrantForm, reason: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Supporting Document (Optional)</Label>
                  <Input
                    placeholder="e.g., Medical Certificate dated 2026-01-05"
                    value={specialGrantForm.supporting_document}
                    onChange={(e) =>
                      setSpecialGrantForm({ ...specialGrantForm, supporting_document: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSpecialGrantOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGrantSpecialLeave} disabled={isLoading}>
                  {isLoading ? 'Granting...' : 'Grant Leave'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="balances" className="space-y-4">
          <TabsList>
            <TabsTrigger value="balances">
              <Calendar className="h-4 w-4 mr-2" />
              Current Balances
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Adjustment History
            </TabsTrigger>
            <TabsTrigger value="special">
              <Gift className="h-4 w-4 mr-2" />
              Special Grants
            </TabsTrigger>
          </TabsList>

          <TabsContent value="balances">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {balances.map((item) => (
                <Card
                  key={item.leave_type.id}
                  className={`relative overflow-hidden ${!item.is_available ? 'opacity-50' : ''}`}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: item.leave_type.color }}
                  />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{item.leave_type.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {item.balance.is_manually_set && (
                          <Badge variant="outline" className="text-xs">
                            Migrated
                          </Badge>
                        )}
                        <Badge
                          style={{
                            backgroundColor: item.is_available ? item.leave_type.color : undefined,
                          }}
                        >
                          {item.leave_type.code}
                        </Badge>
                      </div>
                    </div>
                    {!item.is_available && (
                      <CardDescription className="text-amber-600">
                        Not available for this employee
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center py-2">
                      <div className="text-4xl font-bold" style={{ color: item.leave_type.color }}>
                        {Number(item.balance.balance || 0).toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Available Days</div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entitled:</span>
                        <span className="font-medium">{Number(item.balance.entitled || 0).toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Used:</span>
                        <span className="font-medium">{Number(item.balance.used || 0).toFixed(1)}</span>
                      </div>
                      {Number(item.balance.pending || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pending:</span>
                          <span className="font-medium text-amber-600">
                            {Number(item.balance.pending || 0).toFixed(1)}
                          </span>
                        </div>
                      )}
                      {Number(item.balance.initial_balance || 0) > 0 && (
                        <div className="flex justify-between text-xs border-t pt-1 mt-1">
                          <span className="text-muted-foreground">Initial Balance:</span>
                          <span>{Number(item.balance.initial_balance || 0).toFixed(1)}</span>
                        </div>
                      )}
                      {Number(item.balance.carried_over || 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Carried Over:</span>
                          <span>{Number(item.balance.carried_over || 0).toFixed(1)}</span>
                        </div>
                      )}
                      {Number(item.balance.accrued || 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Accrued:</span>
                          <span>{Number(item.balance.accrued || 0).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Adjustment History</CardTitle>
                <CardDescription>
                  All leave credit changes for {year}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {history.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(item.accrual_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              style={{ borderColor: item.leave_type.color, color: item.leave_type.color }}
                            >
                              {item.leave_type.code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.accrual_type_label}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={item.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {item.amount >= 0 ? '+' : ''}
                              {Number(item.amount || 0).toFixed(1)}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={item.notes || ''}>
                            {item.notes || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.reference_number || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.creator?.name || 'System'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No adjustment history for {year}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="special">
            <Card>
              <CardHeader>
                <CardTitle>Special Leave Grants</CardTitle>
                <CardDescription>
                  Special leaves granted in {year} (Maternity, Paternity, Solo Parent, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {specialGrants.length > 0 ? (
                  <div className="space-y-4">
                    {specialGrants.map((grant, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              {grant.leave_type} ({grant.leave_type_code})
                            </CardTitle>
                            <Badge variant="outline">
                              Total: {Number(grant.total_granted || 0).toFixed(1)} days
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Days</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Document</TableHead>
                                <TableHead>Reference</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {grant.grants.map((g, gIndex) => (
                                <TableRow key={gIndex}>
                                  <TableCell>{new Date(g.date).toLocaleDateString()}</TableCell>
                                  <TableCell className="text-right font-medium text-green-600">
                                    +{Number(g.amount || 0).toFixed(1)}
                                  </TableCell>
                                  <TableCell>{g.reason}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {g.document || '-'}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {g.reference || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No special leave grants for {year}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}


