import { useState, useEffect } from 'react'
import { Head, Link } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { PageLayout } from '@/components/page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { CustomTextarea } from '@/components/ui/custom-textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { 
  Briefcase, Building2, GraduationCap, Plus, Star, Trash2, Pencil, 
  TrendingUp, AlertTriangle, ArrowLeft, Calendar,
  ChevronRight, History
} from 'lucide-react'
import { toast } from '@/components/custom-toast'
import axios from 'axios'
import { PromotionModal } from '@/components/employee/PromotionModal'
import { CorrectionModal } from '@/components/employee/CorrectionModal'
import { type BreadcrumbItem } from '@/types'

interface Sector {
  id: number
  name: string
  code?: string | null
}

interface Unit {
  id: number
  name: string
  code: string
  unit_type: string
  sector_id: number
  sector?: { id: number; name: string } | null
}

interface Position {
  id: number
  pos_name: string
  pos_code: string
  authority_level?: number | null
  sector_id?: number | null
  sector?: { id: number; name: string } | null
}

interface AcademicRank {
  id: number
  name: string
  code?: string | null
  level: number
}

interface StaffGrade {
  id: number
  name: string
  code?: string | null
  level: number
}

interface Designation {
  id: number
  employee_id: string
  unit_id: number
  position_id: number
  academic_rank_id?: number | null
  staff_grade_id?: number | null
  is_primary: boolean
  start_date: string
  end_date?: string | null
  remarks?: string | null
  unit?: Unit | null
  position?: Position | null
  academicRank?: AcademicRank | null
  academic_rank?: AcademicRank | null
  staffGrade?: StaffGrade | null
  staff_grade?: StaffGrade | null
}

interface GradeChange {
  id: number
  from_grade_id: number | null
  from_grade_type: 'academic_rank' | 'staff_grade' | null
  to_grade_id: number
  to_grade_type: 'academic_rank' | 'staff_grade'
  change_type: 'promotion' | 'correction'
  effective_date: string
  reason: string | null
  performed_by_employee_id: string | null
  fromGrade?: AcademicRank | StaffGrade | null
  toGrade?: AcademicRank | StaffGrade | null
  performedBy?: { id: string; first_name: string; surname: string } | null
  created_at: string
}

interface Employee {
  id: string
  first_name: string
  surname: string
  middle_name?: string | null
}

interface DesignationsPageProps {
  employee: Employee
  canEdit: boolean
  canPromoteGrade: boolean
  canCorrectGrade: boolean
  sectors: Sector[]
  units: Unit[]
  positions: Position[]
  academicRanks: AcademicRank[]
  staffGrades: StaffGrade[]
  unitPositionWhitelist: Record<string, number[]>
}

