import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'
import { Head, Link, router } from '@inertiajs/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Settings, Users, Calendar, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Admin', href: '#' },
  { title: 'Leave Balance Management', href: '/admin/leave-balances' },
]

interface LeaveType {
  id: number
  name: string
  code: string
  color: string
}

interface Department {
  id: number
  name: string
}

interface Employee {
  id: string
  first_name: string
  middle_name: string | null
  surname: string
  department: Department | null
  position: { title: string } | null
  leave_balances: Record<
    string,
    {
      leave_type_id: number
      entitled: number
      used: number
      balance: number
      is_manually_set: boolean
    }
  >
}

interface PaginatedEmployees {
  data: Employee[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  links: Array<{ url: string | null; label: string; active: boolean }>
}

interface Props {
  employees: PaginatedEmployees
  leaveTypes: LeaveType[]
  departments: Department[]
  year: number
  availableYears: number[]
  filters: {
    search: string | null
    department_id: number | null
  }
}

export default function LeaveBalanceAdminIndex({
  employees,
  leaveTypes,
  departments,
  year,
  availableYears,
  filters,
}: Props) {
  const [search, setSearch] = useState(filters.search || '')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.get(
      '/admin/leave-balances',
      { search, year, department_id: filters.department_id },
      { preserveState: true }
    )
  }

  const handleYearChange = (newYear: string) => {
    router.get(
      '/admin/leave-balances',
      { year: parseInt(newYear), search: filters.search, department_id: filters.department_id },
      { preserveState: true }
    )
  }

  const handleDepartmentChange = (deptId: string) => {
    router.get(
      '/admin/leave-balances',
      {
        year,
        search: filters.search,
        department_id: deptId === 'all' ? null : parseInt(deptId),
      },
      { preserveState: true }
    )
  }

  // Get the main leave types to display (VL, SL, SPL)
  const mainLeaveTypes = leaveTypes.filter((lt) => ['VL', 'SL', 'SPL'].includes(lt.code))

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Leave Balance Management" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">Leave Balance Management</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Set initial balances and manage employee leave credits.
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.total}</div>
              <p className="text-xs text-muted-foreground">Active employees</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leave Types</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leaveTypes.length}</div>
              <p className="text-xs text-muted-foreground">Configured types</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Year</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{year}</div>
              <p className="text-xs text-muted-foreground">Viewing balances for</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
              <p className="text-xs text-muted-foreground">Active departments</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or employee ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" variant="secondary">
                  Search
                </Button>
              </form>
              <Select
                value={filters.department_id?.toString() || 'all'}
                onValueChange={handleDepartmentChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </CardContent>
        </Card>

        {/* Employee Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Leave Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  {mainLeaveTypes.map((lt) => (
                    <TableHead key={lt.id} className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: lt.color }}
                        />
                        {lt.code}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.data.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {employee.surname}, {employee.first_name}{' '}
                          {employee.middle_name ? employee.middle_name.charAt(0) + '.' : ''}
                        </div>
                        <div className="text-sm text-muted-foreground">{employee.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {employee.department?.name || 'N/A'}
                        {employee.position && (
                          <div className="text-muted-foreground">{employee.position.title}</div>
                        )}
                      </div>
                    </TableCell>
                    {mainLeaveTypes.map((lt) => {
                      const balance = employee.leave_balances[lt.code]
                      const balanceValue = balance?.balance ? Number(balance.balance) : 0
                      const entitledValue = balance?.entitled ? Number(balance.entitled) : 0
                      return (
                        <TableCell key={lt.id} className="text-center">
                          <div className="text-lg font-semibold">
                            {balanceValue.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            of {entitledValue.toFixed(1)}
                          </div>
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center">
                      {Object.values(employee.leave_balances).some((b) => b.is_manually_set) ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Migrated
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Auto
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/leave-balances/${employee.id}?year=${year}`}>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {employees.data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No employees found matching your criteria.
              </div>
            )}

            {/* Pagination */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                of {employees.total}
              </span>
              {employees.last_page > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    disabled={employees.current_page === 1}
                    onClick={() => {
                      const prevLink = employees.links.find((l) => l.label === '&laquo; Previous');
                      if (prevLink?.url) router.get(prevLink.url);
                    }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <div className="hidden sm:flex items-center gap-1">
                    {employees.links
                      .filter((l) => l.label !== '&laquo; Previous' && l.label !== 'Next &raquo;')
                      .slice(0, 7)
                      .map((link, index) => (
                        <Button
                          key={index}
                          variant={link.active ? 'default' : 'outline'}
                          size="sm"
                          className="min-w-[32px] h-7 text-xs"
                          disabled={!link.url}
                          onClick={() => link.url && router.get(link.url)}
                          dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                      ))}
                  </div>
                  <div className="flex sm:hidden items-center gap-1 px-2 text-xs">
                    <span className="font-semibold text-foreground">{employees.current_page}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground">{employees.last_page}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    disabled={employees.current_page === employees.last_page}
                    onClick={() => {
                      const nextLink = employees.links.find((l) => l.label === 'Next &raquo;');
                      if (nextLink?.url) router.get(nextLink.url);
                    }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}


