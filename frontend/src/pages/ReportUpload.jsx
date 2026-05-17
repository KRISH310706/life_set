import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { reportsAPI } from '../api'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import LanguageSelector from '../components/LanguageSelector'

const colorMap = {
  green:  { bg:'bg-green-50',  border:'border-green-200',  text:'text-green-700',  badge:'bg-green-100 text-green-700 border-green-200',  dot:'bg-green-500'  },
  yellow: { bg:'bg-yellow-50', border:'border-yellow-200', text:'text-yellow-700', badge:'bg-yellow-100 text-yellow-700 border-yellow-200', dot:'bg-yellow-500' },
  red:    { bg:'bg-red-50',    border:'border-red-200',    text:'text-red-700',    badge:'bg-red-100 text-red-700 border-red-200',          dot:'bg-red-500'    },
  blue:   { bg:'bg-blue-50',   border:'border-blue-200',   text:'text-blue-700',   badge:'bg-blue-100 text-blue-700 border-blue-200',       dot:'bg-blue-500'   },
  orange: { bg:'bg-orange-50', border:'border-orange-200', text:'text-orange-700', badge:'bg-orange-100 text-orange-700 border-orange-200', dot:'bg-orange-500' },
  gray:   { bg:'bg-gray-50',   border:'border-gray-200',   text:'text-gray-700',   badge:'bg-gray-100 text-gray-700 border-gray-200',       dot:'bg-gray-400'   },
}

// Simple text component - no slow API translation
function T({ children, text }) {
  return <span>{text || children}</span>
}

function ConditionCard({ c }) {
  const col = colorMap[c.color] || colorMap.gray
  
  // Add reassuring prefix for non-normal conditions
  const getReassurance = (color, condition) => {
    if (color === 'green') return ''
    if (color === 'yellow') return "Don't worry — this is manageable. "
    return "This needs attention, but it's treatable. "
  }
  
  return (
    <div className={`rounded-2xl border p-4 ${col.bg} ${col.border}`}>
      <p className="font-bold text-gray-900 flex items-center gap-2 text-sm"><span className="text-xl">{c.icon}</span><T text={c.condition} /></p>
      <p className={`font-semibold text-sm mt-1 ${col.text}`}><T text={c.verdict} /></p>
      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
        <T text={getReassurance(c.color, c.condition) + c.detail} />
      </p>
    </div>
  )
}

function ParamRow({ param }) {
  const col = colorMap[param.color] || colorMap.gray
  const icon = param.status === 'normal' ? '✅' : param.status === 'borderline' ? '⚠️' : param.status === 'low' ? '🔵' : '🔴'
  
  // Softer status messages
  const statusMessage = {
    normal: 'Within healthy range',
    borderline: 'Slightly outside range — easily manageable',
    high: 'Above normal — consult your doctor',
    low: 'Below normal — consult your doctor'
  }
  
  return (
    <div className={`rounded-xl border p-4 mb-3 ${col.bg} ${col.border}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="font-semibold text-gray-900 text-sm"><T text={param.label} /></p>
          <p className="text-2xl font-bold text-gray-800 mt-0.5">{param.value} <span className="text-sm font-normal text-gray-500">{param.unit}</span></p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border flex-shrink-0 flex items-center gap-1.5 ${col.badge}`}>
          <span className={`w-2 h-2 rounded-full ${col.dot}`}/><T text={param.range_name} />
        </span>
      </div>
      
      {/* Clear Reference Range Display */}
      <div className="bg-white/60 rounded-lg p-2.5 mb-3 border border-gray-100">
        <p className="text-xs font-semibold text-gray-600 mb-1"><T text="📊 Reference Ranges:" /></p>
        <p className="text-xs text-gray-700">{param.normal_ranges}</p>
      </div>
      
      {/* Status with softer language */}
      <div className={`flex items-start gap-2 p-2 rounded-lg ${param.status === 'normal' ? 'bg-green-50' : param.status === 'borderline' ? 'bg-yellow-50' : 'bg-orange-50'}`}>
        <span className="text-lg flex-shrink-0">{icon}</span>
        <div>
          <p className={`text-sm font-semibold ${col.text}`}><T text={statusMessage[param.status] || 'Value recorded'} /></p>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed"><T text={param.explanation} /></p>
        </div>
      </div>
    </div>
  )
}

