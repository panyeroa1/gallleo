import { GoogleGenAI } from "@google/genai";
import { ProjectData, Blueprint, HouseViews } from "../types";
import { 
  MODEL_BLUEPRINT, 
  MODEL_VIEWS, 
  MODEL_TEXT,
  BLUEPRINT_SYSTEM_PROMPT, 
  PROMPT_ENHANCER_SYSTEM_PROMPT,
  VIEWS_SYSTEM_PROMPT 
} from "../constants";

// Helper to remove data URL prefix for the API
const extractBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1] || dataUrl;
};

// Initialize Client
const getClient = () => {
  // Use the standardized Environment Variable directly as per strict guidelines
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Enhances the user's simple prompt using the "Knowledge Base" persona.
 */
const enhanceUserPrompt = async (project: ProjectData): Promise<string> => {
    const ai = getClient();
    
    // Construct a base description from form data
    const structuralBase = `
    Lot: ${project.lotDimensions.widthMeters}x${project.lotDimensions.depthMeters}m.
    House: ${project.houseDimensions.widthMeters}x${project.houseDimensions.depthMeters}m.
    Roof Style: ${project.roofType}.
    Rooms: ${project.roomsCount} bedrooms, ${project.toiletsCount} baths.
    Features: ${project.hasKitchen ? 'Kitchen' : ''}, ${project.hasLivingRoom ? 'Living Room' : ''}.
    `;

    const userInput = project.inputType === 'text_prompt' ? project.inputPromptText : "Analyze the uploaded image style.";
    
    const prompt = `User Input: "${userInput}"
    Structural Constraints: ${structuralBase}
    
    ACTION:
    Search your internal "The House Designers" knowledge base for similar layouts and styles.
    Expand the user's input into a detailed visual description for a 3D Renderer.
    Include specific details on:
    1. Flooring materials (e.g. "wide-plank european oak").
    2. Wall textures.
    3. Furniture style (e.g. "mid-century modern").
    4. Key features (e.g. "waterfall island", "floating vanity").`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: { parts: [{ text: prompt }] },
            config: {
                systemInstruction: PROMPT_ENHANCER_SYSTEM_PROMPT
            }
        });
        
        return response.text || userInput || "Modern residential home";
    } catch (e) {
        console.warn("Prompt enhancement failed, using raw input.", e);
        return userInput || "Modern residential home";
    }
};

/**
 * Generates the initial aerial blueprint based on user inputs.
 */
