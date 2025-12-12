
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Bold, Italic, Underline, 
  AlignLeft, AlignCenter, AlignRight, 
  MessageSquare, Palette, List, 
  Heading1, Heading2, Quote
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  
  // Use a ref to track the content we *expect* to be in the editor.
  // This prevents the loop where formatting changes trigger an update -> parent update -> prop update -> reset innerHTML -> lose cursor.
  const lastHtmlRef = useRef(value);
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  // Initial load and external reset handling
  useEffect(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.innerHTML;
      // Only update DOM if the prop is different from what we last emitted AND different from current DOM
      if (value !== lastHtmlRef.current && value !== currentContent) {
        editorRef.current.innerHTML = value;
        lastHtmlRef.current = value;
      }
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newHtml = editorRef.current.innerHTML;
      lastHtmlRef.current = newHtml;
      onChange(newHtml);
    }
  }, [onChange]);

  // Command Helper
  const exec = (command: string, arg?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    handleInput(); // Sync changes immediately
  };

  // Button Handler: Prevents focus loss
  const handleBtnClick = (e: React.MouseEvent, cmd: string, arg?: string) => {
    e.preventDefault();
    exec(cmd, arg);
  };

  // Color Picker Helpers
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      setSavedRange(sel.getRangeAt(0));
    }
  };

  const triggerColorPicker = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    colorInputRef.current?.click();
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Restore selection before applying color
    if (editorRef.current && savedRange) {
        editorRef.current.focus();
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(savedRange);
        }
    }
    exec('foreColor', e.target.value);
  };

  const insertDialogue = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Save selection
    const sel = window.getSelection();
    let range: Range | null = null;
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0);
    }

    const name = prompt("Nombre del Personaje (ej. Ana):");
    if (!name) return;
    const message = prompt("Mensaje del personaje:");
    if (!message) return;
    
    // Restore selection
    if (editorRef.current) {
      editorRef.current.focus();
      if (range) {
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }

    // Determine color theme
    const colors = [
        { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', avatarBg: '#dbeafe', avatarText: '#1e3a8a' }, // Blue
        { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', avatarBg: '#dcfce7', avatarText: '#14532d' }, // Green
        { bg: '#faf5ff', border: '#e9d5ff', text: '#6b21a8', avatarBg: '#f3e8ff', avatarText: '#581c87' }, // Purple
        { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', avatarBg: '#ffedd5', avatarText: '#7c2d12' }  // Orange
    ];
    const theme = colors[name.length % colors.length];
    
    // Use standard HTML for portability
    const html = `
      <div style="display: flex; gap: 12px; margin: 16px 0; align-items: flex-start; font-family: ui-sans-serif, system-ui, sans-serif;">
         <div style="width: 36px; height: 36px; border-radius: 50%; background-color: ${theme.avatarBg}; color: ${theme.avatarText}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0; border: 2px solid ${theme.border}; text-transform: uppercase;">
            ${name.substring(0, 2)}
         </div>
         <div style="background-color: ${theme.bg}; border: 1px solid ${theme.border}; border-radius: 0 12px 12px 12px; padding: 10px 14px; max-width: 85%; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; color: ${theme.avatarText}; margin-bottom: 2px;">${name}</div>
            <div style="font-size: 15px; line-height: 1.5; color: #1e293b;">${message}</div>
         </div>
      </div>
      <p><br/></p>
    `;
    
    document.execCommand('insertHTML', false, html);
    handleInput();
  };

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col h-96">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 flex-wrap select-none">
        
        {/* Style Group */}
        <div className="flex bg-white rounded border border-slate-200 p-0.5 shadow-sm">
            <ToolbarBtn icon={Bold} label="Negrita (Ctrl+B)" onClick={(e) => handleBtnClick(e, 'bold')} />
            <ToolbarBtn icon={Italic} label="Cursiva (Ctrl+I)" onClick={(e) => handleBtnClick(e, 'italic')} />
            <ToolbarBtn icon={Underline} label="Subrayado (Ctrl+U)" onClick={(e) => handleBtnClick(e, 'underline')} />
        </div>

        {/* Alignment Group */}
        <div className="flex bg-white rounded border border-slate-200 p-0.5 ml-1 shadow-sm">
            <ToolbarBtn icon={AlignLeft} label="Izquierda" onClick={(e) => handleBtnClick(e, 'justifyLeft')} />
            <ToolbarBtn icon={AlignCenter} label="Centro" onClick={(e) => handleBtnClick(e, 'justifyCenter')} />
            <ToolbarBtn icon={AlignRight} label="Derecha" onClick={(e) => handleBtnClick(e, 'justifyRight')} />
        </div>

        {/* Format Group */}
        <div className="flex bg-white rounded border border-slate-200 p-0.5 ml-1 shadow-sm">
            <ToolbarBtn icon={Heading1} label="Título Grande" onClick={(e) => handleBtnClick(e, 'formatBlock', 'H2')} />
            <ToolbarBtn icon={Heading2} label="Subtítulo" onClick={(e) => handleBtnClick(e, 'formatBlock', 'H3')} />
            <ToolbarBtn icon={Quote} label="Cita Bloque" onClick={(e) => handleBtnClick(e, 'formatBlock', 'BLOCKQUOTE')} />
            <ToolbarBtn icon={List} label="Lista de Puntos" onClick={(e) => handleBtnClick(e, 'insertUnorderedList')} />
        </div>

        {/* Color Picker */}
        <div className="flex bg-white rounded border border-slate-200 p-0.5 ml-1 shadow-sm">
            <button
                type="button"
                onMouseDown={triggerColorPicker}
                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                title="Color de Texto"
            >
                <Palette className="w-4 h-4" />
            </button>
            <input 
                ref={colorInputRef}
                type="color" 
                className="w-0 h-0 opacity-0 absolute"
                onChange={handleColorChange}
            />
        </div>

        <div className="flex-1"></div>

        {/* Special Insert */}
        <button
          type="button"
          onMouseDown={insertDialogue}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          title="Insertar burbuja de diálogo"
        >
          <MessageSquare className="w-3 h-3" />
          Diálogo
        </button>
      </div>

      {/* Editing Area */}
      <div
        ref={editorRef}
        className="flex-1 p-6 overflow-y-auto focus:outline-none prose prose-slate max-w-none prose-p:my-2 prose-headings:mb-2 prose-headings:mt-4 prose-blockquote:border-l-4 prose-blockquote:border-indigo-300 prose-blockquote:bg-indigo-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:italic"
        contentEditable
        onInput={handleInput}
        style={{ minHeight: '200px' }}
        dangerouslySetInnerHTML={{ __html: value }}
      />
      
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
        <span>STUFFACTORY Editor v2.1</span>
        <span className="flex items-center gap-1">
            {value.length} caracteres HTML
        </span>
      </div>
    </div>
  );
};

// Sub-component for buttons
const ToolbarBtn = ({ icon: Icon, onClick, label }: any) => (
    <button
        type="button"
        onMouseDown={onClick}
        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
        title={label}
    >
        <Icon className="w-4 h-4" />
    </button>
);
