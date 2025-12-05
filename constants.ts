export const APP_NAME = "EBURON ARCHITECT";
export const API_KEY_ENV = process.env.API_KEY;

// Models
export const MODEL_BLUEPRINT = 'gemini-2.5-flash-image'; 
export const MODEL_VIEWS = 'gemini-2.5-flash-image';
export const MODEL_LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025';

// Prompts
export const BLUEPRINT_SYSTEM_PROMPT = `You are a technical architectural drafter.
Task: Generate a professional 2D floor plan blueprint.

VISUAL STYLE GUIDE (STRICT COMPLIANCE REQUIRED):
1. WALLS: Solid BLACK fill. Uniform thickness (approx 20-30cm). High contrast.
2. BACKGROUND: Pure WHITE (#FFFFFF).
3. DOORS: Thin line quarter-circle arcs showing swing direction.
4. WINDOWS: Thin double lines embedded in walls.
5. FLOOR: Pure WHITE. NO textures (no wood grain, tiles, or carpet).
6. FIXTURES: Show fixed elements (toilets, sinks, counters) in thin black lines.
7. FURNITURE: DO NOT show movable furniture (beds, sofas, tables) to ensure blueprint clarity.
8. PERSPECTIVE: Strictly 2D Top-Down. NO shadows, NO 3D depth.

ANNOTATIONS (MANDATORY):
- Label every room (e.g. LIVING, BEDROOM 1, KITCHEN).
- Add approximate dimensions below labels (e.g. 4.0x3.5m).
- Text must be uppercase, black, sans-serif, and horizontal.

LAYOUT:
- Respect the provided House Footprint dimensions exactly.
- Ensure logical connectivity between rooms (e.g. Kitchen near Dining).
- Do not include surrounding landscaping unless it represents the specific lot boundary.`;

export const VIEWS_SYSTEM_PROMPT = `You are an architectural visualization renderer.
Your task is to generate a photorealistic exterior view of a house based on a provided floor plan blueprint.
Style: Modern, clean, realistic lighting. 
Respect the structural footprint shown in the blueprint.
Maintain consistency in materials (e.g., concrete, wood, glass) across different viewing angles.`;