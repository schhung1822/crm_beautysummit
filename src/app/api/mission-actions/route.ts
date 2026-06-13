import { NextRequest, NextResponse } from 'next/server';

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from '@/lib/api-observability';
import { applyCorsHeaders, buildCorsHeaders } from '@/lib/cors';
import {
  getMiniAppDay1RequiredImageCount,
  getMiniAppDay1UploadCompletionCount,
  getMiniAppDay1UploadMaxFileSizeBytes,
  isMiniAppDay1GiftCodeMissionId,
  isMiniAppDay1UploadMissionId,
} from '@/lib/miniapp-day1-giftcodes';
import { forwardMiniAppDay1ImageWebhook } from '@/lib/miniapp-day1-image-webhook';
import { verifyMiniAppDay2InvoiceWebhook } from '@/lib/miniapp-day2-invoice-webhook';
import { forwardMiniAppDay2ImageWebhook } from '@/lib/miniapp-day2-image-webhook';
import {
  getMiniAppDay2RequiredImageCount,
  getMiniAppDay2UploadMaxFileSizeBytes,
  isMiniAppDay2InvoiceMissionId,
  isMiniAppDay2UploadMissionId,
} from '@/lib/miniapp-day2-missions';
import {
  completeMiniAppMission,
  ensureMiniAppRewardState,
  hasMiniAppUserAccess,
  normalizeMissionId,
  recordMiniAppMissionProgressStep,
  redeemMiniAppGiftCodeMission,
} from '@/lib/miniapp-rewards';
import { toDatabasePhone } from '@/lib/phone';

type MissionActionsPayload = {
  action?: string;
  id?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  missionId?: string;
  missionTitle?: string;
  orderCode?: string;
  giftCode?: string;
  invoiceCode?: string;
};

function jsonWithCors(request: NextRequest, body: unknown, init?: ResponseInit): NextResponse {
  return applyCorsHeaders(request, NextResponse.json(body, init), ['POST', 'OPTIONS']);
}

function parseString(value: unknown): string {
  return String(value ?? '').trim();
}

function parseSearchParam(request: NextRequest, key: string): string {
  return parseString(request.nextUrl.searchParams.get(key));
}

