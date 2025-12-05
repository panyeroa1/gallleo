import React, { useState, ChangeEvent, useMemo, useEffect, useRef } from 'react';
import { ProjectData, InputType, RoofType } from '../types';

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
  
  const [houseW, setHouseW] = useState<number>(12);
  const [houseD, setHouseD] = useState<number>(14);
  
  // Setbacks - Primary Inputs (Left and Front)
  const [setbackLeft, setSetbackLeft] = useState<number>(2);
  const [setbackFront, setSetbackFront] = useState<number>(7);

  // Derived Setbacks (Right and Back) - Raw calculation for validation
  const rawSetbackRight = lotW - houseW - setbackLeft;
  const rawSetbackBack = lotD - houseD - setbackFront;

  // Clamped for UI Display (so SVG doesn't break)
  const displaySetbackRight = Math.max(0, rawSetbackRight);
  const displaySetbackBack = Math.max(0, rawSetbackBack);
  
  // Validation Flags
  const isRightInvalid = rawSetbackRight < 0; // Width Issue
  const isBackInvalid = rawSetbackBack < 0;   // Depth Issue

  const [rooms, setRooms] = useState<number>(3);
  const [toilets, setToilets] = useState<number>(2);
  const [hasKitchen, setHasKitchen] = useState<boolean>(true);
  const [hasLiving, setHasLiving] = useState<boolean>(true);
  const [roofType, setRoofType] = useState<RoofType>('Flat');
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
      setRoofType(initialData.roofType);
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
            roofType,
            inputType,
            inputPromptText: promptText
        });
    }
  }, [lotW, lotD, houseW, houseD, setbackLeft, setbackFront, rooms, toilets, hasKitchen, hasLiving, roofType, inputType, promptText, onDataChange]);

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
    
    // Strict Setback Validation
    if (isRightInvalid) errs.push(`Boundary Error: House Width + Left Margin exceeds Lot Width.`);
    if (isBackInvalid) errs.push(`Boundary Error: House Depth + Front Margin exceeds Lot Depth.`);
    
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
      roofType,
      inputPromptText: promptText,
      uploadedImageBase64: imageBase64,
    };

    onSubmit(project);
  };

  // Visualization Coordinates
  // SVG 0,0 is Top-Left. 
  const padding = 2; // meters visual padding
  const svgWidth = lotW + (padding * 2);
  const svgHeight = lotD + (padding * 2) + 4; // Extra space for "Road" at bottom

  const lotX = padding;
  const lotY = padding;
  
  // House position
  const houseXPos = padding + setbackLeft;
  const houseYPos = padding + (lotD - setbackFront - houseD);

  const roofTypes: RoofType[] = ['Flat', 'Gabled', 'Hip', 'Shed'];

  const inputErrorClass = "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200";
  const inputNormalClass = "border-slate-300 bg-white focus:border-blue-500";

  // --- PROCEDURAL SCHEMATIC GENERATION ---
  // Simple algorithm to subdivide the house rectangle into "rooms" for the preview
  const generateSchematicRooms = useMemo(() => {
    // Only generate if valid
    if (isRightInvalid || isBackInvalid) return [];

    const rects: { x: number, y: number, w: number, h: number, label: string }[] = [];
    const totalUnits = rooms + toilets + (hasKitchen ? 1 : 0) + (hasLiving ? 1 : 0);
    
    // Start with full house
    let currentX = houseXPos;
    let currentY = houseYPos;
    let availableW = houseW;
    let availableH = houseD;
    
    const itemList = [];
    if (hasLiving) itemList.push('LIVING');
    if (hasKitchen) itemList.push('KITCHEN');
    for (let i=0; i<rooms; i++) itemList.push(`BED ${i+1}`);
    for (let i=0; i<toilets; i++) itemList.push(`BATH ${i+1}`);

    // Simple Binary Space Partitioning-ish approach
    // We alternate splitting vertically and horizontally
    
    const splitArea = (x: number, y: number, w: number, h: number, items: string[], depth: number) => {
        if (items.length === 0) return;
        if (items.length === 1) {
            rects.push({ x, y, w, h, label: items[0] });
            return;
        }

        const half = Math.ceil(items.length / 2);
        const firstBatch = items.slice(0, half);
        const secondBatch = items.slice(half);

        // Determine split direction based on aspect ratio
        if (w > h) {
             // Split Vertically (Left/Right)
             const splitRatio = firstBatch.length / items.length;
             const w1 = w * splitRatio;
             splitArea(x, y, w1, h, firstBatch, depth + 1);
             splitArea(x + w1, y, w - w1, h, secondBatch, depth + 1);
        } else {
             // Split Horizontally (Top/Bottom)
             const splitRatio = firstBatch.length / items.length;
             const h1 = h * splitRatio;
             splitArea(x, y, w, h1, firstBatch, depth + 1);
             splitArea(x, y + h1, w, h - h1, secondBatch, depth + 1);
        }
    };

    splitArea(currentX, currentY, availableW, availableH, itemList, 0);

    return rects;
  }, [houseW, houseD, houseXPos, houseYPos, rooms, toilets, hasKitchen, hasLiving, isRightInvalid, isBackInvalid]);


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
          <div className={`p-5 rounded border transition-colors ${isRightInvalid || isBackInvalid ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex justify-between items-center mb-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isRightInvalid || isBackInvalid ? 'text-red-600' : 'text-slate-500'}`}>1. Lot Boundary (Meters)</h3>
                {(isRightInvalid || isBackInvalid) && <span className="text-red-600 text-xs font-bold">⚠️ OVERFLOW</span>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Lot X (Width)</label>
                <input 
                  type="number" 
                  value={lotW} 
                  onChange={e => setLotW(Math.max(1, Number(e.target.value)))} 
                  className={`w-full p-2 border rounded font-mono text-slate-900 ${isRightInvalid ? inputErrorClass : inputNormalClass}`} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Lot Y (Depth)</label>
                <input 
                  type="number" 
                  value={lotD} 
                  onChange={e => setLotD(Math.max(1, Number(e.target.value)))} 
                  className={`w-full p-2 border rounded font-mono text-slate-900 ${isBackInvalid ? inputErrorClass : inputNormalClass}`} 
                />
              </div>
            </div>
          </div>

          {/* House Definition */}
          <div className={`p-5 rounded border transition-colors ${isRightInvalid || isBackInvalid ? 'border-red-200 bg-red-50/50' : 'border-blue-200 bg-blue-50'}`}>
             <div className="flex justify-between items-center mb-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isRightInvalid || isBackInvalid ? 'text-red-600' : 'text-blue-600'}`}>2. House Footprint (Meters)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-blue-400 mb-1">House X (Width)</label>
                <input 
                  type="number" 
                  value={houseW} 
                  onChange={e => setHouseW(Math.max(1, Number(e.target.value)))} 
                  className={`w-full p-2 border rounded font-mono text-slate-900 ${isRightInvalid ? inputErrorClass : 'border-blue-300 bg-white focus:border-blue-500'}`} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-blue-400 mb-1">House Y (Depth)</label>
                <input 
                  type="number" 
                  value={houseD} 
                  onChange={e => setHouseD(Math.max(1, Number(e.target.value)))} 
                  className={`w-full p-2 border rounded font-mono text-slate-900 ${isBackInvalid ? inputErrorClass : 'border-blue-300 bg-white focus:border-blue-500'}`} 
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
                  className={`w-full p-2 border rounded font-mono text-slate-900 ${isRightInvalid ? inputErrorClass : inputNormalClass}`} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Front Margin</label>
                <input 
                  type="number" 
                  value={setbackFront} 
                  onChange={e => setSetbackFront(Math.max(0, Number(e.target.value)))} 
                  className={`w-full p-2 border rounded font-mono text-slate-900 ${isBackInvalid ? inputErrorClass : inputNormalClass}`} 
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
        <div className={`lg:col-span-8 rounded-lg border-2 overflow-hidden shadow-2xl relative transition-all ${isRightInvalid || isBackInvalid ? 'border-red-500' : 'border-white'} bg-[#1e40af]`}>
           
           {/* Header Tag */}
           <div className="absolute top-0 left-0 bg-white/10 backdrop-blur text-white text-[10px] font-mono px-2 py-1 z-10 border-b border-r border-white/20">
               SCHEMATIC FLOORPLAN PREVIEW // SCALE 1:100
           </div>

           {/* SVG Plotter */}
           <div className="w-full h-[500px] flex items-center justify-center relative bg-[#1e40af]">
             <svg 
               width="100%" 
               height="100%" 
               viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
               preserveAspectRatio="xMidYMid meet"
               className="bg-[#1e40af]"
             >
                {/* Defs for Blueprint Patterns */}
                <defs>
                   {/* Major Grid */}
                   <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                     <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.1"/>
                   </pattern>
                   {/* Minor Grid */}
                   <pattern id="smallGrid" width="1" height="1" patternUnits="userSpaceOnUse">
                     <path d="M 1 0 L 0 0 0 1" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.05"/>
                   </pattern>
                   {/* Dimension Arrow */}
                   <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill="white" />
                   </marker>
                   {/* Hatching for walls */}
                   <pattern id="hatch" width="1" height="1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <line x1="0" y1="0" x2="0" y2="1" stroke="white" strokeWidth="0.1" />
                    </pattern>
                </defs>

                {/* Background Grids */}
                <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="url(#smallGrid)" />
                <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="url(#grid)" />

                {/* Plot Group */}
                <g>
                   {/* Lot Boundary (Dashed Line) */}
                   <rect 
                     x={lotX} 
                     y={lotY} 
                     width={lotW} 
                     height={lotD} 
                     fill="none" 
                     stroke="white" 
                     strokeWidth="0.2"
                     strokeDasharray="1,1"
                     opacity="0.5"
                   />
                   
                   {/* Lot Dimensions */}
                   <text x={lotX + lotW/2} y={lotY - 1} fill="white" fontSize="0.8" textAnchor="middle" className="font-mono opacity-60">{lotW}m</text>
                   <text x={lotX - 1} y={lotY + lotD/2} fill="white" fontSize="0.8" textAnchor="middle" transform={`rotate(-90, ${lotX - 1}, ${lotY + lotD/2})`} className="font-mono opacity-60">{lotD}m</text>

                   {/* House Footprint - Outer Walls */}
                   <rect 
                     x={houseXPos} 
                     y={houseYPos} 
                     width={houseW} 
                     height={houseD} 
                     fill="none"
                     stroke="white" 
                     strokeWidth="0.6" // Thick Blueprint Lines
                     className="drop-shadow-lg"
                     opacity={isRightInvalid || isBackInvalid ? 0.3 : 1}
                   />

                   {/* Procedural Schematic Rooms */}
                   {!existingBlueprint && !isRightInvalid && !isBackInvalid && generateSchematicRooms.map((room, idx) => (
                       <g key={idx}>
                           <rect 
                                x={room.x} 
                                y={room.y} 
                                width={room.w} 
                                height={room.h} 
                                fill="rgba(255,255,255,0.05)"
                                stroke="white"
                                strokeWidth="0.2"
                           />
                           <text 
                                x={room.x + room.w/2} 
                                y={room.y + room.h/2} 
                                fill="white" 
                                fontSize={Math.min(room.w, room.h) * 0.2} 
                                textAnchor="middle" 
                                dominantBaseline="middle"
                                className="font-mono font-bold"
                            >
                                {room.label}
                            </text>
                       </g>
                   ))}

                   {/* Generated Blueprint Overlay (If exists) */}
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
                   
                   {/* House Dimensions with Arrows */}
                   {/* Width Dimension */}
                   <line x1={houseXPos} y1={houseYPos - 1.5} x2={houseXPos + houseW} y2={houseYPos - 1.5} stroke="white" strokeWidth="0.15" markerEnd="url(#arrow)" markerStart="url(#arrow-start)" />
                   <line x1={houseXPos} y1={houseYPos} x2={houseXPos} y2={houseYPos - 2} stroke="white" strokeWidth="0.05" opacity="0.5" />
                   <line x1={houseXPos + houseW} y1={houseYPos} x2={houseXPos + houseW} y2={houseYPos - 2} stroke="white" strokeWidth="0.05" opacity="0.5" />
                   <text x={houseXPos + houseW/2} y={houseYPos - 2} fill="white" fontSize="0.8" textAnchor="middle" className="font-mono font-bold">{houseW}m</text>

                    {/* Depth Dimension */}
                   <line x1={houseXPos + houseW + 1.5} y1={houseYPos} x2={houseXPos + houseW + 1.5} y2={houseYPos + houseD} stroke="white" strokeWidth="0.15" />
                   <line x1={houseXPos + houseW} y1={houseYPos} x2={houseXPos + houseW + 2} y2={houseYPos} stroke="white" strokeWidth="0.05" opacity="0.5" />
                   <line x1={houseXPos + houseW} y1={houseYPos + houseD} x2={houseXPos + houseW + 2} y2={houseYPos + houseD} stroke="white" strokeWidth="0.05" opacity="0.5" />
                   <text x={houseXPos + houseW + 2.5} y={houseYPos + houseD/2} fill="white" fontSize="0.8" textAnchor="middle" transform={`rotate(90, ${houseXPos + houseW + 2.5}, ${houseYPos + houseD/2})`} className="font-mono font-bold">{houseD}m</text>

                </g>
             </svg>
             
             {/* Error Overlay */}
             {(isRightInvalid || isBackInvalid) && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-red-600 text-white p-6 shadow-2xl max-w-sm text-center border-4 border-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h4 className="font-mono font-bold text-xl mb-1 tracking-widest">BOUNDARY ERROR</h4>
                        <p className="font-mono text-sm">STRUCTURE EXCEEDS LOT LIMITS</p>
                    </div>
                 </div>
             )}
           </div>
           
           <div className="bg-[#172554] p-2 flex justify-between items-center text-[10px] font-mono text-blue-200 border-t border-white/10">
              <div className="flex space-x-4">
                  <span className="flex items-center"><div className="w-3 h-3 border border-white opacity-50 mr-2 border-dashed"></div> LOT BOUNDARY</span>
                  <span className="flex items-center"><div className="w-3 h-3 border-2 border-white mr-2"></div> HOUSE FOOTPRINT</span>
              </div>
              <div>
                  AUTO-GENERATED SCHEMATIC
              </div>
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
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="flex items-center space-x-2">
              <input type="checkbox" checked={hasKitchen} onChange={e => setHasKitchen(e.target.checked)} className="h-4 w-4 text-blueprint-500" />
              <label className="text-sm">Kitchen</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" checked={hasLiving} onChange={e => setHasLiving(e.target.checked)} className="h-4 w-4 text-blueprint-500" />
              <label className="text-sm">Living Room</label>
            </div>
          </div>
          
          {/* Roof Style Selector */}
          <div className="mt-6">
             <label className="block text-xs font-bold mb-2 uppercase text-slate-500">Roof Architecture</label>
             <div className="flex flex-wrap gap-2">
                {roofTypes.map(type => (
                    <button
                       key={type}
                       onClick={() => setRoofType(type)}
                       className={`px-3 py-2 text-sm rounded border transition-colors ${roofType === type ? 'bg-blueprint-500 text-white border-blueprint-600 shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                    >
                       {type}
                    </button>
                ))}
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
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded text-sm border border-red-200">
          <h4 className="font-bold mb-1 flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg> Validation Failed</h4>
          {errors.map((e, i) => <div key={i} className="ml-5">• {e}</div>)}
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