export default function DesignationsPage({
  employee,
  canEdit,
  canPromoteGrade,
  canCorrectGrade,
  sectors = [],
  units = [],
  positions = [],
  academicRanks = [],
  staffGrades = [],
  unitPositionWhitelist = {},
}: DesignationsPageProps) {
  const [designations, setDesignations] = useState<Designation[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // Grade change modals
  const [promotionModalOpen, setPromotionModalOpen] = useState(false)
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false)
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null)
  
  // Grade history
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [gradeHistory, setGradeHistory] = useState<GradeChange[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [formData, setFormData] = useState({
    sector_id: '',
    unit_id: '',
    position_id: '',
    academic_rank_id: '',
    staff_grade_id: '',
    is_primary: false,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    remarks: '',
  })

  useEffect(() => {
    loadDesignations()
  }, [employee.id])

  const loadDesignations = async () => {
    try {
      const response = await axios.get(`/employees/${employee.id}/designations`)
      setDesignations(response.data.designations || [])
    } catch (error) {
      console.error('Failed to load designations:', error)
      toast.error('Failed to load designations')
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingDesignation(null)
    setFormData({
      sector_id: '',
      unit_id: '',
      position_id: '',
      academic_rank_id: '',
      staff_grade_id: '',
      is_primary: designations.length === 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      remarks: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (designation: Designation) => {
    setEditingDesignation(designation)
    // When editing, set sector_id from the unit's sector
    const sectorId = designation.unit?.sector_id || designation.unit?.sector?.id || ''
    setFormData({
      sector_id: sectorId ? String(sectorId) : '',
      unit_id: designation.unit_id ? String(designation.unit_id) : '',
      position_id: String(designation.position_id),
      academic_rank_id: designation.academic_rank_id ? String(designation.academic_rank_id) : '',
      staff_grade_id: designation.staff_grade_id ? String(designation.staff_grade_id) : '',
      is_primary: designation.is_primary,
      start_date: designation.start_date ? new Date(designation.start_date).toISOString().split('T')[0] : '',
      end_date: designation.end_date ? new Date(designation.end_date).toISOString().split('T')[0] : '',
      remarks: designation.remarks || '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    // Validate: if sector is selected, unit and position are required
    // If no sector (system-wide position), only position is required
    if (formData.sector_id && (!formData.unit_id || !formData.position_id)) {
      toast.error('Please select a unit and position when a sector is selected')
      return
    }
    
    if (!formData.sector_id && !formData.position_id) {
      toast.error('Please select a position')
      return
    }

    setSubmitting(true)
    try {
      const payload: any = {
        is_primary: formData.is_primary,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        remarks: formData.remarks || null,
      }

      // Only include unit_id if sector is selected
      if (formData.sector_id && formData.unit_id) {
        payload.unit_id = Number(formData.unit_id)
      }

      payload.position_id = Number(formData.position_id)

      // Only include rank/grade when creating NEW designation
      if (!editingDesignation) {
        payload.academic_rank_id = formData.academic_rank_id && formData.academic_rank_id !== '' ? Number(formData.academic_rank_id) : null
        payload.staff_grade_id = formData.staff_grade_id && formData.staff_grade_id !== '' ? Number(formData.staff_grade_id) : null
      }

      if (editingDesignation) {
        await axios.put(`/employees/${employee.id}/designations/${editingDesignation.id}`, payload)
        toast.success('Designation updated successfully')
      } else {
        await axios.post(`/employees/${employee.id}/designations`, payload)
        toast.success('Designation created successfully')
      }

      setModalOpen(false)
      loadDesignations()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save designation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (designation: Designation) => {
    if (!confirm('Are you sure you want to delete this designation?')) return

    try {
      await axios.delete(`/employees/${employee.id}/designations/${designation.id}`)
      toast.success('Designation deleted')
      loadDesignations()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete designation')
    }
  }

  const handleSetPrimary = async (designation: Designation) => {
    try {
      await axios.post(`/employees/${employee.id}/designations/${designation.id}/set-primary`)
      toast.success('Primary designation updated')
      loadDesignations()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to set primary designation')
    }
  }

  const handlePromote = (designation: Designation) => {
    setSelectedDesignation(designation)
    setPromotionModalOpen(true)
  }

  const handleCorrect = (designation: Designation) => {
    setSelectedDesignation(designation)
    setCorrectionModalOpen(true)
  }

  const loadGradeHistory = async (designation: Designation) => {
    setSelectedDesignation(designation)
    setLoadingHistory(true)
    setHistoryModalOpen(true)
    
    try {
      const response = await axios.get(`/employees/${employee.id}/designations/${designation.id}/grade-history`)
      setGradeHistory(response.data.history || [])
    } catch (error) {
      console.error('Failed to load grade history:', error)
      toast.error('Failed to load grade history')
    } finally {
      setLoadingHistory(false)
    }
  }

  // Get filtered units based on selected sector
  const getFilteredUnits = () => {
    if (!formData.sector_id) return []
    return units.filter(u => String(u.sector_id) === String(formData.sector_id))
  }

  // Get filtered positions based on selected unit or system-wide
  const getFilteredPositions = () => {
    // If no sector selected, show only system-wide positions (sector_id is null)
    if (!formData.sector_id) {
      return positions.filter(p => !p.sector_id)
    }
    
    // If sector selected but no unit, return empty (need unit to determine positions)
    if (!formData.unit_id) {
      return []
    }
    
    const selectedUnit = units.find(u => String(u.id) === formData.unit_id)
    if (!selectedUnit) return []

    const whitelist = unitPositionWhitelist[selectedUnit.unit_type] || []
    
    // Filter positions by sector and whitelist
    let filtered = positions.filter(p => p.sector_id && String(p.sector_id) === String(formData.sector_id))
    
    if (whitelist.length > 0) {
      filtered = filtered.filter(p => whitelist.includes(p.id))
    }
    
    return filtered
  }

  // Determine if academic or administrative based on sector
  const selectedSector = sectors.find(s => String(s.id) === String(formData.sector_id))
  const isAcademicSector = selectedSector?.name?.toLowerCase() === 'academic'
  const isAdministrativeSector = selectedSector?.name?.toLowerCase() === 'administrative'

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const isDesignationActive = (designation: Designation) => {
    return !designation.end_date || new Date(designation.end_date) >= new Date()
  }

  const employeeName = `${employee.first_name} ${employee.surname}`
  const pageTitle = `Designations - ${employeeName}`
  
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Employees', href: '/employees' },
    { title: employeeName, href: `/employees/${employee.id}` },
    { title: 'Designations', href: `/employees/${employee.id}/designations/manage` },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={pageTitle} />

      <PageLayout
        title="Employee Designations"
        subtitle={`Manage unit and position designations for ${employeeName}`}
        primaryAction={canEdit ? {
          label: 'Add Designation',
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreateModal,
        } : undefined}
      >
        {/* Designations List */}
        {loading ? (
          <Card>
            <CardContent className="p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-20 bg-muted rounded"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ) : designations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Designations</h3>
              <p className="text-muted-foreground mb-4">
                This employee has no unit designations yet.
              </p>
              {canEdit && (
                <Button onClick={openCreateModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Designation
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {designations.map((designation) => {
              const unit = designation.unit
              const position = designation.position
              const rank = designation.academicRank || designation.academic_rank
              const grade = designation.staffGrade || designation.staff_grade
              const isActive = isDesignationActive(designation)

              return (
                <Card key={designation.id} className={`${designation.is_primary ? 'border-primary border-2' : ''} ${!isActive ? 'opacity-60' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <h3 className="text-lg font-semibold">{position?.pos_name || 'Unknown Position'}</h3>
                          {designation.is_primary && (
                            <Badge variant="default" className="bg-primary">
                              <Star className="h-3 w-3 mr-1" />
                              Primary
                            </Badge>
                          )}
                          {!isActive && (
                            <Badge variant="secondary">Ended</Badge>
                          )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          {unit && (
                            <div className="flex items-start gap-2">
                              <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{unit.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{unit.unit_type}</p>
                              </div>
                            </div>
                          )}

                          {!unit && position && (
                            <div className="flex items-start gap-2">
                              <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">System-Wide Position</p>
                                <p className="text-xs text-muted-foreground">No unit assignment</p>
                              </div>
                            </div>
                          )}

                          {rank && (
                            <div className="flex items-start gap-2">
                              <GraduationCap className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{rank.name}</p>
                                <p className="text-xs text-muted-foreground">Academic Rank</p>
                              </div>
                            </div>
                          )}

                          {grade && (
                            <div className="flex items-start gap-2">
                              <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{grade.name}</p>
                                <p className="text-xs text-muted-foreground">Staff Grade</p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-start gap-2">
                            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {formatDate(designation.start_date)}
                                {designation.end_date && ` - ${formatDate(designation.end_date)}`}
                              </p>
                              <p className="text-xs text-muted-foreground">Duration</p>
                            </div>
                          </div>

                          {position?.authority_level && (
                            <div className="flex items-start gap-2">
                              <TrendingUp className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">Level {position.authority_level}</p>
                                <p className="text-xs text-muted-foreground">Authority Level</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {designation.remarks && (
                          <p className="mt-3 text-sm text-muted-foreground italic">
                            "{designation.remarks}"
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {canEdit && (
                          <>
                            {!designation.is_primary && isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetPrimary(designation)}
                                title="Set as primary"
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(designation)}
                              title="Edit designation"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {/* Grade change buttons */}
                        {(rank || grade) && (
                          <>
                            {canPromoteGrade && isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePromote(designation)}
                                title="Promote grade/rank"
                                className="text-primary border-primary hover:bg-primary/10"
                              >
                                <TrendingUp className="h-4 w-4" />
                              </Button>
                            )}
                            {canCorrectGrade && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCorrect(designation)}
                                title="Correct grade/rank"
                                className="text-amber-600 border-amber-600 hover:bg-amber-50"
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadGradeHistory(designation)}
                              title="View grade history"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(designation)}
                            title="Delete designation"
                            className="text-destructive border-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </PageLayout>

      {/* Create/Edit Designation Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDesignation ? 'Edit Designation' : 'Add Designation'}
            </DialogTitle>
            <DialogDescription>
              {editingDesignation 
                ? 'Update the designation details. Note: Grade/Rank changes must be done via Promotion or Correction.'
                : 'Designate the employee to a unit with a specific position, or assign a system-wide position.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              {/* Sector Selection */}
              <div>
                <Label htmlFor="sector_id">
                  Sector {!editingDesignation && <span className="text-muted-foreground text-xs">(Optional - for system-wide positions)</span>}
                </Label>
                <Select
                  value={formData.sector_id || 'none'}
                  onValueChange={(value) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      sector_id: value === 'none' ? '' : value, 
                      unit_id: '', 
                      position_id: '',
                      academic_rank_id: '',
                      staff_grade_id: ''
                    }))
                  }}
                  disabled={!!editingDesignation}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Sector (or choose System-Wide Position)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">System-Wide Position (No Sector)</SelectItem>
                    {sectors.map((sector) => (
                      <SelectItem key={sector.id} value={String(sector.id)}>
                        {sector.name}
                        {sector.code ? ` (${sector.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select a sector to assign to a unit, or leave empty for system-wide positions.
                </p>
              </div>

              {/* Unit Selection - only show if sector is selected */}
              {formData.sector_id && (
                <div>
                  <Label htmlFor="unit_id">Unit <span className="text-destructive">*</span></Label>
                  <select
                    id="unit_id"
                    value={formData.unit_id}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, unit_id: e.target.value, position_id: '' }))
                    }}
                    disabled={!!editingDesignation && !!editingDesignation.unit_id}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select Unit</option>
                    {(() => {
                      const filteredUnits = getFilteredUnits()
                      const colleges = filteredUnits.filter(u => u.unit_type === 'college')
                      const programs = filteredUnits.filter(u => u.unit_type === 'program')
                      const offices = filteredUnits.filter(u => u.unit_type === 'office')
                      
                      return (
                        <>
                          {colleges.length > 0 && (
                            <optgroup label="Colleges">
                              {colleges.map(unit => (
                                <option key={unit.id} value={String(unit.id)}>
                                  {unit.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {programs.length > 0 && (
                            <optgroup label="Programs">
                              {programs.map(unit => (
                                <option key={unit.id} value={String(unit.id)}>
                                  {unit.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {offices.length > 0 && (
                            <optgroup label="Offices">
                              {offices.map(unit => (
                                <option key={unit.id} value={String(unit.id)}>
                                  {unit.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      )
                    })()}
                  </select>
                </div>
              )}

              {/* Position Selection */}
              <div>
                <Label htmlFor="position_id">Position <span className="text-destructive">*</span></Label>
                <select
                  id="position_id"
                  value={formData.position_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, position_id: e.target.value }))}
                  disabled={formData.sector_id ? !formData.unit_id : false}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {!formData.sector_id 
                      ? 'Select Position (System-Wide)' 
                      : formData.unit_id 
                        ? 'Select Position' 
                        : 'Select Unit first'}
                  </option>
                  {getFilteredPositions().map((position) => (
                    <option key={position.id} value={String(position.id)}>
                      {position.pos_name} {position.authority_level ? `(Level: ${position.authority_level})` : ''}
                      {!formData.sector_id && ' - System-Wide'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rank/Grade - only show when creating, read-only when editing */}
              {editingDesignation ? (
                <>
                  {formData.academic_rank_id && formData.academic_rank_id !== '' && (
                    <div>
                      <Label>Academic Rank (Read-Only)</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="font-medium">
                          {academicRanks.find(r => String(r.id) === formData.academic_rank_id)?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Use Promote or Correct buttons to change grade/rank.
                        </p>
                      </div>
                    </div>
                  )}
                  {formData.staff_grade_id && formData.staff_grade_id !== '' && (
                    <div>
                      <Label>Staff Grade (Read-Only)</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="font-medium">
                          {staffGrades.find(g => String(g.id) === formData.staff_grade_id)?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Use Promote or Correct buttons to change grade/rank.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {isAcademicSector && (
                    <div>
                      <Label htmlFor="academic_rank_id">Academic Rank</Label>
                      <Select
                        value={formData.academic_rank_id || 'none'}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, academic_rank_id: value === 'none' ? '' : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select academic rank (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {academicRanks.map((rank) => (
                            <SelectItem key={rank.id} value={String(rank.id)}>
                              {rank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {isAdministrativeSector && (
                    <div>
                      <Label htmlFor="staff_grade_id">Staff Grade</Label>
                      <Select
                        value={formData.staff_grade_id || 'none'}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, staff_grade_id: value === 'none' ? '' : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff grade (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {staffGrades.map((grade) => (
                            <SelectItem key={grade.id} value={String(grade.id)}>
                              {grade.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.sector_id && !isAcademicSector && !isAdministrativeSector && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block text-muted-foreground">
                        Select Academic or Administrative sector for rank/grade options
                      </Label>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date <span className="text-destructive">*</span></Label>
                  <Input
                    type="date"
                    id="start_date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    type="date"
                    id="end_date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    min={formData.start_date}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_primary"
                  checked={formData.is_primary}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_primary: !!checked }))}
                />
                <Label htmlFor="is_primary" className="cursor-pointer">
                  Set as primary designation
                </Label>
              </div>

              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <CustomTextarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Optional notes about this designation"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingDesignation ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Grade History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Grade/Rank History
            </DialogTitle>
            <DialogDescription>
              Complete history of grade and rank changes for this designation.
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <div className="py-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading history...</p>
            </div>
          ) : gradeHistory.length === 0 ? (
            <div className="py-8 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
              <p className="text-muted-foreground">No grade/rank changes recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {gradeHistory.map((change, index) => {
                const isPromotion = change.change_type === 'promotion'

                return (
                  <div key={change.id} className="relative">
                    {index < gradeHistory.length - 1 && (
                      <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-border" />
                    )}
                    
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isPromotion ? 'bg-primary' : 'bg-amber-500'
                      }`}>
                        {isPromotion ? (
                          <TrendingUp className="h-4 w-4 text-primary-foreground" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-white" />
                        )}
                      </div>

                      <div className="flex-1 p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge variant={isPromotion ? 'default' : 'secondary'}>
                            {isPromotion ? 'Promotion' : 'Correction'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(change.effective_date)}
                          </span>
                        </div>

                        <p className="text-sm">
                          {change.fromGrade ? (
                            <>
                              <span className="text-muted-foreground">{change.fromGrade.name}</span>
                              <ChevronRight className="inline h-4 w-4 mx-1" />
                            </>
                          ) : (
                            <span className="text-muted-foreground">No previous grade → </span>
                          )}
                          <span className="font-medium">{change.toGrade?.name || 'Unknown'}</span>
                        </p>

                        {change.performedBy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            By: {change.performedBy.first_name} {change.performedBy.surname}
                          </p>
                        )}

                        {change.reason && (
                          <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-muted pl-2">
                            {change.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Promotion Modal */}
      {selectedDesignation && (
        <PromotionModal
          open={promotionModalOpen}
          onOpenChange={setPromotionModalOpen}
          employeeId={employee.id}
          designationId={selectedDesignation.id}
          currentGrade={selectedDesignation.academicRank || selectedDesignation.academic_rank || selectedDesignation.staffGrade || selectedDesignation.staff_grade || null}
          gradeType={selectedDesignation.academicRank || selectedDesignation.academic_rank ? 'academic_rank' : 'staff_grade'}
          onSuccess={loadDesignations}
        />
      )}

      {/* Correction Modal */}
      {selectedDesignation && (
        <CorrectionModal
          open={correctionModalOpen}
          onOpenChange={setCorrectionModalOpen}
          employeeId={employee.id}
          designationId={selectedDesignation.id}
          currentGrade={selectedDesignation.academicRank || selectedDesignation.academic_rank || selectedDesignation.staffGrade || selectedDesignation.staff_grade || null}
          gradeType={selectedDesignation.academicRank || selectedDesignation.academic_rank ? 'academic_rank' : 'staff_grade'}
          onSuccess={loadDesignations}
        />
      )}
    </AppLayout>
  )
}