export const generateBlueprint = async (project: ProjectData, onStatusUpdate?: (msg: string) => void): Promise<Blueprint> => {
  const ai = getClient();
  
  // STEP 1: ENHANCE PROMPT
  if (onStatusUpdate) onStatusUpdate("Consulting 'The House Designers' Knowledge Base...");
  const enhancedDescription = await enhanceUserPrompt(project);
  console.log("Enhanced Prompt:", enhancedDescription);

  // STEP 2: PREPARE IMAGE GENERATION
  if (onStatusUpdate) onStatusUpdate("Rendering 3D Isometric Cutaway...");

  const houseDims = `${project.houseDimensions.widthMeters}m x ${project.houseDimensions.depthMeters}m`;
  const lotDims = `${project.lotDimensions.widthMeters}m x ${project.lotDimensions.depthMeters}m`;
  
  // Construct setback string
  const setbacksInfo = `
    Setbacks/Margins:
    - Front (Road): ${project.setbacks.front}m
    - Back: ${project.setbacks.back}m
    - Left: ${project.setbacks.left}m
    - Right: ${project.setbacks.right}m
  `;

  // Build list of specific rooms for labeling (though 3D text is harder, we ask for it)
  const roomLabels: string[] = [];
  if (project.hasLivingRoom) roomLabels.push("Living Room");
  if (project.hasKitchen) roomLabels.push("Kitchen");
  for (let i = 1; i <= project.roomsCount; i++) {
    roomLabels.push(`Bedroom ${i}`);
  }
  for (let i = 1; i <= project.toiletsCount; i++) {
    roomLabels.push(`Bath ${i}`);
  }

  let userPrompt = `Generate a High-Fidelity 3D Isometric Cutaway Floor Plan.
  
  ENHANCED DESIGN BRIEF:
  ${enhancedDescription}
  
  DIMENSIONS:
  - Lot: ${lotDims}
  - House Footprint: ${houseDims}
  - Setbacks: ${setbacksInfo}
  
  REQUIRED ELEMENTS:
  - 3D Extruded Walls (Cut height approx 1.2m, Black Fill).
  - Realistic Flooring (Wood/Tile).
  - Fully Furnished: ${roomLabels.join(', ')}.
  - Ambient Occlusion Shadows.
  - White Background.
  `;

  const parts: any[] = [];

  // Handle Input Type for Image Generation context
  if (project.inputType === 'image_upload' && project.uploadedImageBase64) {
    userPrompt += `\nVISUAL REFERENCE: Mimic the layout flow and style of the attached image, but map it to the requested dimensions.`;
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg', 
        data: extractBase64(project.uploadedImageBase64)
      }
    });
  }
  
  parts.push({ text: userPrompt });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_BLUEPRINT,
      contents: { parts },
      config: {
        systemInstruction: BLUEPRINT_SYSTEM_PROMPT,
      }
    });

    // Extract image
    let generatedImageBase64 = '';
    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          generatedImageBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (!generatedImageBase64) {
       const text = response.text || "No content generated";
       throw new Error(`Model returned text instead of image: ${text}`);
    }

    return {
      id: crypto.randomUUID(),
      projectId: project.id,
      imageUrl: `data:image/png;base64,${generatedImageBase64}`,
      metadata: {
        model: MODEL_BLUEPRINT,
        promptUsed: enhancedDescription // Store the enhanced version
      }
    };
  } catch (error) {
    console.error("Blueprint Generation Failed:", error);
    throw error;
  }
};

/**
 * Generates 5 distinct views based on the blueprint.
 */
export const generateFiveViews = async (
  project: ProjectData,
  blueprint: Blueprint,
  extraInstructions?: string,
  onProgress?: (progress: number) => void
): Promise<HouseViews> => {
  const ai = getClient();
  const blueprintBase64 = extractBase64(blueprint.imageUrl);

  // Define the 5 angles
  const angles = ['Front', 'Back', 'Left', 'Right', 'Aerial'];
  const total = angles.length;
  let completed = 0;
  
  // We use the enhanced prompt context from the blueprint metadata if available, otherwise prompt
  const styleContext = blueprint.metadata.promptUsed || project.inputPromptText || "Modern";

  const baseInstruction = `
    Reference the attached 3D floor plan accurately.
    House Size: ${project.houseDimensions.widthMeters}m width x ${project.houseDimensions.depthMeters}m depth.
    Roof Style: ${project.roofType}.
    Design Style: ${styleContext}
    ${extraInstructions ? `Additional Instructions: ${extraInstructions}` : ''}
  `;

  // Helper for single view generation
  const generateSingleView = async (angle: string): Promise<string> => {
    const prompt = `Generate a photorealistic ${angle} view of this house. ${baseInstruction}`;
    
    const response = await ai.models.generateContent({
      model: MODEL_VIEWS,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: blueprintBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: VIEWS_SYSTEM_PROMPT
      }
    });

    let imgData = '';
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
                imgData = part.inlineData.data;
                break;
            }
        }
    }
    
    // Update progress
    completed++;
    if (onProgress) {
        onProgress(Math.round((completed / total) * 100));
    }
    
    if (!imgData) throw new Error(`Failed to generate ${angle} view`);
    return `data:image/png;base64,${imgData}`;
  };

  try {
    // Run all generations in parallel
    const results = await Promise.all(angles.map(angle => generateSingleView(angle)));

    return {
      id: crypto.randomUUID(),
      projectId: project.id,
      blueprintId: blueprint.id,
      views: {
        front: results[0],
        back: results[1],
        left: results[2],
        right: results[3],
        aerial: results[4],
      },
      metadata: {
        model: MODEL_VIEWS,
        baseInstruction: baseInstruction
      }
    };
  } catch (error) {
    console.error("Views Generation Failed:", error);
    throw error;
  }
};