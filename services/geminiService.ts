
import { GoogleGenAI, Type, Modality, Chat } from "@google/genai";
import { Question, Chapter, Course, User } from "../types";

// NOTE: In a production app, never expose keys on the client.
// We assume process.env.API_KEY is available via the build tool/environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper: Convert Base64 PCM to WAV Data URI ---
const pcmToWavDataUri = (base64Pcm: string, sampleRate: number = 24000): string => {
  const binaryString = atob(base64Pcm);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Convert Uint8Array (bytes) to Int16Array (PCM data)
  const pcmData = new Int16Array(bytes.buffer);
  
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const dataSize = pcmData.length * 2; // 16-bit = 2 bytes

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  
  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Combine header and data
  const wavBytes = new Uint8Array(header.byteLength + bytes.byteLength);
  wavBytes.set(new Uint8Array(header), 0);
  wavBytes.set(bytes, header.byteLength);

  // Convert to Base64 string for Data URI
  let binary = '';
  const wavLen = wavBytes.byteLength;
  for (let i = 0; i < wavLen; i++) {
    binary += String.fromCharCode(wavBytes[i]);
  }
  const base64Wav = btoa(binary);

  return `data:audio/wav;base64,${base64Wav}`;
};

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// --- AI Functions ---

export const generateCourseStructure = async (title: string, description: string): Promise<Chapter[]> => {
    // STRICTLY using Gemini 2.5 Flash for structure generation
    const modelId = "gemini-2.5-flash";
    const prompt = `
        Actúa como un diseñador de currículo experto.
        Crea un esquema de lecciones (capítulos) para el siguiente curso:
        Título: "${title}"
        Descripción: "${description}"

        Requisitos:
        1. Genera entre 4 y 6 capítulos lógicos y progresivos.
        2. Para cada capítulo, proporciona un título atractivo y un contenido HTML introductorio breve (2 párrafos).
        3. Estima los minutos de lectura.
        4. Devuelve SOLO JSON válido.
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        chapters: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    content: { type: Type.STRING },
                                    estimatedMinutes: { type: Type.INTEGER }
                                },
                                required: ["title", "content", "estimatedMinutes"]
                            }
                        }
                    }
                }
            }
        });

        const json = JSON.parse(response.text || "{}");
        if (!json.chapters) throw new Error("Formato inválido");

        return json.chapters.map((ch: any) => ({
            id: crypto.randomUUID(),
            title: ch.title,
            content: ch.content,
            estimatedMinutes: ch.estimatedMinutes
        }));
    } catch (error) {
        console.error("Structure Gen Error:", error);
        throw new Error("Error generando la estructura del curso.");
    }
};

export const generateLessonContent = async (courseTitle: string, chapterTitle: string): Promise<string> => {
    // STRICTLY using Gemini 2.5 Flash for content generation
    const modelId = "gemini-2.5-flash";
    const prompt = `
        Eres un experto diseñador instruccional corporativo.
        Escribe el contenido educativo para una lección de un curso.
        
        Curso: "${courseTitle}"
        Lección: "${chapterTitle}"
        
        Requisitos:
        1. Escribe en formato HTML limpio (sin markdown, solo etiquetas html como h2, h3, p, ul, li, strong).
        2. El tono debe ser profesional, educativo y motivador.
        3. Estructura: Introducción breve, 2 o 3 conceptos clave explicados con detalle, y una conclusión resumen.
        4. Usa listas (<ul>) para enumerar puntos importantes.
        5. NO incluyas las etiquetas <html>, <head> o <body>, solo el contenido del cuerpo.
        6. Idioma: Español.
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
        });
        
        let text = response.text || "";
        text = text.replace(/```html/g, '').replace(/```/g, '').trim();
        return text;
    } catch (error) {
        console.error("Content Gen Error:", error);
        throw new Error("No se pudo generar el contenido. Intenta de nuevo.");
    }
};

export const generateLessonAudio = async (text: string): Promise<string> => {
    const cleanText = text.replace(/<[^>]*>?/gm, '');
    const truncatedText = cleanText.slice(0, 500); 

    // STRICTLY using Gemini 2.5 Flash TTS
    const modelId = "gemini-2.5-flash-preview-tts";
    
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [{ text: truncatedText }]
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No se recibió audio de la IA");

        return pcmToWavDataUri(base64Audio, 24000);

    } catch (error) {
        console.error("Audio Gen Error:", error);
        throw new Error("No se pudo generar el audio.");
    }
};