function FullAnalysis({ analysis }) {
  const [tab, setTab] = useState('summary')
  if (!analysis) return null
  const tabs = [
    { id:'summary',     label:'📋 Summary',      count: analysis.condition_summary?.length || 0 },
    { id:'abnormal',    label:'⚠️ Abnormal',     count: Object.keys(analysis.abnormal||{}).length },
    { id:'normal',      label:'✅ Normal',        count: Object.keys(analysis.normal||{}).length },
    { id:'all',         label:'📊 All Results',   count: analysis.parameters_found || 0 },
    { id:'suggestions', label:'💡 Advice',        count: analysis.suggestions?.length || 0 },
  ]
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">📋</div>
          <div>
            <h3 className="font-bold text-lg"><T text="Report Analysis Complete" /></h3>
            <p className="text-green-100 text-sm">{analysis.parameters_found} <T text="parameters" /> · {analysis.abnormal_count} <T text="need attention" /> · via {analysis.extraction_method}</p>
          </div>
        </div>
        {/* Reassurance Message */}
        {analysis.reassurance_message && (
          <div className="mt-4 bg-white/10 border border-white/20 rounded-xl p-3">
            <p className="text-sm leading-relaxed"><T text={analysis.reassurance_message} /></p>
          </div>
        )}
        {/* Overall Summary */}
        {analysis.overall_summary && (
          <div className="mt-3 text-green-100 text-sm">
            <p>📊 <T text={analysis.overall_summary} /></p>
          </div>
        )}
        {analysis.urgent_attention?.length > 0 && (
          <div className="mt-4 bg-red-500/30 border border-red-300/50 rounded-xl p-3">
            <p className="font-bold text-sm">🚨 <T text={`Urgent: ${analysis.urgent_attention.join(', ')} — Consult a doctor immediately`} /></p>
          </div>
        )}
      </div>
      {/* Tabs */}
      <div className="flex gap-1 p-3 bg-gray-50 border-b border-gray-100 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${tab===t.id ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t.label}
            {t.count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-xs ${tab===t.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="p-5">
        {tab === 'summary' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900"><T text="Health Condition Verdicts" /></h4>
            {analysis.condition_summary?.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-3">
                {analysis.condition_summary.map((c, i) => <ConditionCard key={i} c={c}/>)}
              </div>
            ) : <p className="text-gray-400 text-sm"><T text="No conditions detected from extracted values." /></p>}
            {analysis.issues_found?.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="font-semibold text-red-800 mb-2 text-sm"><T text="🔴 Values Needing Attention" /></p>
                {analysis.issues_found.map((i, idx) => <p key={idx} className="text-sm text-red-700"><T text={i} /></p>)}
              </div>
            )}
            {analysis.good_news?.length > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                <p className="font-semibold text-green-800 mb-2 text-sm"><T text="✅ Normal Values" /></p>
                {analysis.good_news.map((i, idx) => <p key={idx} className="text-sm text-green-700"><T text={i} /></p>)}
              </div>
            )}
          </div>
        )}
        {tab === 'abnormal' && (
          Object.keys(analysis.abnormal||{}).length === 0
            ? <div className="text-center py-10 text-gray-400"><div className="text-4xl mb-2">🎉</div><p className="font-semibold text-gray-600"><T text="All extracted values are in normal range!" /></p></div>
            : Object.values(analysis.abnormal).map((p, i) => <ParamRow key={i} param={p}/>)
        )}
        {tab === 'normal' && Object.values(analysis.normal||{}).map((p, i) => <ParamRow key={i} param={p}/>)}
        {tab === 'all'    && Object.values(analysis.results||{}).map((p, i) => <ParamRow key={i} param={p}/>)}
        {tab === 'suggestions' && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900"><T text="Personalized Health Advice" /></h4>
            {(analysis.suggestions||[]).map((s, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-xl p-3 border ${s.startsWith('⚠️') ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-100'}`}>
                <span className="text-lg flex-shrink-0">{s.startsWith('⚠️') ? '⚠️' : '💡'}</span>
                <p className="text-sm text-gray-700"><T text={s.replace('⚠️ ','')} /></p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-amber-50 border-t border-amber-100 px-5 py-3">
        <p className="text-xs text-amber-700"><T text="⚠️ Disclaimer: This analysis is for informational purposes only — NOT a medical diagnosis. Always consult a qualified doctor to interpret your lab reports." /></p>
      </div>
    </div>
  )
}

function ReportCard({ report }) {
  const [open, setOpen]   = useState(false)
  const analysis          = report.analysis_result || {}
  const abnormalCount     = Object.keys(report.abnormal_values || {}).length

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${abnormalCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>📄</div>
          <div>
            <p className="font-semibold text-gray-800">{report.filename}</p>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(report.uploaded_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}{analysis.parameters_found ? ` · ${analysis.parameters_found} parameters` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {abnormalCount > 0
            ? <span className="text-xs bg-red-100 text-red-600 border border-red-200 font-semibold px-2.5 py-1 rounded-full">⚠️ {abnormalCount} Abnormal</span>
            : <span className="text-xs bg-green-100 text-green-700 border border-green-200 font-semibold px-2.5 py-1 rounded-full">✅ All Normal</span>
          }
          <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && <div className="border-t border-gray-100 p-5"><FullAnalysis analysis={analysis}/></div>}
    </div>
  )
}

export default function ReportUpload() {
  const { user }  = useAuth()
  const { language } = useLanguage()
  const [reports, setReports]       = useState([])
  const [uploading, setUploading]   = useState(false)
  const [freshAnalysis, setFresh]   = useState(null)
  const [error, setError]           = useState('')
  const [tab, setTab]               = useState('upload')

  const fetchReports = () => reportsAPI.list(user.user_id).then(r => setReports(r.data)).catch(()=>{})
  useEffect(() => { fetchReports() }, [user])

  const onDrop = useCallback(async (files) => {
    const file = files[0]; if (!file) return
    setUploading(true); setError(''); setFresh(null)
    const fd = new FormData()
    fd.append('user_id', user.user_id)
    fd.append('file', file)
    fd.append('report_type', 'blood_test')
    try {
      const res = await reportsAPI.upload(fd)
      setFresh(res.data.analysis)
      fetchReports()
      setTab('result')
    } catch(err) {
      setError(err.response?.data?.detail || 'Upload failed.')
    } finally { setUploading(false) }
  }, [user])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept:{'application/pdf':[],'image/*':[]}, maxFiles:1 })

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl text-gray-900"><T text="Lab Report Analyzer" /> 📄</h1>
          <p className="text-gray-500 mt-1"><T text="Upload any blood test — we extract all values and explain them in plain language" /></p>
        </div>
        <LanguageSelector compact />
      </div>

      <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit">
        {[
          {id:'upload',  label:'⬆️ Upload'},
          {id:'result',  label:'📊 Latest Analysis', disabled:!freshAnalysis},
          {id:'history', label:`📋 History (${reports.length})`},
          {id:'compare', label:'🔄 Compare', disabled:reports.length<2},
        ].map(t => (
          <button key={t.id} onClick={() => !t.disabled && setTab(t.id)} disabled={t.disabled}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t.id ? 'bg-green-600 text-white shadow-sm' : t.disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'upload' && (
        <div className="space-y-4 animate-scale-in">
          <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all ${isDragActive ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:bg-green-50/40'}`}>
            <input {...getInputProps()}/>
            {uploading ? (
              <div className="space-y-4">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"/>
                <p className="text-green-700 font-semibold text-lg"><T text="Analyzing your report..." /></p>
                <p className="text-gray-400 text-sm"><T text="Extracting values · Checking reference ranges · Generating insights" /></p>
              </div>
            ) : isDragActive ? (
              <p className="text-green-700 font-bold text-xl"><T text="Drop it here!" /></p>
            ) : (
              <>
                <div className="text-5xl mb-4 animate-float inline-block">📋</div>
                <p className="font-bold text-gray-700 text-xl mb-1"><T text="Drop your report here" /></p>
                <p className="text-gray-400 text-sm mb-3"><T text="or click to browse · Supports PDF, JPG, PNG" /></p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-lg mx-auto text-xs">
                  {['Blood Sugar & HbA1c','Cholesterol & LDL','Hemoglobin & CBC','Thyroid (TSH)','Kidney (Creatinine)','Uric Acid (Gout)','Vitamin D & B12','Blood Pressure'].map(item => (
                    <span key={item} className="bg-green-50 text-green-700 border border-green-200 px-2 py-1.5 rounded-lg text-center">✓ {item}</span>
                  ))}
                </div>
              </>
            )}
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">❌ <T text={error} /></div>}
        </div>
      )}

      {tab === 'result' && freshAnalysis && (
        <div className="animate-scale-in"><FullAnalysis analysis={freshAnalysis}/></div>
      )}

      {tab === 'history' && (
        <div className="space-y-3 animate-scale-in">
          {reports.length === 0
            ? <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100"><div className="text-5xl mb-3">📄</div><p className="font-semibold text-gray-600"><T text="No reports yet" /></p><button onClick={()=>setTab('upload')} className="mt-4 bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700 transition"><T text="Upload First Report →" /></button></div>
            : reports.map(r => <ReportCard key={r.id} report={r}/>)
          }
        </div>
      )}

      {tab === 'compare' && reports.length >= 2 && (
        <ComparePanel reports={reports}/>
      )}
    </div>
  )
}

function ComparePanel({ reports }) {
  const [aId, setAId] = useState(''), [bId, setBId] = useState('')
  const rA = reports.find(r => String(r.id) === String(aId))
  const rB = reports.find(r => String(r.id) === String(bId))
  const params = new Set([...Object.keys(rA?.analysis_result?.results||{}), ...Object.keys(rB?.analysis_result?.results||{})])
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-5 animate-scale-in">
      <h2 className="font-semibold text-gray-900">📊 Compare Two Reports</h2>
      <div className="grid grid-cols-2 gap-4">
        {[['Earlier (Previous)', aId, setAId],['Latest (Current)', bId, setBId]].map(([lbl,val,set]) => (
          <div key={lbl}>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{lbl}</label>
            <select value={val} onChange={e => set(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">Select report...</option>
              {reports.map(r => <option key={r.id} value={r.id}>{r.filename} — {new Date(r.uploaded_at).toLocaleDateString('en-IN')}</option>)}
            </select>
          </div>
        ))}
      </div>
      {aId && bId && aId !== bId && params.size > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-green-50">
              {['Parameter','Previous','Current','Change'].map(h => <th key={h} className="text-left px-3 py-2.5 text-xs font-bold text-green-800">{h}</th>)}
            </tr></thead>
            <tbody>
              {[...params].map(key => {
                const prev = rA?.analysis_result?.results?.[key]
                const curr = rB?.analysis_result?.results?.[key]
                if (!prev || !curr) return null
                const diff = curr.value - prev.value
                const pct  = prev.value ? ((diff/prev.value)*100).toFixed(1) : 0
                const improved = curr.status==='normal' && prev.status!=='normal'
                const worsened = curr.status!=='normal' && prev.status==='normal'
                return (
                  <tr key={key} className="border-b border-gray-50">
                    <td className="px-3 py-3 font-medium text-gray-700 text-xs">{curr.label}</td>
                    <td className="px-3 py-3 font-bold text-gray-800">{prev.value} {prev.unit}</td>
                    <td className="px-3 py-3 font-bold text-gray-800">{curr.value} {curr.unit}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-bold flex items-center gap-1 ${diff===0?'text-gray-500':improved?'text-green-600':worsened?'text-red-600':'text-amber-600'}`}>
                        {diff>0?'↑':diff<0?'↓':'→'} {Math.abs(diff).toFixed(1)} ({Math.abs(pct)}%)
                        {improved && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-xs ml-1">Improved ✅</span>}
                        {worsened && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-xs ml-1">Worsened ⚠️</span>}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
