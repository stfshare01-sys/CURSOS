import { GoogleGenerativeAI } from "@google/generative-ai";
import { Course, Chapter, Quiz, Question, CourseStatus } from "../types";

// 1. Inicializamos Gemini con tu API KEY segura
const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  console.error("🚨 Faltan las credenciales de API en .env");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// 2. Definimos la estructura exacta que queremos que la IA devuelva (Schema)
// Esto evita que la IA alucine y nos devuelva texto plano en lugar de datos.
const COURSE_GENERATION_PROMPT = `
Eres un Diseñador Instruccional experto y un Arquitecto de Datos JSON.
Tu tarea es crear un curso completo sobre el tema solicitado.

IMPORTANTE: Tu respuesta debe ser ESTRICTAMENTE un objeto JSON válido.
No incluyas markdown, ni bloques de código \`\`\`, ni texto introductorio. Solo el JSON puro.

La estructura del JSON debe cumplir con esta interfaz TypeScript:

interface Response {
  title: string;
  description: string;
  coverImageKeyword: string; // Una palabra clave en inglés para buscar una imagen en Unsplash
  chapters: Array<{
    title: string;
    content: string; // Contenido educativo detallado en formato Markdown (usa negritas, listas, subtítulos)
    estimatedMinutes: number;
  }>;
  quiz: {
    passingScore: number; // Por defecto 80
    questions: Array<{
      text: string;
      options: string[]; // 4 opciones
      correctOptionIndex: number; // 0, 1, 2 o 3
    }>;
  };
}

Reglas de contenido:
1. El curso debe tener entre 3 y 5 capítulos.
2. El contenido de cada capítulo debe ser sustancial (mínimo 3 párrafos).
3. El Quiz debe tener 5 preguntas desafiantes.
4. El tono debe ser profesional pero accesible.
`;

export const generateCourseWithAI = async (topic: string, level: string = 'Intermedio'): Promise<Course> => {
  try {
    // Usamos el modelo Flash porque es rápido y barato para JSON
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `${COURSE_GENERATION_PROMPT}
    
    TEMA DEL CURSO: "${topic}"
    NIVEL: "${level}"
    
    Genera el JSON ahora:`;

    console.log(`🤖 Preguntándole a Gemini sobre: ${topic}...`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 3. Limpieza y Parseo del JSON
    // A veces la IA envuelve el JSON en ```json ... ```, hay que limpiarlo.
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(cleanJson);

    // 4. Transformación final (Hydration)
    // La IA nos da los datos "crudos", nosotros le ponemos los IDs y fechas del sistema.
    const aiCourse: Course = {
      id: crypto.randomUUID(), // Generamos ID único
      title: data.title,
      description: data.description,
      status: 'DRAFT' as CourseStatus, // Siempre nace como borrador
      createdAt: Date.now(),
      coverImage: `https://source.unsplash.com/800x600/?${encodeURIComponent(data.coverImageKeyword)}`, // Truco para imagen automática
      chapters: data.chapters.map((ch: any) => ({
        id: crypto.randomUUID(),
        title: ch.title,
        content: ch.content,
        estimatedMinutes: ch.estimatedMinutes || 10,
        videoInteractions: []
      })),
      quiz: {
        passingScore: data.quiz.passingScore || 80,
        questions: data.quiz.questions.map((q: any) => ({
          id: crypto.randomUUID(),
          text: q.text,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex
        }))
      },
      requiresSignature: false,
      resources: [],
      prerequisites: []
    };

    return aiCourse;

  } catch (error) {
    console.error("❌ Error generando curso con IA:", error);
    throw new Error("No se pudo generar el curso. Intenta de nuevo.");
  }
};