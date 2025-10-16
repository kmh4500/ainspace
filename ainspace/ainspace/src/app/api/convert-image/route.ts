import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createJob, updateJobStatus } from '../convert-status/route';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate unique job ID
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Async function to process the image conversion
async function processImageConversion(jobId: string, imageBuffer: Buffer) {
  try {
    updateJobStatus(jobId, { status: 'processing' });

    const prompt = `Convert the provided building image into a 2D RPG style.
-No grid lines in the output.
-Style: top-down RPG look; remove perspective/foreshortening if present; keep lighting/shadows consistent.
-Background: transparent; spacing/margins = 0.
-Output: one PNG.`;

    const result = await client.images.edit({
      model: "dall-e-2",
      image: imageBuffer,
      prompt: prompt,
      n: 1,
      size: "512x512",
      response_format: "b64_json"
    });

    const imageBase64 = result.data[0].b64_json;
    
    if (!imageBase64) {
      updateJobStatus(jobId, { 
        status: 'failed', 
        error: 'Failed to generate image' 
      });
      return;
    }

    updateJobStatus(jobId, { 
      status: 'completed', 
      result: `data:image/png;base64,${imageBase64}` 
    });

  } catch (error: any) {
    console.error('Image conversion error:', error);
    updateJobStatus(jobId, { 
      status: 'failed', 
      error: error.message || 'Failed to convert image' 
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);

    // Generate job ID and create job
    const jobId = generateJobId();
    createJob(jobId);

    // Start async processing in next tick to avoid blocking
    setImmediate(() => {
      processImageConversion(jobId, imageBuffer);
    });

    // Return job ID immediately
    return NextResponse.json({ 
      success: true, 
      jobId: jobId,
      message: 'Image conversion started. Use the jobId to check status.'
    });

  } catch (error: any) {
    console.error('Image conversion error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to start image conversion' 
    }, { status: 500 });
  }
}