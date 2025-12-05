import { GoogleGenAI } from "@google/genai";
import { ProjectData, Blueprint, HouseViews } from "../types";
import { MODEL_BLUEPRINT, MODEL_VIEWS, BLUEPRINT_SYSTEM_PROMPT, VIEWS_SYSTEM_PROMPT } from "../constants";

// Helper to remove data URL prefix for the API
const extractBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1] || dataUrl;
};

// Initialize Client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is set.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates the initial aerial blueprint based on user inputs.
 */
export const generateBlueprint = async (project: ProjectData): Promise<Blueprint> => {
  const ai = getClient();
  
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

  // Build list of specific rooms for labeling
  const roomLabels: string[] = [];
  if (project.hasLivingRoom) roomLabels.push("Living Room");
  if (project.hasKitchen) roomLabels.push("Kitchen");
  // Assuming roomsCount refers to bedrooms or generic rooms
  for (let i = 1; i <= project.roomsCount; i++) {
    roomLabels.push(`Bedroom ${i}`);
  }
  for (let i = 1; i <= project.toiletsCount; i++) {
    roomLabels.push(`Bath ${i}`);
  }

  let userPrompt = `Generate a 2D floor plan blueprint.
  Lot Dimensions: ${lotDims}.
  House Footprint: ${houseDims}.
  Positioning: ${setbacksInfo}
  
  Interior Requirements:
  - Bedrooms/Rooms: ${project.roomsCount}
  - Bathrooms: ${project.toiletsCount}
  - Kitchen: ${project.hasKitchen ? 'Included' : 'None'}
  - Living Room: ${project.hasLivingRoom ? 'Included' : 'None'}
  
  ANNOTATION TASK:
  You must include clear text labels inside the floor plan for these specific spaces: ${roomLabels.join(', ')}.
  Under each room name, write its approximate dimensions (e.g. "3.5x4m").
  `;

  const parts: any[] = [];

  // Handle Input Type
  if (project.inputType === 'text_prompt' && project.inputPromptText) {
    userPrompt += `\nDesign Style/Description: ${project.inputPromptText}`;
    parts.push({ text: userPrompt });
  } else if (project.inputType === 'image_upload' && project.uploadedImageBase64) {
    // Explicit Instruction for Intelligent Analysis
    userPrompt += `\nTASK: ANALYZE the attached reference image's architectural flow, room connectivity, and style. 
    THEN, GENERATE a new blueprint that adapts that specific style and flow to the strict dimensions provided (${houseDims}).
    The output must preserve the essence of the input image but resize it to fit the lot.`;
    
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg', // Assuming converted to JPEG/PNG in frontend
        data: extractBase64(project.uploadedImageBase64)
      }
    });
    parts.push({ text: userPrompt });
  } else {
    parts.push({ text: userPrompt });
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_BLUEPRINT,
      contents: { parts },
      config: {
        systemInstruction: BLUEPRINT_SYSTEM_PROMPT,
        // Using standard generation config
      }
    });

    // Extract image
    // Note: The response structure for images in the new SDK often requires iterating parts
    // We expect the model to return an image in the response parts.
    let generatedImageBase64 = '';
    
    // Check parts for inline data (image)
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
       // Fallback for debugging: if text is returned instead of image, throw
       // Usually means the model refused or generated text.
       const text = response.text || "No content generated";
       throw new Error(`Model returned text instead of image: ${text}`);
    }

    return {
      id: crypto.randomUUID(),
      projectId: project.id,
      imageUrl: `data:image/png;base64,${generatedImageBase64}`,
      metadata: {
        model: MODEL_BLUEPRINT,
        promptUsed: userPrompt
      }
    };
  } catch (error) {
    console.error("Blueprint Generation Failed:", error);
    throw error;
  }
};

/**
 * Generates 5 distinct views based on the blueprint.
 * In a real backend, we might batch this. Here we parallelize client requests.
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
  
  const baseInstruction = `
    Reference the attached floor plan blueprint accurately.
    House Size: ${project.houseDimensions.widthMeters}m width x ${project.houseDimensions.depthMeters}m depth.
    Style: ${project.inputType === 'text_prompt' ? project.inputPromptText : 'Modern Residential'}.
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