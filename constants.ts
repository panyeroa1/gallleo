export const APP_NAME = "EBURON ARCHITECT";
export const API_KEY_ENV = process.env.API_KEY;

// Models
export const MODEL_BLUEPRINT = 'gemini-2.5-flash-image'; 
export const MODEL_VIEWS = 'gemini-2.5-flash-image';

// Prompts
export const BLUEPRINT_SYSTEM_PROMPT = `You are a precise architectural engine. 
Your task is to generate a high-contrast, professional 2D architectural blueprint (floor plan) seen from a straight top-down aerial view.
Style: Technical drawing, white background, blue or black lines.
Clearly indicate walls, windows, and doors.
Do not include 3D perspectives or landscaping unless part of the lot limits.
Focus on the layout accuracy based on dimensions provided.`;

export const VIEWS_SYSTEM_PROMPT = `You are an architectural visualization renderer.
Your task is to generate a photorealistic exterior view of a house based on a provided floor plan blueprint.
Style: Modern, clean, realistic lighting. 
Respect the structural footprint shown in the blueprint.
Maintain consistency in materials (e.g., concrete, wood, glass) across different viewing angles.`;