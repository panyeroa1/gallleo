export type InputType = 'image_upload' | 'text_prompt';

export interface Dimensions {
  widthMeters: number;
  depthMeters: number;
}

export interface Setbacks {
  front: number;
  back: number;
  left: number;
  right: number;
}

export interface ProjectData {
  id: string;
  createdAt: number;
  inputType: InputType;
  lotDimensions: Dimensions;
  houseDimensions: Dimensions;
  setbacks: Setbacks;
  roomsCount: number;
  toiletsCount: number;
  hasKitchen: boolean;
  hasLivingRoom: boolean;
  inputPromptText?: string;
  uploadedImageBase64?: string; // Storing as base64 for this client-side demo
}

export interface Blueprint {
  id: string;
  projectId: string;
  imageUrl: string; // This will be a base64 data URL
  metadata: {
    model: string;
    promptUsed: string;
  };
}

export interface HouseViews {
  id: string;
  projectId: string;
  blueprintId: string;
  views: {
    front: string;
    back: string;
    left: string;
    right: string;
    aerial: string;
  };
  metadata: {
    model: string;
    baseInstruction: string;
  };
}

export enum AppStep {
  PROJECT_DETAILS = 'PROJECT_DETAILS',
  BLUEPRINT_RESULT = 'BLUEPRINT_RESULT',
  VIEWS_GENERATION = 'VIEWS_GENERATION',
}