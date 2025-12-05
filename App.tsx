import React, { useState } from 'react';
import { AppStep, ProjectData, Blueprint, HouseViews } from './types';
import ProjectForm from './components/ProjectForm';
import BlueprintResult from './components/BlueprintResult';
import ViewsGallery from './components/ViewsGallery';
import ArcGalileoOrb from './components/ArcGalileoOrb';
import { generateBlueprint, generateFiveViews } from './services/geminiService';
import { saveProjectToSupabase } from './services/supabaseService';
import { APP_NAME } from './constants';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.PROJECT_DETAILS);
  // Current "Draft" project state, used for Live Editing
  const [project, setProject] = useState<ProjectData>({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      inputType: 'text_prompt',
      lotDimensions: { widthMeters: 18, depthMeters: 24 },
      houseDimensions: { widthMeters: 12, depthMeters: 14 },
      setbacks: { front: 7, back: 3, left: 2, right: 4 }, // Defaults: Right=4, Back=3 based on dimensions
      roomsCount: 3,
      toiletsCount: 2,
      hasKitchen: true,
      hasLivingRoom: true,
      roofType: 'Flat',
      inputPromptText: '',
      uploadedImageBase64: undefined
  });
  
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [views, setViews] = useState<HouseViews | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [extraInstructions, setExtraInstructions] = useState<string>('');

  // Handler for form updates (manual or voice)
  const handleDataChange = (updates: Partial<ProjectData>) => {
      setProject(prev => {
          // Merge logic to ensure nested objects don't get blown away if only partial
          return { ...prev, ...updates };
      });
  };

  const handleProjectSubmit = async (data: ProjectData) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Initializing Eburon Engine...');
    // Update the master state one last time
    setProject(data);
    
    try {
      // Pass a status callback to update the UI during the enhancement phase
      const result = await generateBlueprint(data, (msg) => {
          setLoadingMessage(msg);
      });
      setBlueprint(result);
      setStep(AppStep.BLUEPRINT_RESULT);
      
      // Auto-save to Supabase
      saveProjectToSupabase(data, result, null);
      
    } catch (error) {
      alert(`Error generating blueprint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleGenerateViews = async () => {
    if (!project || !blueprint) return;
    
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Initializing Render Cluster...');
    
    try {
      const result = await generateFiveViews(project, blueprint, extraInstructions, (progress) => {
        setLoadingProgress(progress);
        
        // Dynamic technical feedback based on progress percentage
        if (progress <= 20) {
            setLoadingMessage('Analyzing structural geometry & rendering Front Facade...');
        } else if (progress <= 40) {
            setLoadingMessage('Computing depth maps for Rear Elevation...');
        } else if (progress <= 60) {
            setLoadingMessage('Generating lateral Side Profiles (Left/Right)...');
        } else if (progress <= 80) {
            setLoadingMessage('Synthesizing Aerial Drone Perspective...');
        } else {
            setLoadingMessage('Finalizing high-resolution textures & lighting...');
        }
      });
      setViews(result);
      setStep(AppStep.VIEWS_GENERATION);
      
      // Auto-save to Supabase
      saveProjectToSupabase(project, blueprint, result);

    } catch (error) {
       alert(`Error generating views: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleEdit = () => {
    // Go back to form but keep project data
    setStep(AppStep.PROJECT_DETAILS);
    // Project state remains populated, so ProjectForm will pick it up via initialData
  };

  const handleReset = () => {
    setStep(AppStep.PROJECT_DETAILS);
    // Reset to defaults
    setProject({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      inputType: 'text_prompt',
      lotDimensions: { widthMeters: 18, depthMeters: 24 },
      houseDimensions: { widthMeters: 12, depthMeters: 14 },
      setbacks: { front: 7, back: 3, left: 2, right: 4 },
      roomsCount: 3,
      toiletsCount: 2,
      hasKitchen: true,
      hasLivingRoom: true,
      roofType: 'Flat',
      inputPromptText: '',
      uploadedImageBase64: undefined
    });
    setBlueprint(null);
    setViews(null);
    setExtraInstructions('');
    setLoadingProgress(0);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      {/* Header */}
      <header className="bg-slate-900 text-white py-4 px-6 shadow-md flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blueprint-500 rounded flex items-center justify-center font-bold text-xl font-mono">E</div>
            <h1 className="text-xl font-bold tracking-widest font-mono">{APP_NAME}</h1>
        </div>
        <div className="text-xs font-mono text-slate-400 hidden md:block">
            V.2.5.0 // SYSTEM READY
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow bg-slate-50 p-6 md:p-12 relative">
        
        {/* Global Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm transition-opacity duration-300">
            {/* Spinner */}
            <div className="w-16 h-16 border-4 border-blueprint-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            
            <p className="text-lg font-mono animate-pulse mb-4 tracking-wide">{loadingMessage}</p>
            
            {/* Progress Bar */}
            <div className="w-80 h-3 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700 shadow-inner">
                 <div 
                   className="h-full bg-blueprint-500 shadow-[0_0_10px_rgba(37,99,235,0.7)] transition-all duration-300 ease-out"
                   style={{ width: `${loadingProgress}%` }}
                 ></div>
            </div>
            {loadingProgress > 0 && <p className="text-xs font-mono text-blueprint-300 mt-2">{loadingProgress}% COMPLETE</p>}
          </div>
        )}

        {step === AppStep.PROJECT_DETAILS && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-10 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-3 text-slate-900">
                {blueprint ? 'Edit Project Parameters' : 'Start New Project'}
              </h2>
              <p className="text-slate-600">Define dimensional constraints and style parameters. The system will generate a structural blueprint followed by photorealistic renderings.</p>
            </div>
            <ProjectForm 
              onSubmit={handleProjectSubmit} 
              onDataChange={handleDataChange}
              isLoading={isLoading} 
              initialData={project}
              existingBlueprint={blueprint?.imageUrl}
            />
          </div>
        )}

        {step === AppStep.BLUEPRINT_RESULT && project && blueprint && (
          <div className="animate-fade-in">
             <div className="mb-4 max-w-6xl mx-auto bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Refinement:</strong> Before generating views, you can add specific architectural notes.
                    </p>
                    <input 
                      type="text" 
                      className="mt-2 w-full p-2 border border-yellow-200 rounded text-sm text-slate-900 bg-white" 
                      placeholder="Optional: e.g., 'Use dark brick, large glass panels, industrial style'"
                      value={extraInstructions}
                      onChange={(e) => setExtraInstructions(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            <BlueprintResult 
              project={project} 
              blueprint={blueprint} 
              onGenerateViews={handleGenerateViews} 
              onRetake={handleReset}
              onEdit={handleEdit}
            />
          </div>
        )}

        {step === AppStep.VIEWS_GENERATION && project && blueprint && views && (
          <div className="animate-fade-in">
            <ViewsGallery 
              project={project} 
              blueprint={blueprint} 
              views={views} 
              onReset={handleReset} 
            />
          </div>
        )}

        {/* Arc Galileo Orb - Live Conversational Agent */}
        <ArcGalileoOrb 
            currentProjectState={project} 
            onUpdateProject={handleDataChange} 
            onTriggerGeneration={() => handleProjectSubmit(project)}
        />
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 py-6 text-center text-xs text-slate-500 font-mono border-t border-slate-200">
        &copy; {new Date().getFullYear()} EBURON SYSTEMS. POWERED BY GEMINI 2.5.
      </footer>
    </div>
  );
};

export default App;