export const generateDialogueAudio = async (narratorText: string, expertText: string): Promise<string> => {
    // STRICTLY using Gemini 2.5 Flash TTS
    const modelId = "gemini-2.5-flash-preview-tts";
    
    // Create script format
    const prompt = `
        Narrador: ${narratorText.slice(0, 300)}
        Experto: ${expertText.slice(0, 300)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            { 
                                speaker: 'Narrador', 
                                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } // Female, standard
                            },
                            { 
                                speaker: 'Experto', 
                                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } // Male, deep
                            }
                        ]
                    }
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No se recibió audio multi-voz");

        return pcmToWavDataUri(base64Audio, 24000);

    } catch (error) {
        console.error("Dialogue Gen Error:", error);
        throw new Error("Error en generación de diálogo.");
    }
}

export const generateQuizFromContent = async (
  chapters: Chapter[],
  numQuestions: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<Question[]> => {
  
  // STRICTLY using Gemini 2.5 Flash
  const modelId = "gemini-2.5-flash";

  let fullMaterial = "";
  chapters.forEach((ch, index) => {
    fullMaterial += `\n\n--- CAPÍTULO ${index + 1}: ${ch.title} ---\n${ch.content}`;
  });

  const prompt = `
    Eres un experto formador corporativo. 
    Crea un examen de opción múltiple basado estrictamente en el material proporcionado.
    Idioma: ESPAÑOL.
    
    Material:
    "${fullMaterial.slice(0, 30000)}"
    
    Requisitos:
    1. Genera ${numQuestions} preguntas.
    2. Dificultad: ${difficulty}.
    3. 4 opciones por pregunta.
    4. Proporciona el índice correcto (0-3).
    5. JSON válido.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctOptionIndex: { type: Type.INTEGER }
                },
                required: ["text", "options", "correctOptionIndex"]
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No se recibieron datos");

    const parsed = JSON.parse(jsonText);
    
    return parsed.questions.map((q: any) => ({
      id: crypto.randomUUID(),
      text: q.text,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex
    }));

  } catch (error) {
    console.error("Quiz Gen Error:", error);
    throw new Error("Error al generar el examen.");
  }
};

export const createTutorSession = (lessonContent: string) => {
    // STRICTLY using Gemini 2.5 Flash
    const modelId = "gemini-2.5-flash";
    const cleanContent = lessonContent.replace(/<[^>]*>?/gm, '');
    
    const chat: Chat = ai.chats.create({
        model: modelId,
        config: {
            systemInstruction: `Eres un tutor personal amable y experto. 
            Tu objetivo es ayudar al estudiante a entender el siguiente contenido de una lección.
            Responde de manera concisa, motivadora y en Español.
            Si la pregunta no está relacionada con el contenido, redirige amablemente al estudiante al tema.
            
            CONTENIDO DE LA LECCIÓN:
            "${cleanContent.substring(0, 20000)}"
            `
        }
    });
    return chat;
};

export interface RecommendationResult {
    courseId: string;
    reason: string;
}

export const recommendCourses = async (user: User, availableCourses: Course[]): Promise<RecommendationResult[]> => {
    if (availableCourses.length === 0) return [];
    
    // STRICTLY using Gemini 2.5 Flash
    const modelId = "gemini-2.5-flash";
    
    const courseList = availableCourses.map(c => `- ID: ${c.id}, Título: ${c.title}, Descripción: ${c.description}`).join('\n');
    const userProfile = `Puesto: ${user.jobTitle || 'Empleado'}.`;

    const prompt = `
        Eres un asesor de carrera con IA.
        Basado en el perfil del empleado y la lista de cursos disponibles, recomienda los 2 mejores cursos para su desarrollo profesional.
        
        Perfil del Empleado:
        ${userProfile}
        
        Cursos Disponibles:
        ${courseList}
        
        Requisitos:
        1. Devuelve un JSON con una lista de recomendaciones.
        2. Incluye el ID del curso y una razón breve y persuasiva (max 15 palabras) de por qué debería tomarlo.
        3. Solo recomienda 2 cursos.
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recommendations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    courseId: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                },
                                required: ["courseId", "reason"]
                            }
                        }
                    }
                }
            }
        });
        
        const json = JSON.parse(response.text || "{}");
        return json.recommendations || [];
    } catch (e) {
        console.error("Recommendation Error", e);
        return [];
    }
}
