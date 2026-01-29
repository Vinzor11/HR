import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CustomTextarea } from '@/components/ui/custom-textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, Award, Plus, Calendar, User, FileText, ArrowRight, GraduationCap, Briefcase } from 'lucide-react'
import { toast } from '@/components/custom-toast'
import axios from 'axios'

interface StaffGrade {
  id: number
  name: string
  code?: string | null
  level: number
}

interface AcademicRank {
  id: number
  name: string
  code?: string | null
  level: number
}

interface Employee {
  id: string
  first_name: string
  surname: string
}

interface StaffPromotion {
  id: number
  employee_id: string
  from_staff_grade_id?: number | null
  to_staff_grade_id: number
  effective_date: string
  promoted_by?: string | null
  remarks?: string | null
  document_ref?: string | null
  fromStaffGrade?: StaffGrade | null
  from_staff_grade?: StaffGrade | null
  toStaffGrade?: StaffGrade | null
  to_staff_grade?: StaffGrade | null
  promotedBy?: Employee | null
  promoted_by_employee?: Employee | null
}

interface RankPromotion {
  id: number
  employee_id: string
  from_academic_rank_id?: number | null
  to_academic_rank_id: number
  effective_date: string
  promoted_by?: string | null
  remarks?: string | null
  document_ref?: string | null
  fromAcademicRank?: AcademicRank | null
  from_academic_rank?: AcademicRank | null
  toAcademicRank?: AcademicRank | null
  to_academic_rank?: AcademicRank | null
  promotedBy?: Employee | null
  promoted_by_employee?: Employee | null
}

interface PromotionsPanelProps {
  employeeId: string
  canPromote?: boolean
  onPromotionChange?: () => void
}

interface EmployeeDesignation {
  id: number
  unit?: {
    id: number
    name: string
    sector?: {
      id: number
      name: string
    } | null
  } | null
}

