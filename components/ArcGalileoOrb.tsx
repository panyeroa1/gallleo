import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import { MODEL_LIVE } from '../constants';
import { ProjectData } from '../types';
import { createPcmBlob, decodeAudioData } from '../utils/audioUtils';

interface Props {
  currentProjectState: Partial<ProjectData>;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  onTriggerGeneration: () => void;
}

// Tool Definition for updating specs
const updateBuildingSpecsTool: FunctionDeclaration = {
  name: "updateBuildingSpecs",
  description: "Updates the architectural specifications of the house project. Use this when the user wants to change dimensions, room counts, or setbacks.",
  parameters: {
    type: Type.OBJECT,
    properties: {
       houseWidth: { type: Type.NUMBER, description: "House width in meters" },
       houseDepth: { type: Type.NUMBER, description: "House depth in meters" },
       lotWidth: { type: Type.NUMBER, description: "Lot width in meters" },
       lotDepth: { type: Type.NUMBER, description: "Lot depth in meters" },
       rooms: { type: Type.NUMBER, description: "Number of bedrooms/rooms" },
       toilets: { type: Type.NUMBER, description: "Number of bathrooms/toilets" },
       hasKitchen: { type: Type.BOOLEAN },
       hasLivingRoom: { type: Type.BOOLEAN },
       setbackFront: { type: Type.NUMBER },
       setbackLeft: { type: Type.NUMBER }
    }
  }
};

const generateBlueprintTool: FunctionDeclaration = {
    name: "generateBlueprint",
    description: "Triggers the generation of the blueprint image. Call this when the user is satisfied with the specs and wants to see the result.",
    parameters: { type: Type.OBJECT, properties: {} }
};

