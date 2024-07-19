import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';

export async function GET() {
  const userId = uuidv4();
  return NextResponse.json({ userId });
}