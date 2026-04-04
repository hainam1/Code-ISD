import { getAdminCandidateById } from '@/features/candidates/server/adminCandidates';
import { readApplicationFile } from '../../../../../../lib/files/applicationStorage';

export async function GET(request, { params }) {
  const candidate = await getAdminCandidateById(params.candidateId);

  if (!candidate?.healthFile?.relativePath) {
    return new Response('Không tìm thấy hồ sơ sức khỏe.', { status: 404 });
  }

  try {
    const buffer = await readApplicationFile(candidate.healthFile.relativePath);
    const url = new URL(request.url);
    const shouldDownload = url.searchParams.get('download') === '1';

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': candidate.healthFile.mimeType || 'application/octet-stream',
        'Content-Length': String(buffer.byteLength),
        'Content-Disposition': `${shouldDownload ? 'attachment' : 'inline'}; filename="${candidate.healthFile.fileName}"`,
      },
    });
  } catch {
    return new Response('Không tìm thấy hồ sơ sức khỏe.', { status: 404 });
  }
}
