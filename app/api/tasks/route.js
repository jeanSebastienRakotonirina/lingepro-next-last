import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Task } from '@/lib/models';
import { getSession, isStaff, isAdmin } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!isStaff(session)) return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  await connectDB();
  const tasks = await Task.find().sort({ createdAt: -1 }).limit(300).lean();
  return NextResponse.json({ tasks });
}

export async function PATCH(req) {
  const session = await getSession();
  if (!isStaff(session)) return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  await connectDB();
  const body = await req.json();
  const task = await Task.findById(body.id);
  if (!task) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  if (body.status) task.status = body.status;
  if (isAdmin(session)) {
    if (body.label !== undefined) task.label = body.label;
    if (body.notes !== undefined) task.notes = body.notes;
    if (body.type) task.type = body.type;
  }
  await task.save();
  return NextResponse.json({ task });
}

export async function POST(req) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: 'Admin uniquement' }, { status: 403 });
  await connectDB();
  const task = await Task.create(await req.json());
  return NextResponse.json({ task }, { status: 201 });
}

export async function DELETE(req) {
  const session = await getSession();
  if (!isAdmin(session)) return NextResponse.json({ error: 'Admin uniquement' }, { status: 403 });
  await connectDB();
  await Task.findByIdAndDelete(new URL(req.url).searchParams.get('id'));
  return NextResponse.json({ ok: true });
}
