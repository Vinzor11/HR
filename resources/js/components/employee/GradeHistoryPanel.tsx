import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, FileText, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'
import { toast } from '@/components/custom-toast'
import axios from 'axios'

interface Grade {
  id: number
  name: string
  code?: string | null
  level: number
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
  fromGrade?: Grade | null
  toGrade?: Grade | null
  performedBy?: {
    id: string
    first_name: string
    surname: string
  } | null
}

interface GradeHistoryPanelProps {
  employeeId: string
  designationId: number
}

export function GradeHistoryPanel({ employeeId, designationId }: GradeHistoryPanelProps) {
  const [history, setHistory] = useState<GradeChange[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (employeeId && designationId) {
      loadHistory()
    }
  }, [employeeId, designationId])

  const loadHistory = async () => {
    try {
      const response = await axios.get(
        `/employees/${employeeId}/designations/${designationId}/grade-history`
      )
      setHistory(response.data.history || [])
    } catch (error) {
      console.error('Failed to load grade history:', error)
      toast.error('Failed to load grade history')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-2">Grade/Rank History</h4>
        <p className="text-sm text-muted-foreground">No grade/rank changes recorded yet.</p>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <h4 className="text-sm font-semibold mb-3">Grade/Rank History</h4>
      <div className="space-y-3">
        {history.map((change, index) => {
          const fromGrade = change.fromGrade
          const toGrade = change.toGrade
          const isPromotion = change.change_type === 'promotion'

          return (
            <div key={change.id} className="relative">
              {/* Timeline connector */}
              {index < history.length - 1 && (
                <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-border" />
              )}
              
              <div className="flex gap-3">
                {/* Timeline dot */}
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
                    {fromGrade && (
                      <>
                        <Badge variant="outline">{fromGrade.name}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </>
                    )}
                    <Badge variant="default">{toGrade?.name || 'Unknown'}</Badge>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Effective: {formatDate(change.effective_date)}</span>
                    </div>
                    
                    {change.performedBy && (
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>By: {change.performedBy.first_name} {change.performedBy.surname}</span>
                      </div>
                    )}
                    
                    {change.reason && (
                      <div className="flex items-start gap-2 mt-2">
                        <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="text-xs italic">{change.reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
