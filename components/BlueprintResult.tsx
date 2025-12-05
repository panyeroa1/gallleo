import React from 'react';
import { ProjectData, Blueprint } from '../types';

interface Props {
  project: ProjectData;
  blueprint: Blueprint;
  onGenerateViews: () => void;
  onRetake: () => void;
  onEdit: () => void; // Added onEdit prop
}

const BlueprintResult: React.FC<Props> = ({ project, blueprint, onGenerateViews, onRetake, onEdit }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 font-mono">STEP 1 COMPLETE: BLUEPRINT GENERATED</h2>
        <button onClick={onRetake} className="text-sm text-slate-500 hover:text-red-500 underline">
          New Project
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Visual */}
        <div className="lg:w-2/3 bg-white p-2 rounded-lg shadow-xl overflow-hidden relative group border border-slate-200">
          <img 
            src={blueprint.imageUrl} 
            alt="Generated Blueprint" 
            className="w-full h-auto object-contain"
          />
          <div className="absolute bottom-4 left-4 bg-slate-900 text-white text-xs p-2 rounded font-mono shadow">
            {project.houseDimensions.widthMeters}m x {project.houseDimensions.depthMeters}m
          </div>
        </div>

        {/* Info & Action */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
            <h3 className="font-bold text-lg mb-4 border-b pb-2">Specs</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex justify-between"><span>Lot:</span> <span className="font-mono font-bold">{project.lotDimensions.widthMeters}m x {project.lotDimensions.depthMeters}m</span></li>
              <li className="flex justify-between"><span>Footprint:</span> <span className="font-mono font-bold">{project.houseDimensions.widthMeters}m x {project.houseDimensions.depthMeters}m</span></li>
              <li className="flex justify-between"><span>Setbacks (F/B/L/R):</span> <span className="font-mono font-bold">{project.setbacks.front}/{project.setbacks.back}/{project.setbacks.left}/{project.setbacks.right}</span></li>
              <li className="flex justify-between"><span>Rooms:</span> <span className="font-mono font-bold">{project.roomsCount}</span></li>
              <li className="flex justify-between"><span>Toilets:</span> <span className="font-mono font-bold">{project.toiletsCount}</span></li>
            </ul>
          </div>

          <div className="space-y-3">
             <button 
                onClick={onEdit}
                className="w-full py-3 bg-yellow-500 text-white font-bold rounded hover:bg-yellow-600 transition-colors shadow flex items-center justify-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                <span>EDIT FLOORPLAN PARAMETERS</span>
              </button>

              <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                <h3 className="font-bold text-blue-900 text-lg mb-2">Ready for 3D?</h3>
                <p className="text-sm text-blue-800 mb-6">
                  Generate 5 photorealistic views based on this specific blueprint.
                </p>
                <button 
                  onClick={onGenerateViews}
                  className="w-full py-3 bg-blueprint-500 text-white font-bold rounded hover:bg-blueprint-900 transition-colors shadow-lg"
                >
                  GENERATE 5 VIEWS
                </button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlueprintResult;