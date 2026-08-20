import { NextRequest, NextResponse } from 'next/server';
import { suggestIndianPlaces } from '@/services/serpApiService';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query') ?? '';
  try {
    return NextResponse.json({ places: await suggestIndianPlaces(query) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
