import { NextResponse, NextRequest } from 'next/server';
import { addParticipant, removeParticipant, listParticipants } from '@/lib/actions/chat';
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;
    const result = await listParticipants(chatId);

    if (result === null) {
      // Access denied — user is not authorized to view this chat
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // result is an empty array means authorized but no collaborators
    return NextResponse.json({ participants: result }, { status: 200 });
  } catch (error) {
    console.error('Error listing participants via API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;
    const { emailOrClerkId } = await request.json();

    if (!emailOrClerkId) {
      return NextResponse.json({ error: 'Missing emailOrClerkId' }, { status: 400 });
    }

    // Ignore untrusted role from request — always use 'collaborator'
    const success = await addParticipant(chatId, emailOrClerkId, 'collaborator');
    if (success) {
      return NextResponse.json({ message: 'Participant added successfully' }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Failed to add participant (user not found or unauthorized)' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error adding participant via API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserIdOnServer();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;
    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
    }

    const success = await removeParticipant(chatId, targetUserId);
    if (success) {
      return NextResponse.json({ message: 'Participant removed successfully' }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Failed to remove participant or unauthorized' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error removing participant via API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
