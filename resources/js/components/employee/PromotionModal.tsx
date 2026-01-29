import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CustomTextarea } from '@/components/ui/custom-textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { TrendingUp, AlertCircle } from 'lucide-react'
import { toast } from '@/components/custom-toast'
import axios from 'axios'

interface Grade {
  id: number
  name: string
  code?: string | null
  level: number
}

interface PromotionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  designationId: number
  currentGrade: Grade | null
  gradeType: 'academic_rank' | 'staff_grade'
  onSuccess?: () => void
}

export function PromotionModal({
  open,
  onOpenChange,
  employeeId,
  designationId,
  currentGrade,
  gradeType,
  onSuccess
}: PromotionModalProps) {
  const [availableGrades, setAvailableGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    to_grade_id: '',
    effective_date: new Date().toISOString().split('T')[0],
    reason: '',
  })

  useEffect(() => {
    if (open && employeeId && designationId) {
      loadFormOptions()
    }
  }, [open, employeeId, designationId])

  const loadFormOptions = async () => {
    setLoading(true)
    try {
      const response = await axios.get(
        `/employees/${employeeId}/designations/${designationId}/grade-form-options`
      )
      setAvailableGrades(response.data.available_for_promotion || [])
      setFormData(prev => ({
        ...prev,
        to_grade_id: '',
        effective_date: new Date().toISOString().split('T')[0],
        reason: '',
      }))
    } catch (error) {
      console.error('Failed to load form options:', error)
      toast.error('Failed to load promotion options')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    if (!formData.to_grade_id) {
      toast.error('Please select a new grade/rank')
      return
    }

    setSubmitting(true)
    try {
      await axios.post(
        `/employees/${employeeId}/designations/${designationId}/promote`,
        {
          to_grade_id: Number(formData.to_grade_id),
          grade_type: gradeType,
          effective_date: formData.effective_date,
          reason: formData.reason || null,
        }
      )
      
      toast.success('Promotion recorded successfully!')
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      const message = error.response?.data?.message || 
                     error.response?.data?.errors?.to_grade_id?.[0] || 
                     'Failed to record promotion'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Promote {gradeType === 'academic_rank' ? 'Academic Rank' : 'Staff Grade'}
          </DialogTitle>
          <DialogDescription>
            Record an upward career progression. This action will permanently create a promotion history record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {currentGrade && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <Label className="text-sm text-muted-foreground">Current {gradeType === 'academic_rank' ? 'Rank' : 'Grade'}</Label>
              <p className="font-medium">{currentGrade.name}</p>
            </div>
          )}

          <div>
            <Label htmlFor="to_grade_id">
              Promote To <span className="text-destructive">*</span>
            </Label>
            {loading ? (
              <div className="h-10 w-full rounded-lg border border-border bg-muted animate-pulse" />
            ) : (
              <Select
                value={formData.to_grade_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, to_grade_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new grade/rank" />
                </SelectTrigger>
                <SelectContent>
                  {availableGrades.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No higher grades available
                    </SelectItem>
                  ) : (
                    availableGrades.map((grade) => (
                      <SelectItem key={grade.id} value={String(grade.id)}>
                        {grade.name} (Level {grade.level})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            {availableGrades.length === 0 && !loading && (
              <p className="mt-1.5 text-xs text-amber-600">
                No higher grades available for promotion. Use Correction/Adjustment if you need to change the grade.
              </p>
            )}
          </div>

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
            <Label htmlFor="reason">Reason (Optional)</Label>
            <CustomTextarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Optional notes about this promotion"
              rows={2}
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              This action will permanently record a promotion in the employee's career history. This cannot be undone.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || !formData.to_grade_id || loading}
            >
              {submitting ? 'Recording...' : 'Confirm Promotion'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
