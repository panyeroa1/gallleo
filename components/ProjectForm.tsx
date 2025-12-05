import React, { useState, ChangeEvent, useMemo } from 'react';
import { ProjectData, InputType } from '../types';

interface Props {
  onSubmit: (data: ProjectData) => void;
  isLoading: boolean;
}

const ProjectForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  // Defaults set to 18m x 24m as requested
  const [lotW, setLotW] = useState<number>(18);
  const [lotD, setLotD] = useState<number>(24);
  
  const [houseW, setHouseW] = useState<number>(10);
  const [houseD, setHouseD] = useState<number>(12);
  
  // Setbacks - Primary Inputs (Left and Front)
  const [setbackLeft, setSetbackLeft] = useState<number>(2);
  const [setbackFront, setSetbackFront] = useState<number>(4);

  // Derived Setbacks (Right and Back)
  // We use Number() to ensure type safety in calculations
  const setbackRight = useMemo(() => Math.max(0, lotW - houseW - setbackLeft), [lotW, houseW, setbackLeft]);
  const setbackBack = useMemo(() => Math.max(0, lotD - houseD - setbackFront), [lotD, houseD, setbackFront]);

  const [rooms, setRooms] = useState<number>(3);
  const [toilets, setToilets] = useState<number>(2);
  const [hasKitchen, setHasKitchen] = useState<boolean>(true);
  const [hasLiving, setHasLiving] = useState<boolean>(true);
  const [inputType, setInputType] = useState<InputType>('text_prompt');
  const [promptText, setPromptText] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<string[]>([]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => [...prev, "Image too large (max 10MB)"]);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (lotW <= 0 || lotD <= 0 || houseW <= 0 || houseD <= 0) errs.push("All dimensions must be positive.");
    if (houseW > lotW) errs.push("House width cannot exceed Lot width.");
    if (houseD > lotD) errs.push("House depth cannot exceed Lot depth.");
    if ((houseW + setbackLeft) > lotW) errs.push("House + Left Setback exceeds Lot Width.");
    if ((houseD + setbackFront) > lotD) errs.push("House + Front Setback exceeds Lot Depth.");
    
    if (inputType === 'text_prompt' && !promptText.trim()) errs.push("Text prompt is required.");
    if (inputType === 'image_upload' && !imageBase64) errs.push("Reference image is required.");

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const project: ProjectData = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      inputType,
      lotDimensions: { widthMeters: Number(lotW), depthMeters: Number(lotD) },
      houseDimensions: { widthMeters: Number(houseW), depthMeters: Number(houseD) },
      setbacks: {
        front: setbackFront,
        back: setbackBack,
        left: setbackLeft,
        right: setbackRight
      },
      roomsCount: rooms,
      toiletsCount: toilets,
      hasKitchen,
      hasLivingRoom: hasLiving,
      inputPromptText: promptText,
      uploadedImageBase64: imageBase64,
    };

    onSubmit(project);
  };

  return (
    <div className="max-w-6xl mx-auto bg-white p-8 rounded-lg shadow-lg border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 font-mono">STEP 1: PLOT & STRUCTURE INITIALIZATION</h2>
      
      {/* Plot Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Lot Definition */}
          <div className="bg-slate-50 p-5 rounded border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">1. Lot Boundary (Meters)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Lot X (Width)</label>
                <input 
                  type="number" 
                  value={lotW} 
                  onChange={e => setLotW(Math.max(1, Number(e.target.value)))} 
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-900 bg-white" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Lot Y (Depth)</label>
                <input 
                  type="number" 
                  value={lotD} 
                  onChange={e => setLotD(Math.max(1, Number(e.target.value)))} 
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-900 bg-white" 
                />
              </div>
            </div>
          </div>

          {/* House Definition */}
          <div className="bg-blue-50 p-5 rounded border border-blue-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-3">2. House Footprint (Meters)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-blue-400 mb-1">House X (Width)</label>
                <input 
                  type="number" 
                  value={houseW} 
                  onChange={e => setHouseW(Math.max(1, Number(e.target.value)))} 
                  className="w-full p-2 border border-blue-300 rounded font-mono text-slate-900 bg-white focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-blue-400 mb-1">House Y (Depth)</label>
                <input 
                  type="number" 
                  value={houseD} 
                  onChange={e => setHouseD(Math.max(1, Number(e.target.value)))} 
                  className="w-full p-2 border border-blue-300 rounded font-mono text-slate-900 bg-white focus:border-blue-500" 
                />
              </div>
            </div>
          </div>

          {/* Setback Inputs */}
          <div className="bg-slate-50 p-5 rounded border border-slate-200">
             <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">3. Positioning (Setbacks)</h3>
             <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Left Margin</label>
                <input 
                  type="number" 
                  value={setbackLeft} 
                  onChange={e => setSetbackLeft(Math.max(0, Number(e.target.value)))} 
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-900 bg-white" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Front Margin</label>
                <input 
                  type="number" 
                  value={setbackFront} 
                  onChange={e => setSetbackFront(Math.max(0, Number(e.target.value)))} 
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-900 bg-white" 
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic">Right & Back margins are calculated automatically based on dimensions.</p>
          </div>
        </div>

        {/* Right Column: Visualization */}
        <div className="lg:col-span-8 bg-slate-100 rounded-lg border border-slate-300 p-6 flex flex-col items-center justify-center relative overflow-hidden">
           <h3 className="absolute top-4 left-4 text-xs font-bold uppercase text-slate-400">Plot Visualization</h3>
           
           {/* SVG Plotter */}
           <div className="w-full h-[400px] flex items-center justify-center">
             <svg 
               width="100%" 
               height="100%" 
               viewBox={`0 0 ${lotW * 1.2} ${lotD * 1.2}`} // Add padding
               preserveAspectRatio="xMidYMid meet"
               className="bg-white shadow-sm"
             >
                {/* Grid Pattern */}
                <defs>
                  <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
                    <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#f1f5f9" strokeWidth="0.1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Plot Group centered in viewBox */}
                <g transform={`translate(${lotW * 0.1}, ${lotD * 0.1})`}>
                  
                  {/* Lot Boundary */}
                  <rect 
                    x="0" y="0" 
                    width={lotW} height={lotD} 
                    fill="#f8fafc" 
                    stroke="#475569" 
                    strokeWidth="0.2"
                  />
                  <text x={lotW / 2} y={-0.5} fontSize="0.8" textAnchor="middle" fill="#64748b" className="font-mono">Lot Width: {lotW}m</text>
                  <text x={-0.5} y={lotD / 2} fontSize="0.8" textAnchor="middle" transform={`rotate(-90, -0.5, ${lotD/2})`} fill="#64748b" className="font-mono">Lot Depth: {lotD}m</text>

                  {/* House Footprint */}
                  <rect 
                    x={setbackLeft} 
                    y={lotD - houseD - setbackFront} // SVG y coordinates start from top, so we subtract from Lot Depth if Front is bottom
                    width={houseW} 
                    height={houseD} 
                    fill="#bfdbfe" // blue-200
                    stroke="#2563eb" // blueprint-500
                    strokeWidth="0.2"
                    opacity="0.9"
                  />
                  
                  {/* House Label */}
                  <text 
                    x={setbackLeft + houseW/2} 
                    y={(lotD - houseD - setbackFront) + houseD/2} 
                    fontSize="0.8" 
                    textAnchor="middle" 
                    dominantBaseline="middle"
                    fill="#1e3a8a" 
                    className="font-mono font-bold"
                  >
                    HOUSE
                    {houseW}x{houseD}
                  </text>

                  {/* Setback Indicators (Arrows) */}
                  
                  {/* Left */}
                  <line x1="0" y1={lotD/2} x2={setbackLeft} y2={lotD/2} stroke="#ef4444" strokeWidth="0.1" strokeDasharray="0.5,0.5" />
                  <text x={setbackLeft/2} y={lotD/2 - 0.5} fontSize="0.6" fill="#ef4444" textAnchor="middle">{setbackLeft}m</text>

                  {/* Right */}
                  <line x1={setbackLeft + houseW} y1={lotD/2} x2={lotW} y2={lotD/2} stroke="#ef4444" strokeWidth="0.1" strokeDasharray="0.5,0.5" />
                  <text x={lotW - (setbackRight/2)} y={lotD/2 - 0.5} fontSize="0.6" fill="#ef4444" textAnchor="middle">{setbackRight.toFixed(1)}m</text>

                  {/* Front (Bottom) */}
                  <line x1={lotW/2} y1={lotD} x2={lotW/2} y2={lotD - setbackFront} stroke="#ef4444" strokeWidth="0.1" strokeDasharray="0.5,0.5" />
                  <text x={lotW/2 + 0.5} y={lotD - (setbackFront/2)} fontSize="0.6" fill="#ef4444" dominantBaseline="middle">{setbackFront}m</text>

                  {/* Back (Top) */}
                  <line x1={lotW/2} y1={0} x2={lotW/2} y2={lotD - houseD - setbackFront} stroke="#ef4444" strokeWidth="0.1" strokeDasharray="0.5,0.5" />
                  <text x={lotW/2 + 0.5} y={(lotD - houseD - setbackFront)/2} fontSize="0.6" fill="#ef4444" dominantBaseline="middle">{setbackBack.toFixed(1)}m</text>

                </g>
             </svg>
           </div>
           
           <div className="mt-4 flex space-x-6 text-xs font-mono text-slate-500">
              <span className="flex items-center"><div className="w-3 h-3 border border-slate-500 bg-slate-50 mr-2"></div> Lot Boundary</span>
              <span className="flex items-center"><div className="w-3 h-3 border border-blue-500 bg-blue-200 mr-2"></div> House Footprint</span>
              <span className="flex items-center"><div className="w-3 h-0.5 bg-red-500 border-dashed mr-2"></div> Setbacks</span>
           </div>
        </div>
      </div>

      {/* Internal & Style Configuration (Bottom Row) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        
        {/* Internal */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Internal Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Rooms *</label>
              <input type="number" min={0} value={rooms} onChange={e => setRooms(parseInt(e.target.value))} className="w-full p-2 border border-slate-300 rounded text-slate-900 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Toilets *</label>
              <input type="number" min={0} value={toilets} onChange={e => setToilets(parseInt(e.target.value))} className="w-full p-2 border border-slate-300 rounded text-slate-900 bg-white" />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input type="checkbox" checked={hasKitchen} onChange={e => setHasKitchen(e.target.checked)} className="h-4 w-4 text-blueprint-500" />
              <label className="text-sm">Kitchen</label>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input type="checkbox" checked={hasLiving} onChange={e => setHasLiving(e.target.checked)} className="h-4 w-4 text-blueprint-500" />
              <label className="text-sm">Living Room</label>
            </div>
          </div>
        </div>

        {/* Input Method */}
        <div className="bg-slate-50 p-6 rounded border border-slate-200">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Source Material</h3>
          <div className="flex space-x-6 mb-4">
            <label className="flex items-center cursor-pointer">
              <input type="radio" name="inputType" checked={inputType === 'text_prompt'} onChange={() => setInputType('text_prompt')} className="mr-2" />
              <span className="text-sm font-medium">Text Prompt</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input type="radio" name="inputType" checked={inputType === 'image_upload'} onChange={() => setInputType('image_upload')} className="mr-2" />
              <span className="text-sm font-medium">Image Reference</span>
            </label>
          </div>

          {inputType === 'text_prompt' ? (
            <textarea
              className="w-full p-3 border border-slate-300 rounded h-24 text-sm text-slate-900 bg-white"
              placeholder="Describe the style, materials, and vibe (e.g., 'Modern minimalist, flat roof, large glass windows, concrete finish')..."
              value={promptText}
              onChange={e => setPromptText(e.target.value)}
            />
          ) : (
            <div className="space-y-2">
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleImageUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blueprint-50 file:text-blueprint-500 hover:file:bg-blueprint-100" />
              {imageBase64 && (
                <img src={imageBase64} alt="Preview" className="h-32 object-contain border border-slate-300 rounded bg-white" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded text-sm">
          {errors.map((e, i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      {/* Action */}
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className={`w-full py-4 text-lg font-bold text-white rounded shadow-md transition-all flex justify-center items-center space-x-3 ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blueprint-500 hover:bg-blueprint-900'}`}
      >
        {isLoading && (
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        <span>{isLoading ? 'PROCESSING DATA STREAM...' : 'GENERATE AERIAL BLUEPRINT'}</span>
      </button>
    </div>
  );
};

export default ProjectForm;