const EVENT_DAY1_DATE_KEY = '2026-06-19';
const EVENT_DAY2_DATE_KEY = '2026-06-20';
const BEFORE_EVENT_EARLY_MISSION_CLOSE_DATE_KEY = '2026-06-14';
const EVENT_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function getVietnamDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('year')}-${value('month')}-${value('day')}`;
}

function getMissionActionLockMessage(missionId: string): string {
  const normalizedMissionId = missionId.trim().toLowerCase();
  const today = getVietnamDateKey();

  if (/-b[2-4]$/.test(normalizedMissionId) && today >= BEFORE_EVENT_EARLY_MISSION_CLOSE_DATE_KEY) {
    return 'Nhiem vu nay can hoan thanh truoc ngay 14.06.2026 va hien da dong';
  }

  if (/-d1-vote$/.test(normalizedMissionId)) {
    return '';
  }

  if (/-d2-/.test(normalizedMissionId)) {
    return today >= EVENT_DAY2_DATE_KEY ? '' : 'Nhiệm vụ ngày 2 bắt đầu vào ngày 20.06.2026';
  }

  if (/-d1-/.test(normalizedMissionId)) {
    return today >= EVENT_DAY1_DATE_KEY ? '' : 'Nhiệm vụ ngày 1 bắt đầu vào ngày 19.06.2026';
  }

  return '';
}

function parseFilesFromFormData(formData: FormData): File[] {
  const entries = [
    formData.get('file'),
    ...formData.getAll('files'),
    ...formData.getAll('files[]'),
    ...formData.getAll('image'),
    ...formData.getAll('images'),
    ...formData.getAll('images[]'),
  ];

  return Array.from(
    new Set(
      entries.filter((entry): entry is File => {
        if (!(entry instanceof File)) {
          return false;
        }

        const contentType = parseString(entry.type).toLowerCase();
        if (contentType.startsWith('image/')) {
          return true;
        }

        const fileName = parseString(entry.name).toLowerCase();
        return /\.(png|jpe?g|webp|gif|bmp|heic|heif|avif)$/i.test(fileName);
      })
    )
  );
}

function parseIdentity(body: Pick<MissionActionsPayload, 'id' | 'phone' | 'name' | 'avatar'>) {
  return {
    zid: parseString(body.id),
    phone: toDatabasePhone(body.phone) ?? '',
    name: parseString(body.name),
    avatar: parseString(body.avatar),
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, ['POST', 'OPTIONS']),
  });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (/multipart\/form-data/i.test(contentType)) {
      const formData = await request.formData();
      const action = (
        parseString(formData.get('action')) || parseSearchParam(request, 'action')
      ).toLowerCase();
      const identity = parseIdentity({
        id: parseString(formData.get('id')) || parseSearchParam(request, 'id'),
        phone: parseString(formData.get('phone')) || parseSearchParam(request, 'phone'),
        name: parseString(formData.get('name')) || parseSearchParam(request, 'name'),
        avatar: parseString(formData.get('avatar')) || parseSearchParam(request, 'avatar'),
      });
      const missionId = normalizeMissionId(
        parseString(formData.get('missionId')) || parseSearchParam(request, 'missionId')
      );
      const missionTitle =
        parseString(formData.get('missionTitle')) || parseSearchParam(request, 'missionTitle');
      const orderCode =
        parseString(formData.get('orderCode')) || parseSearchParam(request, 'orderCode');
      const files = parseFilesFromFormData(formData);
      const trace = createApiTrace('miniapp/mission-actions.upload_image', {
        action,
        zid: shortIdForLogs(identity.zid),
        phone: maskPhoneForLogs(identity.phone),
        missionId,
        orderCode: shortIdForLogs(orderCode),
        imageCount: files.length,
      });

      if (action !== 'submit-day1-image' && action !== 'submit-day2-image') {
        trace.mark('unsupported_form_action');
        return jsonWithCors(
          request,
          { message: 'Hành động này không được hỗ trợ' },
          { status: 400 }
        );
      }

      if (!identity.zid || !identity.phone) {
        trace.mark('invalid_identity');
        return jsonWithCors(request, { message: 'id and phone are required' }, { status: 400 });
      }

      const actionLockMessage = getMissionActionLockMessage(missionId);
      if (actionLockMessage) {
        trace.mark('mission_date_locked');
        return jsonWithCors(request, { message: actionLockMessage }, { status: 403 });
      }

      const isDay1ImageAction = action === 'submit-day1-image';
      const isValidUploadMission = isDay1ImageAction
        ? isMiniAppDay1UploadMissionId(missionId)
        : isMiniAppDay2UploadMissionId(missionId);

      if (!isValidUploadMission) {
        trace.mark(
          isDay1ImageAction ? 'invalid_day1_upload_mission' : 'invalid_day2_upload_mission'
        );
        return jsonWithCors(
          request,
          {
            message: isDay1ImageAction
              ? 'Nhiệm vụ upload không hợp lệ'
              : 'Nhiệm vụ upload không hợp lệ',
          },
          { status: 400 }
        );
      }

      if (files.length === 0) {
        trace.mark('missing_image_file');
        return jsonWithCors(request, { message: 'Vui lòn chọn ảnh hợp lệ' }, { status: 400 });
      }

      const requiredImageCount = isDay1ImageAction
        ? getMiniAppDay1RequiredImageCount(missionId)
        : getMiniAppDay2RequiredImageCount(missionId);
      if (files.length < requiredImageCount) {
        trace.mark('missing_required_image_count');
        return jsonWithCors(
          request,
          { message: `Vui lòng chọn đủ ${requiredImageCount} ảnh để hoàn thành nhiệm vụ` },
          { status: 400 }
        );
      }

      if (isDay1ImageAction && files.length > requiredImageCount) {
        trace.mark('too_many_day1_images');
        return jsonWithCors(
          request,
          { message: `Vui lòng chỉ tải lên ${requiredImageCount} ảnh mỗi lần` },
          { status: 400 }
        );
      }

      {
        const maxFileSizeBytes = isDay1ImageAction
          ? getMiniAppDay1UploadMaxFileSizeBytes(missionId)
          : getMiniAppDay2UploadMaxFileSizeBytes(missionId);
        const oversizedFile = files.find((file) => file.size > maxFileSizeBytes);
        if (maxFileSizeBytes > 0 && oversizedFile) {
          trace.mark(isDay1ImageAction ? 'day1_image_too_large' : 'day2_image_too_large');
          return jsonWithCors(request, { message: 'Ảnh tải lên tối đa 5MB' }, { status: 400 });
        }
      }

      const hasAccess = await trace.step('access_check', () =>
        hasMiniAppUserAccess(identity.zid, identity.phone)
      );
      if (!hasAccess) {
        trace.mark('access_denied');
        return jsonWithCors(
          request,
          { message: 'Tài khoản ứng dụng mini chưa được ủy quyền.' },
          { status: 403 }
        );
      }

      const currentState = await trace.step('ensure_reward_state', () =>
        ensureMiniAppRewardState(identity, { orderCode })
      );
      if (currentState.completedIds.includes(missionId)) {
        trace.done({ mode: 'reuse_completed_state' });
        const state = await trace.step('reload_completed_state', () =>
          completeMiniAppMission(identity, missionId, {
            orderCode,
          })
        );
        return jsonWithCors(request, { data: { state } }, { status: 200 });
      }

      const uploadedImageUrls = await trace.step(
        isDay1ImageAction ? 'forward_day1_image_webhook' : 'forward_day2_image_webhook',
        () =>
          (isDay1ImageAction ? forwardMiniAppDay1ImageWebhook : forwardMiniAppDay2ImageWebhook)({
            missionId,
            missionTitle: missionTitle || missionId,
            orderCode,
            zid: identity.zid,
            phone: identity.phone,
            name: identity.name,
            avatar: identity.avatar,
            files,
          })
      );

      const state = await trace.step(
        isDay1ImageAction ? 'record_day1_upload_progress' : 'complete_mission',
        () =>
          isDay1ImageAction
            ? recordMiniAppMissionProgressStep(
                identity,
                missionId,
                uploadedImageUrls[0] || `UPLOAD::${Date.now()}::${files[0]?.name || 'image'}`,
                {
                  orderCode,
                  completionCount: getMiniAppDay1UploadCompletionCount(missionId),
                }
              )
            : completeMiniAppMission(identity, missionId, {
                orderCode,
                missionValue: uploadedImageUrls.join(',') || undefined,
              })
      );

      trace.done({
        uploadedImageCount: uploadedImageUrls.length,
        completedMissionCount: state.completedIds.length,
      });

      return jsonWithCors(
        request,
        {
          data: {
            state,
            uploadedImageUrls,
            uploadedImageUrl: uploadedImageUrls[0] ?? null,
          },
        },
        { status: 200 }
      );
    }

    const body = (await request.json()) as MissionActionsPayload;
    const action = parseString(body.action).toLowerCase();
    const identity = parseIdentity(body);
    const missionId = normalizeMissionId(body.missionId);
    const orderCode = parseString(body.orderCode);
    const trace = createApiTrace('miniapp/mission-actions.POST', {
      action,
      zid: shortIdForLogs(identity.zid),
      phone: maskPhoneForLogs(identity.phone),
      missionId,
      orderCode: shortIdForLogs(orderCode),
    });

    if (!identity.zid || !identity.phone) {
      trace.mark('invalid_identity');
      return jsonWithCors(request, { message: 'id và điện thoại là bắt buộc' }, { status: 400 });
    }

    const actionLockMessage = getMissionActionLockMessage(missionId);
    if (actionLockMessage) {
      trace.mark('mission_date_locked');
      return jsonWithCors(request, { message: actionLockMessage }, { status: 403 });
    }

    const hasAccess = await trace.step('access_check', () =>
      hasMiniAppUserAccess(identity.zid, identity.phone)
    );
    if (!hasAccess) {
      trace.mark('access_denied');
      return jsonWithCors(
        request,
        { message: 'Tài khoản ứng dụng mini chưa được ủy quyền.' },
        { status: 403 }
      );
    }

    if (action === 'redeem-day1-giftcode' || action === 'redeem-giftcode') {
      if (!isMiniAppDay1GiftCodeMissionId(missionId)) {
        trace.mark('invalid_day1_giftcode_mission');
        return jsonWithCors(request, { message: 'Nhiệm vụ không hợp lệ' }, { status: 400 });
      }

      const giftCode = parseString(body.giftCode);
      if (!giftCode) {
        trace.mark('missing_giftcode');
        return jsonWithCors(request, { message: 'giftCode is required' }, { status: 400 });
      }

      const result = await trace.step('redeem_day1_giftcode', () =>
        redeemMiniAppGiftCodeMission(identity, missionId, giftCode, {
          orderCode,
        })
      );

      trace.done({
        pointsAwarded: result.pointsAwarded,
        completedMissionCount: result.state.completedIds.length,
      });

      return jsonWithCors(
        request,
        {
          data: result,
        },
        { status: 200 }
      );
    }

    if (action === 'verify-day2-invoice') {
      if (!isMiniAppDay2InvoiceMissionId(missionId)) {
        trace.mark('invalid_day2_invoice_mission');
        return jsonWithCors(request, { message: 'Nhiệm vụ hợp lệ' }, { status: 400 });
      }

      const missionTitle = parseString(body.missionTitle);
      const invoiceCode = parseString(body.invoiceCode);
      if (!invoiceCode) {
        trace.mark('missing_invoice_code');
        return jsonWithCors(request, { message: 'Vui lòng nhập mã hóa đơn' }, { status: 400 });
      }

      const currentState = await trace.step('ensure_reward_state', () =>
        ensureMiniAppRewardState(identity, { orderCode })
      );
      if (currentState.completedIds.includes(missionId)) {
        trace.done({ mode: 'reuse_completed_state' });
        const state = await trace.step('reload_completed_state', () =>
          completeMiniAppMission(identity, missionId, {
            orderCode,
            missionValue: invoiceCode,
          })
        );
        return jsonWithCors(
          request,
          {
            data: {
              state,
              invoiceCode,
            },
          },
          { status: 200 }
        );
      }

      const verification = await trace.step('verify_day2_invoice_webhook', () =>
        verifyMiniAppDay2InvoiceWebhook({
          missionId,
          missionTitle: missionTitle || missionId,
          orderCode,
          invoiceCode,
          zid: identity.zid,
          phone: identity.phone,
          name: identity.name,
          avatar: identity.avatar,
        })
      );

      if (!verification.valid) {
        trace.mark('invoice_not_verified');
        return jsonWithCors(
          request,
          { message: verification.message || 'Mã hóa đơn không hợp lệ hoặc chưa đủ điều kiện' },
          { status: 400 }
        );
      }

      const state = await trace.step('complete_mission', () =>
        completeMiniAppMission(identity, missionId, {
          orderCode,
          missionValue: invoiceCode,
        })
      );

      trace.done({
        invoiceOrder: verification.order,
        completedMissionCount: state.completedIds.length,
      });

      return jsonWithCors(
        request,
        {
          data: {
            state,
            invoiceCode,
            order: verification.order,
          },
        },
        { status: 200 }
      );
    }

    trace.mark('unsupported_json_action');
    return jsonWithCors(request, { message: 'Hành động này không được hỗ trợ' }, { status: 400 });
  } catch (error) {
    console.error('Mini app mission actions error:', error);
    const message = error instanceof Error ? error.message : 'Không thể xử lý hành động nhiệm vụ';
    return jsonWithCors(request, { message }, { status: 500 });
  }
}
