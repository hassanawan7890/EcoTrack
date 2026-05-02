'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Recycle, Plus, Loader2 } from 'lucide-react'

const MATERIAL_COLORS: Record<string, string> = {
  Paper:   'text-blue-400 bg-blue-500/10',
  Plastic: 'text-amber-400 bg-amber-500/10',
  Metal:   'text-zinc-400 bg-zinc-500/10',
  Glass:   'text-cyan-400 bg-cyan-500/10',
  Organic: 'text-emerald-400 bg-emerald-500/10',
}

export default function StaffMaterialsPage() {
  const [materials, setMaterials]     = useState<any[]>([])
  const [loads, setLoads]             = useState<any[]>([])
  const [categories, setCategories]   = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [open, setOpen]               = useState(false)
  const [selectedLoad, setSelectedLoad] = useState('')
  const [weights, setWeights]         = useState<Record<string, string>>({})
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  async function load() {
    try {
      const [mData, lData, cData] = await Promise.all([
        api.get('/api/materials'),
        api.get('/api/loads'),
        api.get('/api/ref/categories'),
      ])
      setMaterials(mData)
      setLoads(lData)
      setCategories(cData)
      const w: Record<string, string> = {}
      cData.forEach((c: any) => { w[c.id] = '' })
      setWeights(w)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const mats = Object.entries(weights)
      .filter(([, v]) => v && Number(v) > 0)
      .map(([material_id, weight_kg]) => ({ material_id: Number(material_id), weight_kg: Number(weight_kg) }))
    if (mats.length === 0) { setError('Enter at least one material weight.'); return }
    setSubmitting(true)
    try {
      await api.post('/api/materials', { load_id: Number(selectedLoad), materials: mats })
      setOpen(false)
      setSelectedLoad('')
      setWeights((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, ''])))
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Material Breakdown" description="Log the material composition of each load.">
        <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4" /> Log Materials</Button>
      </PageHeader>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Recycle className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No material records yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Load ID</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Load Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Material</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Weight (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {materials.map((m: any) => (
                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 text-xs font-mono text-muted-foreground/60">#{m.load_id}</td>
                  <td className="px-5 py-4 text-muted-foreground">{m.load_data?.load_date ?? '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${MATERIAL_COLORS[m.material_categories?.name] ?? 'text-zinc-400 bg-zinc-500/10'}`}>
                      {m.material_categories?.name ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold">{m.weight_kg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Material Breakdown</DialogTitle>
            <DialogDescription>Enter the weight for each material type in this load.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Load</Label>
              <Select value={selectedLoad} onValueChange={setSelectedLoad} required>
                <SelectTrigger><SelectValue placeholder="Select load" /></SelectTrigger>
                <SelectContent>
                  {loads.map((l: any) => <SelectItem key={l.id} value={String(l.id)}>Load #{l.id} — {l.load_date}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {categories.map((cat: any) => (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className={`w-20 text-xs font-medium rounded-md px-2 py-0.5 ${MATERIAL_COLORS[cat.name] ?? ''}`}>{cat.name}</span>
                  <Input
                    type="number" step="0.1" min="0" placeholder="0.0 kg"
                    value={weights[cat.id] ?? ''}
                    onChange={(e) => setWeights((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting || !selectedLoad}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Materials'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
