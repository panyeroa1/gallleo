import { supabase } from '../utils/supabaseClient';
import { ProjectData, Blueprint, HouseViews } from '../types';

/**
 * Saves or updates the project state in Supabase.
 * We assume a 'projects' table exists with a JSONB 'data' column.
 */
export const saveProjectToSupabase = async (
  project: ProjectData, 
  blueprint?: Blueprint | null, 
  views?: HouseViews | null
) => {
  try {
    const payload = {
      id: project.id,
      created_at: new Date().toISOString(), // Update timestamp
      updated_at: new Date().toISOString(),
      project_data: project,
      blueprint_data: blueprint,
      views_data: views
    };

    // Upsert into 'projects' table. 
    // This requires the table to have columns: id (uuid, primary), data (jsonb) OR specific columns matching the payload.
    // For simplicity in this demo, we assume a flexible 'data' column or that we are sending specific fields if the table matches types.
    // Let's assume a table 'projects' with (id, data).
    
    const { error } = await supabase
      .from('projects')
      .upsert({ 
          id: project.id, 
          updated_at: new Date().toISOString(),
          data: payload 
      });

    if (error) {
      // If table doesn't exist, we log but don't crash the app
      console.warn("Eburon Persistence Log: Failed to save to Supabase.", error.message);
    } else {
      console.log("Eburon Persistence Log: Project synced to Supabase successfully.");
    }
  } catch (err) {
    console.error("Unexpected error saving to Supabase:", err);
  }
};