const ArcGalileoOrb: React.FC<Props> = ({ currentProjectState, onUpdateProject, onTriggerGeneration }) => {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Gemini Session
  const sessionRef = useRef<any>(null);
  const currentProjectRef = useRef(currentProjectState);
  
  // Visualizer
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const visualizerFrameRef = useRef<number>(0);

  // Sync ref for tool usage
  useEffect(() => {
    currentProjectRef.current = currentProjectState;
  }, [currentProjectState]);

  const startSession = async () => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) return;
        
        // 1. Audio Setup
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        // Analyzer for visualizer
        const analyser = outputAudioContextRef.current.createAnalyser();
        analyser.fftSize = 32;
        analyserRef.current = analyser;

        // 2. Gemini Client
        const ai = new GoogleGenAI({ apiKey });
        
        const sessionPromise = ai.live.connect({
            model: MODEL_LIVE,
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: `You are Arc Galileo, an expert architectural assistant. 
                You speak fluent Taglish (Tagalog-English mix) in a natural, friendly, and professional tone.
                Example: "Sige, gawin nating 15 meters ang lapad." or "Ready na ba ang blueprint mo?"
                Your goal is to help the user design their floorplan.
                You have tools to update the dimensions and trigger the blueprint generation.
                When you update parameters, confirm the action verbally.
                CURRENT STATE: ${JSON.stringify(currentProjectRef.current)}`,
                tools: [
                    { functionDeclarations: [updateBuildingSpecsTool, generateBlueprintTool] }
                ]
            },
            callbacks: {
                onopen: () => {
                    console.log("Arc Galileo Connected");
                    setIsActive(true);
                    
                    // Start Input Stream
                    if (!inputAudioContextRef.current) return;
                    
                    const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                    sourceRef.current = source;
                    
                    const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                    processorRef.current = processor;
                    
                    processor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const blob = createPcmBlob(inputData);
                        sessionPromise.then(session => session.sendRealtimeInput({ media: blob }));
                    };
                    
                    source.connect(processor);
                    processor.connect(inputAudioContextRef.current.destination);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    // Handle Tool Calls
                    if (msg.toolCall) {
                        for (const fc of msg.toolCall.functionCalls) {
                            console.log("Tool Call:", fc.name, fc.args);
                            if (fc.name === 'updateBuildingSpecs') {
                                const updates: any = {};
                                // Map arguments to ProjectData structure
                                if (fc.args.houseWidth) updates.houseDimensions = { ...currentProjectRef.current.houseDimensions, widthMeters: fc.args.houseWidth };
                                if (fc.args.houseDepth) updates.houseDimensions = { ...currentProjectRef.current.houseDimensions, ...updates.houseDimensions, depthMeters: fc.args.houseDepth };
                                
                                if (fc.args.lotWidth) updates.lotDimensions = { ...currentProjectRef.current.lotDimensions, widthMeters: fc.args.lotWidth };
                                if (fc.args.lotDepth) updates.lotDimensions = { ...currentProjectRef.current.lotDimensions, ...updates.lotDimensions, depthMeters: fc.args.lotDepth };

                                if (fc.args.rooms !== undefined) updates.roomsCount = fc.args.rooms;
                                if (fc.args.toilets !== undefined) updates.toiletsCount = fc.args.toilets;
                                if (fc.args.hasKitchen !== undefined) updates.hasKitchen = fc.args.hasKitchen;
                                if (fc.args.hasLivingRoom !== undefined) updates.hasLivingRoom = fc.args.hasLivingRoom;
                                if (fc.args.setbackFront !== undefined) updates.setbacks = { ...currentProjectRef.current.setbacks, front: fc.args.setbackFront };
                                if (fc.args.setbackLeft !== undefined) updates.setbacks = { ...currentProjectRef.current.setbacks, ...updates.setbacks, left: fc.args.setbackLeft };

                                onUpdateProject(updates);
                                
                                sessionPromise.then(session => session.sendToolResponse({
                                    functionResponses: {
                                        id: fc.id,
                                        name: fc.name,
                                        response: { result: "Updated parameters successfully." }
                                    }
                                }));
                            } else if (fc.name === 'generateBlueprint') {
                                onTriggerGeneration();
                                sessionPromise.then(session => session.sendToolResponse({
                                    functionResponses: {
                                        id: fc.id,
                                        name: fc.name,
                                        response: { result: "Generation triggered." }
                                    }
                                }));
                            }
                        }
                    }

                    // Handle Audio Output
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && outputAudioContextRef.current) {
                        setIsSpeaking(true);
                        const buffer = await decodeAudioData(
                            base64ToUint8Array(audioData), // Helper needed here
                            outputAudioContextRef.current,
                            24000,
                            1
                        );
                        
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = buffer;
                        // Connect to analyser for visualization
                        source.connect(analyserRef.current!); 
                        analyserRef.current!.connect(outputAudioContextRef.current.destination);
                        
                        source.start();
                        source.onended = () => setIsSpeaking(false);
                    }
                },
                onclose: () => {
                    console.log("Arc Galileo Disconnected");
                    setIsActive(false);
                }
            }
        });
        
        sessionRef.current = sessionPromise;
        startVisualizer();

    } catch (e) {
        console.error("Failed to start Live session", e);
    }
  };

  const stopSession = () => {
     if (streamRef.current) {
         streamRef.current.getTracks().forEach(t => t.stop());
     }
     if (inputAudioContextRef.current) inputAudioContextRef.current.close();
     if (outputAudioContextRef.current) outputAudioContextRef.current.close();
     if (sessionRef.current) {
         sessionRef.current.then((s: any) => s.close());
     }
     setIsActive(false);
     cancelAnimationFrame(visualizerFrameRef.current);
  };

  // Helper for base64 decode in this file scope if not imported from util (since simple)
  const base64ToUint8Array = (base64: string): Uint8Array => {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
  };

  // Visualizer Loop
  const startVisualizer = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
          visualizerFrameRef.current = requestAnimationFrame(draw);
          analyserRef.current!.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, 60, 60);
          
          // Draw Orb Circle
          const centerX = 30;
          const centerY = 30;
          const radius = 25;
          
          // Breathing/Pulse effect based on volume
          const avg = dataArray.reduce((a, b) => a + b) / bufferLength;
          const scale = 1 + (avg / 255) * 0.3;

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.scale(scale, scale);
          
          // Gradient fill
          const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, radius);
          grad.addColorStop(0, '#60a5fa'); // Blue-400
          grad.addColorStop(1, '#1e3a8a'); // Blue-900
          
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, 2 * Math.PI);
          ctx.fillStyle = grad;
          ctx.fill();
          
          // Glow
          if (isActive) {
             ctx.shadowColor = '#3b82f6';
             ctx.shadowBlur = 15;
             ctx.strokeStyle = '#93c5fd';
             ctx.lineWidth = 2;
             ctx.stroke();
          }

          ctx.restore();
      };
      
      draw();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center">
      <div 
        className="w-[60px] h-[60px] rounded-full cursor-pointer relative transition-transform hover:scale-105"
        onClick={isActive ? stopSession : startSession}
        title={isActive ? "Disconnect Arc Galileo" : "Talk to Arc Galileo"}
      >
        <canvas 
            ref={canvasRef} 
            width={60} 
            height={60} 
            className="rounded-full"
        />
        {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="w-full h-full rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center opacity-90">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                 </div>
            </div>
        )}
      </div>
      {isActive && (
          <div className="mt-2 bg-slate-900/80 text-white text-[10px] px-2 py-1 rounded font-mono backdrop-blur-sm animate-fade-in">
              ARC GALILEO LIVE
          </div>
      )}
    </div>
  );
};

export default ArcGalileoOrb;