export function PromotionsPanel({ employeeId, canPromote = false, onPromotionChange }: PromotionsPanelProps) {
  const [staffPromotions, setStaffPromotions] = useState<StaffPromotion[]>([])
  const [rankPromotions, setRankPromotions] = useState<RankPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'staff' | 'rank'>('staff')
  const [modalOpen, setModalOpen] = useState(false)
  const [promotionType, setPromotionType] = useState<'staff' | 'rank'>('staff')
  const [designations, setDesignations] = useState<EmployeeDesignation[]>([])
  const [hasAdministrativeSector, setHasAdministrativeSector] = useState(false)
  const [hasAcademicSector, setHasAcademicSector] = useState(false)
  
  const [staffFormOptions, setStaffFormOptions] = useState<{
    staffGrades: StaffGrade[]
    currentGrade: StaffGrade | null
  }>({
    staffGrades: [],
    currentGrade: null,
  })

  const [rankFormOptions, setRankFormOptions] = useState<{
    academicRanks: AcademicRank[]
    currentRank: AcademicRank | null
  }>({
    academicRanks: [],
    currentRank: null,
  })

  const [formData, setFormData] = useState({
    to_staff_grade_id: '',
    to_academic_rank_id: '',
    effective_date: new Date().toISOString().split('T')[0],
    remarks: '',
    document_ref: '',
  })

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadPromotions()
    loadDesignations()
  }, [employeeId])

  const loadDesignations = async () => {
    try {
      const response = await axios.get(`/employees/${employeeId}/designations`).catch(() => ({ data: { designations: [] } }))
      const employeeDesignations = response.data.designations || response.data || []
      setDesignations(employeeDesignations)
      
      // Check if employee has designations in Administrative or Academic sectors
      const hasAdmin = employeeDesignations.some((d: EmployeeDesignation) => 
        d.unit?.sector?.name === 'Administrative' || d.unit?.sector?.name?.toLowerCase() === 'administrative'
      )
      const hasAcademic = employeeDesignations.some((d: EmployeeDesignation) => 
        d.unit?.sector?.name === 'Academic' || d.unit?.sector?.name?.toLowerCase() === 'academic'
      )
      
      setHasAdministrativeSector(hasAdmin)
      setHasAcademicSector(hasAcademic)
      
      // Set default active tab based on available sectors
      if (hasAdmin && !hasAcademic) {
        setActiveTab('staff')
      } else if (hasAcademic && !hasAdmin) {
        setActiveTab('rank')
      } else if (hasAdmin && hasAcademic) {
        // If both, default to staff but user can switch
        setActiveTab('staff')
      } else {
        // If no designations found or can't determine, show both (fallback)
        setHasAdministrativeSector(true)
        setHasAcademicSector(true)
      }
    } catch (error) {
      console.error('Failed to load designations:', error)
      // Default to showing both if we can't determine (fallback for backward compatibility)
      setHasAdministrativeSector(true)
      setHasAcademicSector(true)
    }
  }

  const loadPromotions = async () => {
    try {
      const [staffResponse, rankResponse] = await Promise.all([
        axios.get(`/employees/${employeeId}/promotions`).catch(() => ({ data: { promotions: [] } })),
        axios.get(`/employees/${employeeId}/rank-promotions`).catch(() => ({ data: { rankPromotions: [] } }))
      ])
      setStaffPromotions(staffResponse.data.promotions || [])
      setRankPromotions(rankResponse.data.rankPromotions || [])
    } catch (error) {
      console.error('Failed to load promotions:', error)
      toast.error('Failed to load promotion history')
    } finally {
      setLoading(false)
    }
  }

  const loadFormOptions = async (type: 'staff' | 'rank') => {
    try {
      if (type === 'staff') {
        const response = await axios.get(`/employees/${employeeId}/promotions/form-options`)
        setStaffFormOptions(response.data)
      } else {
        const response = await axios.get(`/employees/${employeeId}/rank-promotions/form-options`)
        setRankFormOptions(response.data)
      }
    } catch (error) {
      console.error('Failed to load form options:', error)
    }
  }

  const openCreateModal = async (type: 'staff' | 'rank') => {
    setPromotionType(type)
    await loadFormOptions(type)
    setFormData({
      to_staff_grade_id: '',
      to_academic_rank_id: '',
      effective_date: new Date().toISOString().split('T')[0],
      remarks: '',
      document_ref: '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    setSubmitting(true)
    try {
      if (promotionType === 'staff') {
        const payload = {
          to_staff_grade_id: Number(formData.to_staff_grade_id),
          effective_date: formData.effective_date,
          remarks: formData.remarks || null,
          document_ref: formData.document_ref || null,
        }
        await axios.post(`/employees/${employeeId}/promotions`, payload)
      } else {
        const payload = {
          to_academic_rank_id: Number(formData.to_academic_rank_id),
          effective_date: formData.effective_date,
          remarks: formData.remarks || null,
          document_ref: formData.document_ref || null,
        }
        await axios.post(`/employees/${employeeId}/rank-promotions`, payload)
      }
      
      toast.success('Promotion recorded successfully')
      setModalOpen(false)
      loadPromotions()
      onPromotionChange?.()
    } catch (error: any) {
      const message = error.response?.data?.message || 
        error.response?.data?.errors?.to_staff_grade_id?.[0] || 
        error.response?.data?.errors?.to_academic_rank_id?.[0] || 
        'Failed to record promotion'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const renderPromotionList = (promotions: (StaffPromotion | RankPromotion)[], type: 'staff' | 'rank') => {
    if (promotions.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Award className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No {type === 'staff' ? 'staff grade' : 'academic rank'} promotion history yet</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {promotions.map((promotion, index) => {
          const isStaff = type === 'staff'
          const fromGrade = isStaff 
            ? (promotion as StaffPromotion).fromStaffGrade || (promotion as StaffPromotion).from_staff_grade
            : (promotion as RankPromotion).fromAcademicRank || (promotion as RankPromotion).from_academic_rank
          const toGrade = isStaff
            ? (promotion as StaffPromotion).toStaffGrade || (promotion as StaffPromotion).to_staff_grade
            : (promotion as RankPromotion).toAcademicRank || (promotion as RankPromotion).to_academic_rank
          const promotedByEmp = promotion.promotedBy || promotion.promoted_by_employee

          return (
            <div key={promotion.id} className="relative">
              {index < promotions.length - 1 && (
                <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-border" />
              )}
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  {isStaff ? <Briefcase className="h-4 w-4 text-primary-foreground" /> : <GraduationCap className="h-4 w-4 text-primary-foreground" />}
                </div>

                <div className="flex-1 p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {fromGrade && (
                      <>
                        <Badge variant="outline">{fromGrade.name}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </>
                    )}
                    <Badge variant="default">{toGrade?.name || `Unknown ${isStaff ? 'Grade' : 'Rank'}`}</Badge>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Effective: {formatDate(promotion.effective_date)}</span>
                    </div>
                    
                    {promotedByEmp && (
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>By: {promotedByEmp.first_name} {promotedByEmp.surname}</span>
                      </div>
                    )}
                    
                    {promotion.document_ref && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        <span>Ref: {promotion.document_ref}</span>
                      </div>
                    )}
                    
                    {promotion.remarks && (
                      <p className="mt-2 text-xs italic">{promotion.remarks}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
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
            <TrendingUp className="h-5 w-5" />
            Promotion History
          </h3>
          <p className="text-sm text-muted-foreground">
            {hasAdministrativeSector && hasAcademicSector 
              ? 'Staff grade and academic rank progression records'
              : hasAdministrativeSector 
                ? 'Staff grade progression records'
                : hasAcademicSector
                  ? 'Academic rank progression records'
                  : 'Promotion history records'}
          </p>
        </div>
        {canPromote && (hasAdministrativeSector || hasAcademicSector) && (
          <div className="flex gap-2">
            {hasAdministrativeSector && (
              <Button type="button" variant="outline" size="sm" onClick={() => openCreateModal('staff')}>
                <Plus className="h-4 w-4 mr-2" />
                Staff Grade
              </Button>
            )}
            {hasAcademicSector && (
              <Button type="button" variant="outline" size="sm" onClick={() => openCreateModal('rank')}>
                <Plus className="h-4 w-4 mr-2" />
                Academic Rank
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'staff' | 'rank')}>
        {(hasAdministrativeSector || hasAcademicSector) && (
          <TabsList className={`grid w-full ${hasAdministrativeSector && hasAcademicSector ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {hasAdministrativeSector && (
              <TabsTrigger value="staff" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Staff Grade ({staffPromotions.length})
              </TabsTrigger>
            )}
            {hasAcademicSector && (
              <TabsTrigger value="rank" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Academic Rank ({rankPromotions.length})
              </TabsTrigger>
            )}
          </TabsList>
        )}
        
        {hasAdministrativeSector && (
          <TabsContent value="staff" className="mt-4">
            {renderPromotionList(staffPromotions, 'staff')}
          </TabsContent>
        )}
        
        {hasAcademicSector && (
          <TabsContent value="rank" className="mt-4">
            {renderPromotionList(rankPromotions, 'rank')}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Record {promotionType === 'staff' ? 'Staff Grade' : 'Academic Rank'} Promotion
            </DialogTitle>
            <DialogDescription>
              Record a {promotionType === 'staff' ? 'staff grade' : 'academic rank'} promotion for this employee.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {promotionType === 'staff' ? (
              <>
                {staffFormOptions.currentGrade && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Label className="text-sm text-muted-foreground">Current Grade</Label>
                    <p className="font-medium">{staffFormOptions.currentGrade.name}</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="to_staff_grade_id">
                    Promote To <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.to_staff_grade_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, to_staff_grade_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select new staff grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffFormOptions.staffGrades.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No higher grades available
                        </SelectItem>
                      ) : (
                        staffFormOptions.staffGrades.map((grade) => (
                          <SelectItem key={grade.id} value={String(grade.id)}>
                            {grade.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                {rankFormOptions.currentRank && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Label className="text-sm text-muted-foreground">Current Rank</Label>
                    <p className="font-medium">{rankFormOptions.currentRank.name}</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="to_academic_rank_id">
                    Promote To <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.to_academic_rank_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, to_academic_rank_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select new academic rank" />
                    </SelectTrigger>
                    <SelectContent>
                      {rankFormOptions.academicRanks.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No higher ranks available
                        </SelectItem>
                      ) : (
                        rankFormOptions.academicRanks.map((rank) => (
                          <SelectItem key={rank.id} value={String(rank.id)}>
                            {rank.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="effective_date">
                Effective Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                id="effective_date"
                value={formData.effective_date}
                onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="document_ref">Document Reference</Label>
              <Input
                type="text"
                id="document_ref"
                value={formData.document_ref}
                onChange={(e) => setFormData(prev => ({ ...prev, document_ref: e.target.value }))}
                placeholder="e.g., Board Resolution No. 2026-001"
              />
            </div>

            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <CustomTextarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Optional notes about this promotion"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting || (promotionType === 'staff' ? !formData.to_staff_grade_id : !formData.to_academic_rank_id)}
              >
                {submitting ? 'Saving...' : 'Record Promotion'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
