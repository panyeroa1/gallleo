import React, { useState, ChangeEvent, useMemo, useEffect, useRef } from 'react';
import { ProjectData, InputType } from '../types';

interface Props {
  onSubmit: (data: ProjectData) => void;
  onDataChange?: (data: Partial<ProjectData>) => void;
  isLoading: boolean;
  initialData?: ProjectData | null;
  existingBlueprint?: string;
}

const ProjectForm: React.FC<Props> = ({ onSubmit, onDataChange, isLoading, initialData, existingBlueprint }) => {
  // Defaults set to 18m x 24m as requested
  const [lotW, setLotW] = useState<number>(18);
  const [lotD, setLotD] = useState<number>(24);
  
  const [houseW, setHouseW] = useState<number>(10);
  const [houseD, setHouseD] = useState<number>(12);
  
  // Setbacks - Primary Inputs (Left and Front)
  const [setbackLeft, setSetbackLeft] = useState<number>(2);
  const [setbackFront, setSetbackFront] = useState<number>(4);

  // Derived Setbacks (Right and Back) - Raw calculation for validation
  const rawSetbackRight = lotW - houseW - setbackLeft;
  const rawSetbackBack = lotD - houseD - setbackFront;

  // Clamped for UI Display (so SVG doesn't break)
  const displaySetbackRight = Math.max(0, rawSetbackRight);
  const displaySetbackBack = Math.max(0, rawSetbackBack);
  
  // Validation Flags
  const isRightInvalid = rawSetbackRight < 0;
  const isBackInvalid = rawSetbackBack < 0;

  const [rooms, setRooms] = useState<number>(3);
  const [toilets, setToilets] = useState<number>(2);
  const [hasKitchen, setHasKitchen] = useState<boolean>(true);
  const [hasLiving, setHasLiving] = useState<boolean>(true);
  const [inputType, setInputType] = useState<InputType>('text_prompt');
  const [promptText, setPromptText] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<string[]>([]);
  
  // Ref to prevent loop when updating from initialData vs user input
  const isUpdatingFromParent = useRef(false);

  // Load initial data if editing or updated by Voice Agent
  useEffect(() => {
    if (initialData) {
      isUpdatingFromParent.current = true;
      setLotW(initialData.lotDimensions.widthMeters);
      setLotD(initialData.lotDimensions.depthMeters);
      setHouseW(initialData.houseDimensions.widthMeters);
      setHouseD(initialData.houseDimensions.depthMeters);
      setSetbackLeft(initialData.setbacks.left);
      setSetbackFront(initialData.setbacks.front);
      setRooms(initialData.roomsCount);
      setToilets(initialData.toiletsCount);
      setHasKitchen(initialData.hasKitchen);
      setHasLiving(initialData.hasLivingRoom);
      setInputType(initialData.inputType);
      if (initialData.inputPromptText) setPromptText(initialData.inputPromptText);
      if (initialData.uploadedImageBase64) setImageBase64(initialData.uploadedImageBase64);
      // Reset flag after a tick
      setTimeout(() => { isUpdatingFromParent.current = false; }, 0);
    }
  }, [initialData]);

  // Sync back to parent for Voice Agent Context
  useEffect(() => {
    if (onDataChange && !isUpdatingFromParent.current) {
        onDataChange({
            lotDimensions: { widthMeters: lotW, depthMeters: lotD },
            houseDimensions: { widthMeters: houseW, depthMeters: houseD },
            setbacks: {
                front: setbackFront,
                back: displaySetbackBack,
                left: setbackLeft,
                right: displaySetbackRight
            },
            roomsCount: rooms,
            toiletsCount: toilets,
            hasKitchen,
            hasLivingRoom: hasLiving,
            inputType,
            inputPromptText: promptText
        });
    }
  }, [lotW, lotD, houseW, houseD, setbackLeft, setbackFront, rooms, toilets, hasKitchen, hasLiving, inputType, promptText, onDataChange]);

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
    
    // Strict Setback Validation
    if (isRightInvalid) errs.push(`House width + Left setback (${houseW + setbackLeft}m) exceeds Lot Width (${lotW}m).`);
    if (isBackInvalid) errs.push(`House depth + Front setback (${houseD + setbackFront}m) exceeds Lot Depth (${lotD}m).`);
    
    if (inputType === 'text_prompt' && !promptText.trim()) errs.push("Text prompt is required.");
    if (inputType === 'image_upload' && !imageBase64) errs.push("Reference image is required.");

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const project: ProjectData = {
      id: initialData?.id || crypto.randomUUID(),
      createdAt: initialData?.createdAt || Date.now(),
      inputType,
      lotDimensions: { widthMeters: Number(lotW), depthMeters: Number(lotD) },
      houseDimensions: { widthMeters: Number(houseW), depthMeters: Number(houseD) },
      setbacks: {
        front: setbackFront,
        back: displaySetbackBack,
        left: setbackLeft,
        right: displaySetbackRight
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

  // Visualization Coordinates
  // SVG 0,0 is Top-Left. 
  // Let's assume Top of SVG is Back of Lot. Bottom of SVG is Front of Lot (Road).
  // X = Left to Right. Y = Back to Front.
  const padding = 2; // meters visual padding
  const svgWidth = lotW + (padding * 2);
  const svgHeight = lotD + (padding * 2) + 4; // Extra space for "Road" at bottom

  const lotX = padding;
  const lotY = padding;
  
  // House position
  // x = padding + setbackLeft
  // y = padding + (LotDepth - SetbackFront - HouseDepth) -> If Front is bottom
  const houseXPos = padding + setbackLeft;
  const houseYPos = padding + (lotD - setbackFront - houseD);

  return (
    <div className="max-w-7xl mx-auto bg-white p-8 rounded-lg shadow-lg border border-slate-200">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-2xl font-bold text-slate-800 font-mono">STEP 1: PLOT & STRUCTURE INITIALIZATION</h2>
         {initialData && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-mono border border-yellow-300">EDIT MODE</span>}
      </div>
      
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
            <div className="mt-3 grid grid-cols-2 gap-4 opacity-70">
              <div>
                 <span className="block text-[10px] uppercase text-slate-400">Right (Calc)</span>
                 <div className={`text-sm font-mono font-bold ${isRightInvalid ? 'text-red-500' : 'text-slate-600'}`}>
                    {rawSetbackRight.toFixed(1)}m
                 </div>
              </div>
              <div>
                 <span className="block text-[10px] uppercase text-slate-400">Back (Calc)</span>
                 <div className={`text-sm font-mono font-bold ${isBackInvalid ? 'text-red-500' : 'text-slate-600'}`}>
                    {rawSetbackBack.toFixed(1)}m
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visualization */}
        <div className={`lg:col-span-8 bg-slate-800 rounded-lg border ${isRightInvalid || isBackInvalid ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-700'} p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-inner transition-all`}>
           <h3 className="absolute top-4 left-4 text-xs font-bold uppercase text-slate-400">Site Plan Preview</h3>
           
           {/* SVG Plotter */}
           <div className="w-full h-[500px] flex items-center justify-center relative">
             <svg 
               width="100%" 
               height="100%" 
               viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
               preserveAspectRatio="xMidYMid meet"
               className="bg-transparent"
             >
                {/* Defs for patterns */}
                <defs>
                   <pattern id="smallGrid" width="1" height="1" patternUnits="userSpaceOnUse">
                     <path d="M 1 0 L 0 0 0 1" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.05"/>
                   </pattern>
                   <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                     <rect width="100" height="100" fill="url(#smallGrid)"/>
                     <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.1"/>
                   </pattern>
                   <marker id="arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
                      <path d="M0,0 L0,4 L4,2 z" fill="#f59e0b" />
                   </marker>
                </defs>

                {/* Plot Group */}
                <g>
                   {/* Road at Bottom */}
                   <rect 
                    x={0} 
                    y={lotD + (padding * 2)} 
                    width={svgWidth} 
                    height={4} 
                    fill="#334155"
                   />
                   <text x={svgWidth/2} y={lotD + (padding * 2) + 2.5} fill="#94a3b8" fontSize="1.5" textAnchor="middle" letterSpacing="0.2em" className="font-mono font-bold uppercase">Main Road / Access</text>

                   {/* Lot Boundary */}
                   <rect 
                     x={lotX} 
                     y={lotY} 
                     width={lotW} 
                     height={lotD} 
                     fill="#1e293b" 
                     stroke="#94a3b8" 
                     strokeWidth="0.3"
                     strokeDasharray="1,0.5"
                   />
                   
                   {/* Lot Dimension Labels */}
                   <text x={lotX + lotW/2} y={lotY - 0.5} fill="#94a3b8" fontSize="1" textAnchor="middle" className="font-mono">LOT WIDTH {lotW}m</text>
                   <text x={lotX - 0.5} y={lotY + lotD/2} fill="#94a3b8" fontSize="1" textAnchor="middle" transform={`rotate(-90, ${lotX - 0.5}, ${lotY + lotD/2})`} className="font-mono">LOT DEPTH {lotD}m</text>

                   {/* House Footprint */}
                   <rect 
                     x={houseXPos} 
                     y={houseYPos} 
                     width={houseW} 
                     height={houseD} 
                     fill={existingBlueprint ? "white" : (isRightInvalid || isBackInvalid ? '#ef4444' : '#3b82f6')}
                     stroke="white" 
                     strokeWidth="0.4"
                     className="drop-shadow-lg"
                     opacity={isRightInvalid || isBackInvalid ? 0.5 : 1}
                   />

                   {/* Generated Blueprint Overlay */}
                   {existingBlueprint && !isRightInvalid && !isBackInvalid && (
                     <image 
                        href={existingBlueprint} 
                        x={houseXPos} 
                        y={houseYPos} 
                        width={houseW} 
                        height={houseD}
                        preserveAspectRatio="none"
                        opacity="0.9"
                     />
                   )}
                   
                   {/* House Center Label - only show if no blueprint, or if blueprint is opaque/hard to read */}
                   {!existingBlueprint && (
                     <>
                        <text x={houseXPos + houseW/2} y={houseYPos + houseD/2} fill="white" fontSize="1.2" textAnchor="middle" className="font-bold font-mono">HOUSE</text>
                        <text x={houseXPos + houseW/2} y={houseYPos + houseD/2 + 1.5} fill="rgba(255,255,255,0.8)" fontSize="0.8" textAnchor="middle" className="font-mono">{houseW}m x {houseD}m</text>
                     </>
                   )}

                   {/* Setback Arrows & Labels */}
                   
                   {/* Left Setback */}
                   <line x1={lotX} y1={houseYPos + houseD/2} x2={houseXPos} y2={houseYPos + houseD/2} stroke="#f59e0b" strokeWidth="0.15" />
                   <text x={lotX + setbackLeft/2} y={houseYPos + houseD/2 - 0.5} fill="#f59e0b" fontSize="0.8" textAnchor="middle">{setbackLeft}m</text>

                   {/* Right Setback */}
                   <line x1={houseXPos + houseW} y1={houseYPos + houseD/2} x2={lotX + lotW} y2={houseYPos + houseD/2} stroke="#f59e0b" strokeWidth="0.15" />
                   <text x={houseXPos + houseW + displaySetbackRight/2} y={houseYPos + houseD/2 - 0.5} fill={isRightInvalid ? '#ef4444' : '#f59e0b'} fontSize="0.8" textAnchor="middle">{rawSetbackRight.toFixed(1)}m</text>

                   {/* Front Setback (Bottom) */}
                   <line x1={houseXPos + houseW/2} y1={houseYPos + houseD} x2={houseXPos + houseW/2} y2={lotY + lotD} stroke="#f59e0b" strokeWidth="0.15" />
                   <text x={houseXPos + houseW/2 + 0.5} y={houseYPos + houseD + setbackFront/2} fill="#f59e0b" fontSize="0.8" dominantBaseline="middle">{setbackFront}m (Front)</text>

                   {/* Back Setback (Top) */}
                   <line x1={houseXPos + houseW/2} y1={lotY} x2={houseXPos + houseW/2} y2={houseYPos} stroke="#f59e0b" strokeWidth="0.15" />
                   <text x={houseXPos + houseW/2 + 0.5} y={lotY + displaySetbackBack/2} fill={isBackInvalid ? '#ef4444' : '#f59e0b'} fontSize="0.8" dominantBaseline="middle">{rawSetbackBack.toFixed(1)}m (Back)</text>

                </g>
             </svg>
             
             {(isRightInvalid || isBackInvalid) && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg">
                    <div className="bg-red-600 text-white p-4 rounded shadow-xl max-w-sm text-center">
                        <h4 className="font-bold text-lg mb-1">BOUNDARY ERROR</h4>
                        <p className="text-sm">The house dimensions + setbacks exceed the lot boundaries.</p>
                    </div>
                 </div>
             )}
           </div>
           
           <div className="mt-4 flex space-x-6 text-xs font-mono text-slate-400">
              <span className="flex items-center"><div className="w-3 h-3 border border-slate-500 bg-slate-900 mr-2"></div> Lot</span>
              <span className="flex items-center"><div className={`w-3 h-3 ${existingBlueprint ? 'bg-white' : 'bg-blue-500'} border border-white mr-2`}></div> House</span>
              <span className="flex items-center"><div className="w-3 h-0.5 bg-yellow-500 mr-2"></div> Setbacks</span>
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
      <div className="flex space-x-4">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className={`flex-1 py-4 text-lg font-bold text-white rounded shadow-md transition-all flex justify-center items-center space-x-3 ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blueprint-500 hover:bg-blueprint-900'}`}
        >
          {isLoading && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <span>{isLoading ? (initialData ? 'REGENERATING BLUEPRINT...' : 'PROCESSING DATA STREAM...') : (initialData ? 'REGENERATE AERIAL BLUEPRINT' : 'GENERATE AERIAL BLUEPRINT')}</span>
        </button>
      </div>
    </div>
  );
};

export default ProjectForm;