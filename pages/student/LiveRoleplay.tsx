

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '../../components/Button';
import { LiveClient } from '../../services/liveClient';
import { getScenarios } from '../../services/store'; // Import getScenarios
import { Scenario } from '../../types'; // Import shared type
import { Mic, MicOff, PhoneOff, Activity, User, Briefcase, Smile, Frown, MessageCircle } from 'lucide-react';

export const LiveRoleplay: React.FC = () => {
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [volume, setVolume] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    
    // Ref to hold the client instance across renders
    const clientRef = useRef<LiveClient | null>(null);

    useEffect(() => {
        const load = async () => {
            const data = await getScenarios();
            setScenarios(data);
        };
        load();

        // Cleanup on unmount
        return () => {
            if (clientRef.current) {
                clientRef.current.disconnect();
            }
        };
    }, []);

    const startSession = async (scenario: Scenario) => {
        setSelectedScenario(scenario);
        setStatus('connecting');
        setErrorMsg('');

        // Initialize Client
        clientRef.current = new LiveClient();
        
        // Setup Callbacks
        clientRef.current.onStatusChange = (s) => {
            if (s === 'connected') setStatus('connected');
            if (s === 'disconnected') setStatus('idle');
        };
        
        clientRef.current.onVolumeLevel = (v) => {
            setVolume(v);
        };

        clientRef.current.onError = (e) => {
            setStatus('error');
            setErrorMsg(e);
        };

        // Connect
        await clientRef.current.connect(scenario.systemInstruction, scenario.voice);
    };

    const endSession = () => {
        if (clientRef.current) {
            clientRef.current.disconnect();
            clientRef.current = null;
        }
        setStatus('idle');
        setVolume(0);
    };

    // Visualization Bars
    const bars = 5;

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-indigo-600" />
                        Simulador de Roles con IA
                    </h1>
                    <p className="text-slate-500">
                        Practica situaciones difíciles en un entorno seguro hablando en tiempo real.
                    </p>
                </div>
            </div>

            {/* ERROR ALERT */}
            {status === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center justify-between">
                    <span>{errorMsg}</span>
                    <button onClick={() => setStatus('idle')} className="font-bold underline">Reintentar</button>
                </div>
            )}

            {/* ACTIVE SESSION UI */}
            {status === 'connected' && selectedScenario ? (
                <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col items-center justify-center p-6">
                    <div className="max-w-2xl w-full flex flex-col items-center gap-8">
                        
                        {/* Scenario Info Card */}
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 w-full text-center relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-1 ${selectedScenario.color}`} />
                            <h2 className="text-2xl font-bold mb-2">{selectedScenario.title}</h2>
                            <p className="text-slate-400 mb-4">{selectedScenario.description}</p>
                            <div className="inline-block bg-slate-900 px-4 py-1 rounded-full text-sm font-mono text-indigo-400">
                                Hablando con: {selectedScenario.role}
                            </div>
                        </div>

                        {/* Visualizer / Avatar */}
                        <div className="relative w-48 h-48 flex items-center justify-center">
                            {/* Ripple Effect based on volume */}
                            <div 
                                className={`absolute inset-0 rounded-full opacity-30 ${selectedScenario.color} transition-transform duration-75`}
                                style={{ transform: `scale(${1 + Math.min(volume, 2)})` }}
                            />
                            <div 
                                className={`absolute inset-4 rounded-full opacity-50 ${selectedScenario.color} transition-transform duration-100`}
                                style={{ transform: `scale(${1 + Math.min(volume * 0.5, 1.5)})` }}
                            />
                            
                            {/* Central Icon */}
                            <div className={`relative w-32 h-32 rounded-full bg-slate-800 border-4 border-white/10 flex items-center justify-center shadow-2xl`}>
                                <User className="w-16 h-16 text-white" />
                            </div>
                        </div>

                        {/* Status Indicator */}
                        <div className="h-8 flex items-center gap-1">
                             {[...Array(bars)].map((_, i) => (
                                 <div 
                                    key={i}
                                    className={`w-2 bg-indigo-500 rounded-full transition-all duration-75`}
                                    style={{ 
                                        height: `${Math.max(4, Math.random() * volume * 20)}px`,
                                        opacity: volume > 0.05 ? 1 : 0.3
                                    }}
                                 />
                             ))}
                        </div>

                        {/* Controls */}
                        <div className="flex gap-6 mt-8">
                            <button 
                                onClick={endSession}
                                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105"
                                title="Colgar / Terminar"
                            >
                                <PhoneOff className="w-8 h-8" />
                            </button>
                        </div>

                        <p className="text-slate-500 text-sm animate-pulse">
                            Escuchando... (Habla claro a tu micrófono)
                        </p>
                    </div>
                </div>
            ) : (
                /* SCENARIO SELECTOR */
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scenarios.map(scenario => (
                        <div key={scenario.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                            <div className={`h-2 ${scenario.color}`} />
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-lg bg-slate-50 group-hover:bg-indigo-50 transition-colors`}>
                                        <Briefcase className="w-6 h-6 text-slate-600 group-hover:text-indigo-600" />
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded border ${
                                        scenario.difficulty === 'Difícil' ? 'bg-red-50 text-red-700 border-red-200' :
                                        scenario.difficulty === 'Medio' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        'bg-green-50 text-green-700 border-green-200'
                                    }`}>
                                        {scenario.difficulty}
                                    </span>
                                </div>
                                
                                <h3 className="text-lg font-bold text-slate-900 mb-2">{scenario.title}</h3>
                                <p className="text-slate-500 text-sm mb-6 flex-1">{scenario.description}</p>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center text-xs text-slate-500 bg-slate-50 p-2 rounded">
                                        <MessageCircle className="w-4 h-4 mr-2" />
                                        <span>Rol: <strong>{scenario.role}</strong></span>
                                    </div>
                                    
                                    <Button 
                                        className="w-full" 
                                        onClick={() => startSession(scenario)}
                                        isLoading={status === 'connecting' && selectedScenario?.id === scenario.id}
                                    >
                                        <Mic className="w-4 h-4 mr-2" />
                                        Iniciar Simulación
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {scenarios.length === 0 && (
                        <div className="col-span-3 text-center py-12 text-slate-500 italic">
                            No hay escenarios disponibles en este momento.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
