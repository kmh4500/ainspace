import { NextRequest, NextResponse } from 'next/server';

// In-memory job storage (in production, use Redis or database)
const jobs = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string;
  error?: string;
  createdAt: Date;
}>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
  }

  const job = jobs.get(jobId);
  
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Clean up completed jobs after 1 hour
  if (job.status === 'completed' || job.status === 'failed') {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (job.createdAt < hourAgo) {
      jobs.delete(jobId);
      return NextResponse.json({ error: 'Job expired' }, { status: 404 });
    }
  }

  return NextResponse.json({
    jobId,
    status: job.status,
    result: job.result,
    error: job.error
  });
}

// Helper function to update job status
export function updateJobStatus(jobId: string, updates: Partial<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result: string;
  error: string;
}>) {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
  }
}

// Helper function to create new job
export function createJob(jobId: string) {
  jobs.set(jobId, {
    status: 'pending',
    createdAt: new Date()
  });
}