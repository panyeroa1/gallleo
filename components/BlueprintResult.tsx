import React from 'react';
import { ProjectData, Blueprint } from '../types';

interface Props {
  project: ProjectData;
  blueprint: Blueprint;
  onGenerateViews: () => void;
  onRetake: () => void;
}

const BlueprintResult: React.FC<Props> = ({ project, blueprint, onGenerateViews, onRetake }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 font-mono">STEP 1 COMPLETE: BLUEPRINT GENERATED</h2>
        <button onClick={onRetake} className="text-sm text-slate-500 hover:text-red-500 underline">
          Reset Project
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Visual */}
        <div className="lg:w-2/3 bg-slate-900 p-2 rounded-lg shadow-2xl overflow-hidden relative group">
          <img 
            src={blueprint.imageUrl} 
            alt="Generated Blueprint" 
            className="w-full h-auto object-contain border-4 border-white"
          />
          <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs p-2 rounded font-mono">
            {project.houseDimensions.widthMeters}m x {project.houseDimensions.houseDepth}m
          </div>
        </div>

        {/* Info & Action */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
            <h3 className="font-bold text-lg mb-4 border-b pb-2">Specs</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex justify-between"><span>Lot:</span> <span className="font-mono font-bold">{project.lotDimensions.widthMeters}m x {project.lotDimensions.depthMeters}m</span></li>
              <li className="flex justify-between"><span>Footprint:</span> <span className="font-mono font-bold">{project.houseDimensions.widthMeters}m x {project.houseDimensions.depthMeters}m</span></li>
              <li className="flex justify-between"><span>Rooms:</span> <span className="font-mono font-bold">{project.roomsCount}</span></li>
              <li className="flex justify-between"><span>Toilets:</span> <span className="font-mono font-bold">{project.toiletsCount}</span></li>
              <li className="flex justify-between"><span>Kitchen:</span> <span className="font-mono font-bold">{project.hasKitchen ? 'Yes' : 'No'}</span></li>
            </ul>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
            <h3 className="font-bold text-blue-900 text-lg mb-2">Proceed to Visualization?</h3>
            <p className="text-sm text-blue-800 mb-6">
              Generate 5 photorealistic views (Front, Back, Left, Right, Aerial) based on this specific blueprint.
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
  );
};

export default BlueprintResult;