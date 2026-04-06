import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { saveAvatarDataUrl } from '@/lib/files/avatarStorage';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0[3-9][0-9]{8}$/;

function isPlaceholderEmail(value) {
  return /@smartguard\.local$/i.test(String(value || '').trim());
}

function isPlaceholderPhone(value) {
  return /^placeholder-/i.test(String(value || '').trim());
}

function toPublicEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return isPlaceholderEmail(email) ? '' : email;
}

function toPublicPhone(value) {
  const phone = String(value || '').trim();
  return isPlaceholderPhone(phone) ? '' : phone;
}

function buildPlaceholderEmail() {
  return `temp-${randomUUID()}@smartguard.local`.slice(0, 255);
}

function buildPlaceholderPhone() {
  return `placeholder-${randomUUID().replace(/-/g, '').slice(0, 20)}`.slice(0, 32);
}

function mapUser(user) {
  return {
    id: user.id || '',
    fullName: user.full_name || '',
    name: user.full_name || '',
    email: toPublicEmail(user.email),
    phone: toPublicPhone(user.phone),
    dob: user.date_of_birth || '',
    idCard: user.id_card || '',
    address: user.address || '',
    avatarUrl: user.avatar_url || '',
    role: user.role || 'USER',
  };
}

function getBearerToken(request) {
  const authorization = request.headers.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return '';
  }

  return token.trim();
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const userId = String(body.userId || '').trim();
    const token = getBearerToken(request);

    if (!userId) {
      return NextResponse.json({ message: 'Thieu ma nguoi dung.' }, { status: 400 });
    }

    if (token !== `user-${userId}`) {
      return NextResponse.json({ message: 'Phien dang nhap khong hop le.' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ message: 'Khong tim thay tai khoan.' }, { status: 404 });
    }

    const fullName = String(body.fullName || '').trim();
    const email = toPublicEmail(body.email);
    const phone = toPublicPhone(body.phone);
    const currentEmail = toPublicEmail(user.email);
    const currentPhone = toPublicPhone(user.phone);
    const dob = String(body.dob || '').trim();
    const idCard = String(body.idCard || '').trim();
    const address = String(body.address || '').trim();
    const rawAvatarUrl = String(body.avatarUrl || '').trim();
    const avatarUrl = rawAvatarUrl.startsWith('data:image/')
      ? await saveAvatarDataUrl({ userId, dataUrl: rawAvatarUrl })
      : rawAvatarUrl;

    if (!fullName) {
      return NextResponse.json({ message: 'Ho va ten khong duoc de trong.' }, { status: 400 });
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: 'Email khong hop le.' }, { status: 400 });
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { message: 'So dien thoai phai gom 10 chu so va bat dau tu 03 den 09.' },
        { status: 400 }
      );
    }

    const orConditions = [];
    if (email && email !== currentEmail) orConditions.push(`email.eq.${email}`);
    if (phone && phone !== currentPhone) orConditions.push(`phone.eq.${phone}`);

    if (orConditions.length > 0) {
      const { data: conflicts } = await supabase
        .from('users')
        .select('id, email, phone')
        .or(orConditions.join(','))
        .neq('id', userId);

      if (conflicts?.length) {
        if (email && conflicts.some((item) => item.email === email)) {
          return NextResponse.json({ message: 'Email da duoc su dung.' }, { status: 409 });
        }
        if (phone && conflicts.some((item) => item.phone === phone)) {
          return NextResponse.json({ message: 'So dien thoai da duoc su dung.' }, { status: 409 });
        }
      }
    }

    const payload = {
      full_name: fullName,
      date_of_birth: dob || null,
      id_card: idCard || null,
      address: address || null,
      avatar_url: avatarUrl || null,
      updated_at: new Date().toISOString(),
    };

    if (email) {
      if (email !== currentEmail) {
        payload.email = email;
      }
    } else if (currentEmail) {
      payload.email = buildPlaceholderEmail();
    }

    if (phone) {
      if (phone !== currentPhone) {
        payload.phone = phone;
      }
    } else if (currentPhone) {
      payload.phone = buildPlaceholderPhone();
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      const message = String(updateError.message || '');
      if (updateError.code === '23505' || message.includes('users_phone_key') || message.includes('users_email_key')) {
        if (message.includes('users_phone_key')) {
          return NextResponse.json({ message: 'So dien thoai da duoc su dung.' }, { status: 409 });
        }
        if (message.includes('users_email_key')) {
          return NextResponse.json({ message: 'Email da duoc su dung.' }, { status: 409 });
        }
      }

      throw updateError;
    }

    return NextResponse.json({
      message: 'Cap nhat thong tin thanh cong.',
      user: mapUser(updatedUser),
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Khong the cap nhat thong tin.', error: String(error) },
      { status: 500 }
    );
  }
}
