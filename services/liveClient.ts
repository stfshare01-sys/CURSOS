
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// Audio Context Configuration
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

// Helper: Float32Array to PCM Int16 Converter
const floatTo16BitPCM = (input: Float32Array) => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
};

// Helper: Base64 Encode
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

// Helper: Base64 Decode
const base64ToArrayBuffer = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

export class LiveClient {
    private ai: GoogleGenAI;
    private inputContext: AudioContext | null = null;
    private outputContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private outputNode: GainNode | null = null;
    
    // Audio Queue Management
    private nextStartTime = 0;
    private activeSources = new Set<AudioBufferSourceNode>(); // Track playing audio for cancellation
    
    private session: any = null;
    private isConnected = false;

    // Callbacks for UI updates
    public onVolumeLevel: (level: number) => void = () => {};
    public onStatusChange: (status: string) => void = () => {};
    public onError: (error: string) => void = () => {};

    constructor() {
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }

    async connect(scenarioInstruction: string, voiceName: string = 'Kore') {
        this.onStatusChange('connecting');

        // 0. Environment Checks
        if (!process.env.API_KEY) {
            this.onError("Falta la API Key. Configura tu entorno.");
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
             this.onError("Tu navegador no soporta acceso al micrófono o el contexto no es seguro (HTTPS).");
             return;
        }

        // 1. Request Mic Permission
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error: any) {
            console.error("Mic Access Error:", error);
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                this.onError("Acceso al micrófono bloqueado. Por favor, habilítalo en el icono 🔒 de la barra de dirección.");
            } else {
                this.onError(`Error de micrófono: ${error.message}`);
            }
            return;
        }

        // 2. Setup Audio Contexts
        try {
            this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
            this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
            
            // Critical: Ensure context is running (fixes issues on Chrome where context starts suspended)
            if (this.inputContext.state === 'suspended') await this.inputContext.resume();
            if (this.outputContext.state === 'suspended') await this.outputContext.resume();

            this.outputNode = this.outputContext.createGain();
            this.outputNode.connect(this.outputContext.destination);
        } catch (error: any) {
             console.error("AudioContext Error:", error);
             this.onError("Error inicializando el sistema de audio.");
             this.stopAudio();
             return;
        }

        // 3. Connect to Gemini Live
        try {
            const sessionPromise = this.ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
                    },
                    systemInstruction: scenarioInstruction,
                },
                callbacks: {
                    onopen: () => {
                        this.isConnected = true;
                        this.onStatusChange('connected');
                        this.startAudioInput(sessionPromise);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        this.handleServerMessage(message);
                    },
                    onclose: () => {
                        this.isConnected = false;
                        this.onStatusChange('disconnected');
                        this.stopAudio();
                    },
                    onerror: (err) => {
                        console.error("Live API Runtime Error:", err);
                        this.onError("Se perdió la conexión con la IA.");
                    }
                }
            });
            
            this.session = sessionPromise;

            sessionPromise.catch((err: any) => {
                 console.error("Session Promise Error:", err);
                 this.onError("No se pudo establecer conexión con Gemini Live. Verifica tu API Key.");
                 this.disconnect();
            });

        } catch (error: any) {
            console.error("Connection Setup Error:", error);
            this.onError(error.message || "Error crítico al configurar la conexión.");
            this.disconnect();
        }
    }

    private startAudioInput(sessionPromise: Promise<any>) {
        if (!this.inputContext || !this.mediaStream) return;

        this.source = this.inputContext.createMediaStreamSource(this.mediaStream);
        this.processor = this.inputContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
            if (!this.isConnected) return;

            const inputData = e.inputBuffer.getChannelData(0);
            
            // Visualization data
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            this.onVolumeLevel(rms * 100);

            // Convert to PCM 16-bit
            const pcmInt16 = floatTo16BitPCM(inputData);
            const base64Data = arrayBufferToBase64(pcmInt16.buffer);

            sessionPromise.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64Data
                    }
                });
            });
        };

        this.source.connect(this.processor);
        this.processor.connect(this.inputContext.destination);
    }

    private async handleServerMessage(message: LiveServerMessage) {
        const data = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        
        // Handle Audio Data
        if (data && this.outputContext && this.outputNode) {
            const arrayBuffer = base64ToArrayBuffer(data);
            const audioBuffer = await this.decodeRawPCM(arrayBuffer);
            
            const source = this.outputContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputNode);
            
            // Synchronization Logic
            const currentTime = this.outputContext.currentTime;
            if (this.nextStartTime < currentTime) {
                this.nextStartTime = currentTime;
            }
            
            // Track active sources for cancellation
            source.onended = () => {
                this.activeSources.delete(source);
            };
            this.activeSources.add(source);

            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
        }

        // Handle Interruption (User spoke while AI was speaking)
        if (message.serverContent?.interrupted) {
             console.log("Interruption detected: Stopping audio queue.");
             // Stop all currently playing audio chunks
             this.activeSources.forEach(source => {
                 try { source.stop(); } catch(e) {}
             });
             this.activeSources.clear();
             this.nextStartTime = 0;
        }
    }

    private async decodeRawPCM(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
        if (!this.outputContext) throw new Error("No output context");
        
        const dataView = new DataView(arrayBuffer);
        const float32Data = new Float32Array(arrayBuffer.byteLength / 2);
        
        for (let i = 0; i < float32Data.length; i++) {
            const int16 = dataView.getInt16(i * 2, true);
            float32Data[i] = int16 / 32768.0;
        }

        const audioBuffer = this.outputContext.createBuffer(1, float32Data.length, OUTPUT_SAMPLE_RATE);
        audioBuffer.copyToChannel(float32Data, 0);
        return audioBuffer;
    }

    disconnect() {
        this.isConnected = false;
        this.session = null;
        this.stopAudio();
    }

    private stopAudio() {
        // Stop playing audio
        this.activeSources.forEach(source => {
            try { source.stop(); } catch(e) {}
        });
        this.activeSources.clear();
        this.nextStartTime = 0;

        // Cleanup resources
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        if (this.inputContext) {
            this.inputContext.close();
            this.inputContext = null;
        }
        if (this.outputContext) {
            this.outputContext.close();
            this.outputContext = null;
        }
    }
}
