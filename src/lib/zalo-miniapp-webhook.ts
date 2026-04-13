import { buildPhoneVariants, normalizePhoneDigits, toDatabasePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { buildTicketOrderNote, parseTicketOrderNote, TICKET_ORDER_CHANNEL } from "@/lib/ticket-orders";

type RevokeConsentSummary = {
  userDeleted: number;
  rewardStateDeleted: number;
  votesDeleted: number;
  checkinsDeleted: number;
  customersDeleted: number;
  userZaloOADeleted: number;
  ordersUpdated: number;
};

function buildCustomerIdFromPhone(phone: string | null): string | null {
  const digits = normalizePhoneDigits(phone);
  return digits ? `KH${digits}` : null;
}

function matchesPhone(value: string | null | undefined, phoneVariants: string[]): boolean {
  const normalizedValue = toDatabasePhone(value);
  if (!normalizedValue) {
    return false;
  }

  return phoneVariants.includes(normalizedValue) || phoneVariants.includes(normalizePhoneDigits(normalizedValue));
}

export async function revokeMiniAppConsentByZid(zid: string): Promise<RevokeConsentSummary> {
  const normalizedZid = String(zid).trim();
  if (!normalizedZid) {
    throw new Error("zid is required");
  }

  const user = await prisma.user.findUnique({
    where: { zid: normalizedZid },
    select: {
      id: true,
      zid: true,
      phone: true,
      name: true,
    },
  });

  if (!user) {
    return {
      userDeleted: 0,
      rewardStateDeleted: 0,
      votesDeleted: 0,
      checkinsDeleted: 0,
      customersDeleted: 0,
      userZaloOADeleted: 0,
      ordersUpdated: 0,
    };
  }

  const phone = toDatabasePhone(user.phone);
  const phoneVariants = phone ? buildPhoneVariants(phone) : [];

  // eslint-disable-next-line complexity
  return prisma.$transaction(async (tx) => {
    let ordersUpdated = 0;

    if (phoneVariants.length > 0) {
      const relatedOrders = await tx.orders.findMany({
        where: {
          kenh_ban: TICKET_ORDER_CHANNEL,
          OR: [{ phone: { in: phoneVariants } }, { buyer_phone: { in: phoneVariants } }],
        },
        select: {
          id: true,
          name_customer: true,
          customer_ID: true,
          phone: true,
          buyer_phone: true,
          note: true,
        },
      });

      for (const order of relatedOrders) {
        const meta = parseTicketOrderNote(order.note);
        const buyerMatches = matchesPhone(order.buyer_phone ?? meta.buyer_phone, phoneVariants);
        const holderMatches = matchesPhone(order.phone ?? meta.holder_phone, phoneVariants);

        const nextBuyerPhone = buyerMatches ? null : toDatabasePhone(order.buyer_phone ?? meta.buyer_phone);
        const nextBuyerName = buyerMatches ? null : meta.buyer_name;

        const nextHolderPhone = holderMatches ? nextBuyerPhone : toDatabasePhone(order.phone ?? meta.holder_phone);
        const nextHolderName = holderMatches ? nextBuyerName : (meta.holder_name ?? order.name_customer);

        const nextOrderPhone = nextHolderPhone;
        const nextOrderName = nextHolderName;
        const nextCustomerId = buildCustomerIdFromPhone(nextOrderPhone);

        const nextNote = buildTicketOrderNote({
          ...meta,
          email: null,
          gender: null,
          career: null,
          hope: null,
          ref: null,
          source: "zalo-webhook:user.revoke.consent",
          buyer_name: nextBuyerName,
          buyer_phone: nextBuyerPhone,
          holder_name: nextHolderName,
          holder_phone: nextHolderPhone,
          claimed_from_name: null,
          claimed_from_phone: null,
          claimed_at: null,
        });

        await tx.orders.update({
          where: { id: order.id },
          data: {
            name_customer: nextOrderName,
            phone: nextOrderPhone,
            buyer_phone: nextBuyerPhone,
            customer_ID: nextCustomerId,
            note: nextNote,
            updated_by: "zalo-webhook",
            updated_at: new Date(),
          },
        });

        ordersUpdated += 1;
      }
    }

    const [rewardStateDeleted, votesDeleted, checkinsDeleted, customersDeleted, userZaloOADeleted, userDeleted] =
      await Promise.all([
        tx.miniapp_user_reward_state.deleteMany({
          where: { zid: normalizedZid },
        }),
        phoneVariants.length > 0
          ? tx.voted.deleteMany({
              where: { phone: { in: phoneVariants } },
            })
          : Promise.resolve({ count: 0 }),
        phoneVariants.length > 0
          ? tx.checkin.deleteMany({
              where: { phone: { in: phoneVariants } },
            })
          : Promise.resolve({ count: 0 }),
        phoneVariants.length > 0
          ? tx.customer.deleteMany({
              where: { phone: { in: phoneVariants } },
            })
          : Promise.resolve({ count: 0 }),
        phoneVariants.length > 0
          ? tx.user_zaloOA.deleteMany({
              where: {
                OR: [{ user_id: normalizedZid }, { phone: { in: phoneVariants } }],
              },
            })
          : tx.user_zaloOA.deleteMany({
              where: { user_id: normalizedZid },
            }),
        tx.user.deleteMany({
          where: { zid: normalizedZid },
        }),
      ]);

    return {
      userDeleted: userDeleted.count,
      rewardStateDeleted: rewardStateDeleted.count,
      votesDeleted: votesDeleted.count,
      checkinsDeleted: checkinsDeleted.count,
      customersDeleted: customersDeleted.count,
      userZaloOADeleted: userZaloOADeleted.count,
      ordersUpdated,
    };
  });
}
