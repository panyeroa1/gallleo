export const APP_NAME = "EBURON ARCHITECT";
export const API_KEY_ENV = process.env.API_KEY;

// Models
export const MODEL_BLUEPRINT = 'gemini-2.5-flash-image'; 
export const MODEL_VIEWS = 'gemini-2.5-flash-image';

// Prompts
export const BLUEPRINT_SYSTEM_PROMPT = `You are a professional architectural drafter. 
Your task is to generate a high-precision 2D floor plan blueprint.
Style Reference: "Live Home 3D" style.
- Background: Pure White (#FFFFFF).
- Walls: Distinct, thick dark blue or black lines with solid fill.
- Elements: Clearly indicate doors (arcs), windows (thin lines).
- ANNOTATIONS (MANDATORY): You MUST include dimension lines for outer walls. Inside rooms, include CLEAR TEXT LABELS for the room name (e.g., "Kitchen", "Bedroom") AND approximate sizes (e.g., "3x4m" or "12sqm").
- Perspective: Strictly top-down 2D. No angled/isometric views.
- Contrast: High. 
- Content: The layout must strictly fit the aspect ratio and shape defined by the dimensions.
Do not include surrounding landscaping/grass inside the floor plan image unless it represents the lot boundary. Focus on the interior layout.`;

export const VIEWS_SYSTEM_PROMPT = `You are an architectural visualization renderer.
Your task is to generate a photorealistic exterior view of a house based on a provided floor plan blueprint.
Style: Modern, clean, realistic lighting. 
Respect the structural footprint shown in the blueprint.
Maintain consistency in materials (e.g., concrete, wood, glass) across different viewing angles.`;