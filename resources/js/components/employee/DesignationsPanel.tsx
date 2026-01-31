import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { CustomTextarea } from '@/components/ui/custom-textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Briefcase, Building2, GraduationCap, Plus, Star, Trash2, Pencil, AlertCircle, TrendingUp, AlertTriangle } from 'lucide-react'
import { toast } from '@/components/custom-toast'
import axios from 'axios'
import { PromotionModal } from './PromotionModal'
import { CorrectionModal } from './CorrectionModal'
import { GradeHistoryPanel } from './GradeHistoryPanel'

interface Unit {
  id: number
  name: string
  code?: string | null
  unit_type: 'college' | 'program' | 'office'
  sector_id: number
  sector?: { id: number; name: string } | null
}

interface Position {
  id: number
  pos_code: string
  pos_name: string
  sector_id?: number | null
  sector?: { id: number; name: string } | null
  authority_level?: number | null
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

interface DesignationsPanelProps {
  employeeId: string
  canEdit?: boolean
  canPromote?: boolean
  canCorrect?: boolean
  onDesignationChange?: () => void
}

export function DesignationsPanel({ 
  employeeId, 
  canEdit = false, 
  canPromote = false,
  canCorrect = false,
  onDesignationChange 
}: DesignationsPanelProps) {
  const [designations, setDesignations] = useState<Designation[]>([])
  const [primaryDesignationId, setPrimaryDesignationId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null)
  const [formOptions, setFormOptions] = useState<{
    units: Unit[]
    positions: Position[]
    academicRanks: AcademicRank[]
    staffGrades: StaffGrade[]
    unitPositionWhitelist: Record<string, number[]>
  }>({
    units: [],
    positions: [],
    academicRanks: [],
    staffGrades: [],
    unitPositionWhitelist: {},
  })

  const [formData, setFormData] = useState({
    unit_id: '',
    position_id: '',
    academic_rank_id: '',
    staff_grade_id: '',
    is_primary: false,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    remarks: '',
  })

  const [submitting, setSubmitting] = useState(false)
  
  // Promotion/Correction modal states
  const [promotionModalOpen, setPromotionModalOpen] = useState(false)
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false)
  const [selectedDesignationForGradeChange, setSelectedDesignationForGradeChange] = useState<Designation | null>(null)
  const [expandedDesignations, setExpandedDesignations] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (employeeId && employeeId !== 'my-profile') {
      loadDesignations()
      loadFormOptions()
    }
  }, [employeeId])

  const loadDesignations = async () => {
    if (!employeeId || employeeId === 'my-profile') {
      console.error('Cannot load designations: invalid employeeId')
      return
    }
    try {
      const response = await axios.get(`/employees/${employeeId}/designations`)
      setDesignations(response.data.designations || [])
      setPrimaryDesignationId(response.data.primary_designation_id)
    } catch (error) {
      console.error('Failed to load designations:', error)
      toast.error('Failed to load designations')
    } finally {
      setLoading(false)
    }
  }

  const loadFormOptions = async () => {
    if (!employeeId || employeeId === 'my-profile') {
      console.error('Cannot load form options: invalid employeeId')
      return
    }
    try {
      const response = await axios.get(`/employees/${employeeId}/designations/form-options`)
      setFormOptions(response.data)
    } catch (error) {
      console.error('Failed to load form options:', error)
    }
  }

  const openCreateModal = () => {
    setEditingDesignation(null)
    setFormData({
      unit_id: '',
      position_id: '',
      academic_rank_id: 'none',
      staff_grade_id: 'none',
      is_primary: designations.length === 0, // Default to primary if no designations
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      remarks: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (designation: Designation) => {
    setEditingDesignation(designation)
    setFormData({
      unit_id: String(designation.unit_id),
      position_id: String(designation.position_id),
      academic_rank_id: designation.academic_rank_id ? String(designation.academic_rank_id) : 'none',
      staff_grade_id: designation.staff_grade_id ? String(designation.staff_grade_id) : 'none',
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

    // Validate end_date
    if (formData.end_date && formData.start_date) {
      const startDate = new Date(formData.start_date)
      const endDate = new Date(formData.end_date)
      
      if (endDate < startDate) {
        toast.error('End date must be after start date')
        return
      }
      
      // Prevent setting end date in the past for new assignments
      if (!editingAssignment && endDate < new Date()) {
        toast.error('End date cannot be in the past for new assignments')
        return
      }
    }

    if (!employeeId || employeeId === 'my-profile') {
      toast.error('Invalid employee ID')
      return
    }

    setSubmitting(true)
    try {
      // When editing, DO NOT include rank/grade - they are managed via Promotion/Correction
      const payload: any = {
        unit_id: Number(formData.unit_id),
        position_id: Number(formData.position_id),
        is_primary: formData.is_primary,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        remarks: formData.remarks || null,
      }

      // Only include rank/grade when creating NEW designation
      if (!editingDesignation) {
        payload.academic_rank_id = formData.academic_rank_id && formData.academic_rank_id !== 'none' ? Number(formData.academic_rank_id) : null
        payload.staff_grade_id = formData.staff_grade_id && formData.staff_grade_id !== 'none' ? Number(formData.staff_grade_id) : null
      }
      // When editing, rank/grade are explicitly excluded - backend will preserve current values

      if (editingDesignation) {
        const url = `/employees/${employeeId}/designations/${editingDesignation.id}`
        console.log('Updating designation:', { url, employeeId, designationId: editingDesignation.id, payload })
        await axios.put(url, payload)
        toast.success('Designation updated successfully')
      } else {
        const url = `/employees/${employeeId}/designations`
        console.log('Creating designation:', { url, employeeId, payload })
        await axios.post(url, payload)
        toast.success('Designation created successfully')
      }

      setModalOpen(false)
      loadDesignations()
      onDesignationChange?.()
    } catch (error: any) {
      console.error('Designation save error:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        request: error.request,
        config: error.config,
        employeeId,
        editingAssignment: editingAssignment?.id
      })
      
      // Handle different error types
      if (error.response) {
        // Server responded with error status
        const message = error.response.data?.message || 
                       error.response.data?.errors?.position_id?.[0] || 
                       error.response.statusText || 
                       `Server error: ${error.response.status}`
        toast.error(message)
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received:', error.request)
        toast.error('Network error: No response from server. Please check your connection.')
      } else {
        // Something else happened
        toast.error(error.message || 'Failed to save assignment')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (designation: Designation) => {
    if (!confirm('Are you sure you want to delete this designation?')) return

    if (!employeeId || employeeId === 'my-profile') {
      toast.error('Invalid employee ID')
      return
    }

    try {
      await axios.delete(`/employees/${employeeId}/designations/${designation.id}`)
      toast.success('Designation deleted successfully')
      loadDesignations()
      onDesignationChange?.()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete designation')
    }
  }

  const handleSetPrimary = async (designation: Designation) => {
    if (!employeeId || employeeId === 'my-profile') {
      toast.error('Invalid employee ID')
      return
    }

    try {
      await axios.post(`/employees/${employeeId}/designations/${designation.id}/set-primary`)
      toast.success('Primary designation updated')
      loadDesignations()
      onDesignationChange?.()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to set primary designation')
    }
  }

  const handlePromote = (designation: Designation) => {
    setSelectedDesignationForGradeChange(designation)
    setPromotionModalOpen(true)
  }

  const handleCorrect = (designation: Designation) => {
    setSelectedDesignationForGradeChange(designation)
    setCorrectionModalOpen(true)
  }

  const handleGradeChangeSuccess = () => {
    loadDesignations()
    onDesignationChange?.()
  }

  const toggleDesignationExpanded = (designationId: number) => {
    setExpandedDesignations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(designationId)) {
        newSet.delete(designationId)
      } else {
        newSet.add(designationId)
      }
      return newSet
    })
  }

  // Get filtered positions based on selected unit type
  const getFilteredPositions = () => {
    if (!formData.unit_id) return formOptions.positions

    const selectedUnit = formOptions.units.find(u => String(u.id) === formData.unit_id)
    if (!selectedUnit) return formOptions.positions

    const whitelist = formOptions.unitPositionWhitelist[selectedUnit.unit_type]
    if (!whitelist || whitelist.length === 0) {
      // No whitelist for this unit type, show all positions
      return formOptions.positions
    }

    return formOptions.positions.filter(p => whitelist.includes(p.id))
  }

  // Determine if academic rank or staff grade should be shown
  const selectedUnit = formOptions.units.find(u => String(u.id) === formData.unit_id)
  const isAcademicUnit = selectedUnit?.sector?.name?.toLowerCase().includes('academic') || selectedUnit?.unit_type === 'college' || selectedUnit?.unit_type === 'program'

  // Validate employeeId before rendering
  if (!employeeId || employeeId === 'my-profile' || typeof employeeId !== 'string' || employeeId.trim() === '') {
    return (
      <Card className="p-4">
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Invalid employee ID. Please refresh the page.</p>
        </div>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Designations
          </h3>
          <p className="text-sm text-muted-foreground">
            Employee unit and position designations
          </p>
        </div>
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Designation
          </Button>
        )}
      </div>

      {designations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No designations yet</p>
          {canEdit && (
            <Button type="button" variant="link" onClick={openCreateModal}>
              Add the first designation
            </Button>
          )}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
        <div className="space-y-3">
          {designations.map((designation) => {
            const unit = designation.unit
            const position = designation.position
            const rank = designation.academicRank || designation.academic_rank
            const grade = designation.staffGrade || designation.staff_grade

            return (
              <div
                key={designation.id}
                className={`p-3 rounded-lg border ${designation.is_primary ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{position?.pos_name || 'Unknown Position'}</span>
                      {designation.is_primary && (
                        <Badge variant="default" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span>{unit?.name || 'Unknown Unit'}</span>
                        <Badge variant="outline" className="text-xs ml-1 capitalize">
                          {unit?.unit_type}
                        </Badge>
                      </div>
                      {rank && (
                        <div className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          <span>Rank: {rank.name}</span>
                        </div>
                      )}
                      {grade && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          <span>Grade: {grade.name}</span>
                        </div>
                      )}
                      {position?.authority_level && (
                        <div className="text-xs">
                          Authority Level: {position.authority_level}
                        </div>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {!designation.is_primary && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetPrimary(designation)}
                          title="Set as primary"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(designation)}
                        title="Edit designation"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {/* Promote/Correct buttons - only show if designation has a rank/grade and user has permissions */}
                      {(rank || grade) && (
                        <>
                          {canPromote && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePromote(designation)}
                              title="Promote grade/rank"
                              className="text-primary hover:text-primary"
                              disabled={designation.end_date && new Date(designation.end_date) < new Date()}
                            >
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                          )}
                          {canCorrect && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCorrect(designation)}
                              title="Correct/adjust grade/rank"
                              className="text-amber-600 hover:text-amber-700"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(designation)}
                        title="Delete designation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Grade History Panel - show when expanded */}
                {(rank || grade) && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDesignationExpanded(designation.id)}
                      className="w-full justify-start text-xs"
                    >
                      {expandedDesignations.has(designation.id) ? 'Hide' : 'Show'} Grade/Rank History
                    </Button>
                    {expandedDesignations.has(designation.id) && (
                      <div className="mt-2">
                        <GradeHistoryPanel 
                          employeeId={employeeId} 
                          designationId={designation.id} 
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        </div>
      )}

      {/* Promotion Modal */}
      {selectedDesignationForGradeChange && (
        <PromotionModal
          open={promotionModalOpen}
          onOpenChange={setPromotionModalOpen}
          employeeId={employeeId}
          designationId={selectedDesignationForGradeChange.id}
          currentGrade={selectedDesignationForGradeChange.academicRank || selectedDesignationForGradeChange.academic_rank || selectedDesignationForGradeChange.staffGrade || selectedDesignationForGradeChange.staff_grade || null}
          gradeType={selectedDesignationForGradeChange.academicRank || selectedDesignationForGradeChange.academic_rank ? 'academic_rank' : 'staff_grade'}
          onSuccess={handleGradeChangeSuccess}
        />
      )}

      {/* Correction Modal */}
      {selectedDesignationForGradeChange && (
        <CorrectionModal
          open={correctionModalOpen}
          onOpenChange={setCorrectionModalOpen}
          employeeId={employeeId}
          designationId={selectedDesignationForGradeChange.id}
          currentGrade={selectedDesignationForGradeChange.academicRank || selectedDesignationForGradeChange.academic_rank || selectedDesignationForGradeChange.staffGrade || selectedDesignationForGradeChange.staff_grade || null}
          gradeType={selectedDesignationForGradeChange.academicRank || selectedDesignationForGradeChange.academic_rank ? 'academic_rank' : 'staff_grade'}
          onSuccess={handleGradeChangeSuccess}
        />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[830px] max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDesignation ? 'Edit Designation' : 'Add Designation'}
            </DialogTitle>
            <DialogDescription>
              Designate the employee to a unit with a specific position.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="unit_id">Unit <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.unit_id}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, unit_id: value, position_id: '' }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {formOptions.units.map((unit) => (
                      <SelectItem key={unit.id} value={String(unit.id)}>
                        {unit.name} ({unit.unit_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="position_id">Position <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.position_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, position_id: value }))}
                  disabled={!formData.unit_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.unit_id ? "Select position" : "Select unit first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredPositions().map((position) => (
                      <SelectItem key={position.id} value={String(position.id)}>
                        {position.pos_name} {position.authority_level ? `(Authority: ${position.authority_level})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rank/Grade fields - READ-ONLY when editing, editable when creating */}
              {editingDesignation ? (
                <>
                  {isAcademicUnit && formData.academic_rank_id && formData.academic_rank_id !== 'none' && (
                    <div>
                      <Label htmlFor="academic_rank_id">Academic Rank (Read-Only)</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border border-border">
                        <p className="text-sm font-medium">
                          {formOptions.academicRanks.find(r => String(r.id) === formData.academic_rank_id)?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Rank/Grade changes must be done via Promotion or Correction workflow. Use the Promote/Correct buttons.
                        </p>
                      </div>
                    </div>
                  )}
                  {!isAcademicUnit && formData.staff_grade_id && formData.staff_grade_id !== 'none' && (
                    <div>
                      <Label htmlFor="staff_grade_id">Staff Grade (Read-Only)</Label>
                      <div className="p-3 bg-muted/50 rounded-lg border border-border">
                        <p className="text-sm font-medium">
                          {formOptions.staffGrades.find(g => String(g.id) === formData.staff_grade_id)?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Rank/Grade changes must be done via Promotion or Correction workflow. Use the Promote/Correct buttons.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {isAcademicUnit && (
                    <div>
                      <Label htmlFor="academic_rank_id">Academic Rank</Label>
                      <Select
                        value={formData.academic_rank_id || undefined}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, academic_rank_id: value === 'none' ? '' : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select academic rank (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {formOptions.academicRanks.map((rank) => (
                            <SelectItem key={rank.id} value={String(rank.id)}>
                              {rank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {!isAcademicUnit && (
                    <div>
                      <Label htmlFor="staff_grade_id">Staff Grade</Label>
                      <Select
                        value={formData.staff_grade_id || undefined}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, staff_grade_id: value === 'none' ? '' : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff grade (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {formOptions.staffGrades.map((grade) => (
                            <SelectItem key={grade.id} value={String(grade.id)}>
                              {grade.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_primary"
                  checked={formData.is_primary}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_primary: !!checked }))}
                />
                <Label htmlFor="is_primary" className="text-sm font-normal">
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
                {submitting ? 'Saving...' : (editingDesignation ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
