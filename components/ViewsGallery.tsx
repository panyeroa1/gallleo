import React, { useState } from 'react';
import { ProjectData, Blueprint, HouseViews } from '../types';

interface Props {
  project: ProjectData;
  blueprint: Blueprint;
  views: HouseViews;
  onReset: () => void;
}

const ViewsGallery: React.FC<Props> = ({ project, blueprint, views, onReset }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const viewItems = [
    { label: 'FRONT FACADE', src: views.views.front },
    { label: 'REAR ELEVATION', src: views.views.back },
    { label: 'LEFT PROFILE', src: views.views.left },
    { label: 'RIGHT PROFILE', src: views.views.right },
    { label: 'AERIAL PERSPECTIVE', src: views.views.aerial },
  ];

  const handleDownload = (src: string, label: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `Eburon_${project.id}_${label}.png`;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-end mb-8 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 font-mono tracking-tighter">PROJECT RENDER COMPLETE</h2>
          <p className="text-slate-500 text-sm mt-1">ID: {project.id.split('-')[0].toUpperCase()}</p>
        </div>
        <button onClick={onReset} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded hover:bg-slate-300">
          NEW PROJECT
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Blueprint Reference - Sticky if screen is large */}
        <div className="lg:col-span-1">
          <div className="bg-white p-4 rounded shadow border border-slate-200 sticky top-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Source Blueprint</h3>
            <img src={blueprint.imageUrl} alt="Blueprint" className="w-full border border-slate-100" />
            <div className="mt-4 text-xs text-slate-500 font-mono space-y-1">
               <p>W: {project.houseDimensions.widthMeters}m / D: {project.houseDimensions.depthMeters}m</p>
               <p>Prompt: {project.inputType === 'text_prompt' ? 'Text' : 'Image Ref'}</p>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {viewItems.map((item, idx) => (
            <div key={idx} className={`group relative bg-black rounded overflow-hidden aspect-video ${item.label === 'AERIAL PERSPECTIVE' ? 'md:col-span-2' : ''}`}>
              <img 
                src={item.src} 
                alt={item.label} 
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => setSelectedImage(item.src)}
              />
              <div className="absolute top-0 left-0 bg-black/60 text-white text-[10px] font-bold px-2 py-1 font-mono uppercase">
                {item.label}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(item.src, item.label);
                }}
                className="absolute bottom-2 right-2 bg-white/10 hover:bg-white/30 p-2 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Download"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Full View" className="max-w-full max-h-full shadow-2xl" />
          <button className="absolute top-4 right-4 text-white text-4xl">&times;</button>
        </div>
      )}
    </div>
  );
};

export default ViewsGallery;