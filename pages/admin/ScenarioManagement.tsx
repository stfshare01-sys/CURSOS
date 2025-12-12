
import React, { useEffect, useState } from 'react';
import { Scenario } from '../../types';
import { getScenarios, saveScenario, deleteScenario } from '../../services/store';
import { Button } from '../../components/Button';
import { Plus, Trash2, Edit2, X, Mic2, Briefcase, Smile, Frown, Save } from 'lucide-react';

const COLORS = [
    { label: 'Azul (Negocios)', value: 'bg-blue-600' },
    { label: 'Rojo (Conflicto)', value: 'bg-red-600' },
    { label: 'Verde (Calma)', value: 'bg-green-600' },
    { label: 'Morado (HR)', value: 'bg-purple-600' },
    { label: 'Naranja (Alerta)', value: 'bg-orange-600' },
];

const VOICES = [
    { label: 'Kore (Femenina, Estándar)', value: 'Kore' },
    { label: 'Fenrir (Masculina, Profunda)', value: 'Fenrir' },
    { label: 'Puck (Masculina, Joven)', value: 'Puck' },
    { label: 'Charon (Masculina, Mayor)', value: 'Charon' },
    { label: 'Aoede (Femenina, Suave)', value: 'Aoede' },
];

export const ScenarioManagement: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [form, setForm] = useState<Omit<Scenario, 'id'>>({
      title: '',
      description: '',
      role: '',
      difficulty: 'Medio',
      voice: 'Kore',
      systemInstruction: '',
      color: 'bg-blue-600'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getScenarios();
    setScenarios(data);
    setLoading(false);
  };

  const handleOpenModal = (scenario?: Scenario) => {
    if (scenario) {
      setEditingId(scenario.id);
      setForm({
          title: scenario.title,
          description: scenario.description,
          role: scenario.role,
          difficulty: scenario.difficulty,
          voice: scenario.voice,
          systemInstruction: scenario.systemInstruction,
          color: scenario.color
      });
    } else {
      setEditingId(null);
      setForm({
        title: '',
        description: '',
        role: '',
        difficulty: 'Medio',
        voice: 'Kore',
        systemInstruction: '',
        color: 'bg-blue-600'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.role || !form.systemInstruction) return alert("Completa los campos obligatorios (*)");

    const newScenario: Scenario = {
      id: editingId || crypto.randomUUID(),
      ...form
    };

    await saveScenario(newScenario);
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar este escenario?")) {
      await deleteScenario(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Simuladores de Rol con IA</h1>
          <p className="text-slate-500">Configura los escenarios para el entrenamiento conversacional.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Escenario
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Cargando...</div>
      ) : scenarios.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
           <Mic2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
           <p className="text-slate-500 mb-4">No hay escenarios configurados.</p>
           <Button onClick={() => handleOpenModal()}>Crear el primero</Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map(scenario => (
            <div key={scenario.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group hover:shadow-md transition-shadow">
              <div className={`h-3 ${scenario.color}`} />
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                        scenario.difficulty === 'Difícil' ? 'bg-red-50 text-red-700 border-red-200' :
                        scenario.difficulty === 'Medio' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-green-50 text-green-700 border-green-200'
                    }`}>
                        {scenario.difficulty}
                    </span>
                    <div className="flex items-center text-xs text-slate-400">
                        <Mic2 className="w-3 h-3 mr-1" /> {scenario.voice}
                    </div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-2">{scenario.title}</h3>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{scenario.description}</p>
                
                <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="text-xs font-mono text-indigo-600 bg-indigo-50 p-2 rounded truncate mb-3">
                        Rol: {scenario.role}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleOpenModal(scenario)}>
                            <Edit2 className="w-4 h-4 mr-2" /> Editar
                        </Button>
                        <button 
                            onClick={() => handleDelete(scenario.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
               <h3 className="text-lg font-bold text-slate-900">
                 {editingId ? 'Editar Escenario' : 'Nuevo Escenario'}
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5" />
               </button>
             </div>

             <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Título del Escenario *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm({...form, title: e.target.value})}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ej. Venta Difícil con Cliente Enojado"
                        />
                    </div>
                    
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Descripción (para el estudiante)</label>
                        <input
                            type="text"
                            value={form.description}
                            onChange={e => setForm({...form, description: e.target.value})}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                            placeholder="Breve contexto de la situación..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Rol de la IA *</label>
                        <input
                            type="text"
                            value={form.role}
                            onChange={e => setForm({...form, role: e.target.value})}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ej. Gerente de Compras"
                        />
                    </div>

                    <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1">Dificultad</label>
                         <select
                            value={form.difficulty}
                            onChange={e => setForm({...form, difficulty: e.target.value as any})}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                         >
                             <option value="Fácil">Fácil</option>
                             <option value="Medio">Medio</option>
                             <option value="Difícil">Difícil</option>
                         </select>
                    </div>

                    <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1">Voz de IA</label>
                         <select
                            value={form.voice}
                            onChange={e => setForm({...form, voice: e.target.value})}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                         >
                             {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                         </select>
                    </div>

                    <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1">Color de Tema</label>
                         <select
                            value={form.color}
                            onChange={e => setForm({...form, color: e.target.value})}
                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                         >
                             {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                         </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Instrucción del Sistema (Prompt) *</label>
                    <p className="text-xs text-slate-500 mb-2">
                        Define la personalidad, objetivos y comportamiento de la IA. Sé específico sobre cómo debe reaccionar.
                    </p>
                    <textarea
                        value={form.systemInstruction}
                        onChange={e => setForm({...form, systemInstruction: e.target.value})}
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 h-40 font-mono text-sm"
                        placeholder={`Ej: Eres un cliente enojado porque el envío llegó tarde. No aceptes excusas, solo soluciones...`}
                    />
                </div>
             </div>

             <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
               <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
               <Button onClick={handleSave}>
                 <Save className="w-4 h-4 mr-2" /> Guardar Escenario
               </Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
