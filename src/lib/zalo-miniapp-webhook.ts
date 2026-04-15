import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDB } from "@/lib/db";
import { buildPhoneVariants, toDatabasePhone } from "@/lib/phone";

type RevokeConsentSummary = {
  userDeleted: number;
  rewardStateDeleted: number;
  votesDeleted: number;
  checkinsDeleted: number;
  customersDeleted: number;
  userZaloOADeleted: number;
  ordersUpdated: number;
};

type UserRow = RowDataPacket & {
  id: number;
  zid: string | null;
  phone: string | null;
};

async function queryAffectedRows(connection: PoolConnection, sql: string, params: unknown[]) {
  const [result] = await connection.query<ResultSetHeader>(sql, params);
  return result.affectedRows;
}

export async function revokeMiniAppConsentByZid(zid: string): Promise<RevokeConsentSummary> {
  const normalizedZid = String(zid).trim();
  if (!normalizedZid) {
    throw new Error("zid is required");
  }

  const db = getDB();
  const connection = await db.getConnection();

  try {
    const [users] = await connection.query<UserRow[]>(
      `
        SELECT id, zid, phone
        FROM user
        WHERE zid = ?
        LIMIT 1
      `,
      [normalizedZid],
    );

    const user = users[0];
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

    await connection.beginTransaction();

    let ordersUpdated = 0;
    let votesDeleted = 0;
    let customersDeleted = 0;
    let userZaloOADeleted = 0;

    if (phoneVariants.length > 0) {
      const placeholders = phoneVariants.map(() => "?").join(", ");

      ordersUpdated = await queryAffectedRows(
        connection,
        `
          UPDATE orders
          SET
            name = NULL,
            phone = NULL,
            email = NULL,
            gender = NULL,
            career = NULL,
            customer_id = NULL,
            updated_at = NOW()
          WHERE phone IN (${placeholders})
        `,
        phoneVariants,
      );

      votesDeleted = await queryAffectedRows(
        connection,
        `
          DELETE FROM voted
          WHERE phone IN (${placeholders})
        `,
        phoneVariants,
      );

      customersDeleted = await queryAffectedRows(
        connection,
        `
          DELETE FROM customer
          WHERE phone IN (${placeholders})
        `,
        phoneVariants,
      );

      userZaloOADeleted = await queryAffectedRows(
        connection,
        `
          DELETE FROM user_zaloOA
          WHERE user_id = ?
             OR phone IN (${placeholders})
        `,
        [normalizedZid, ...phoneVariants],
      );
    } else {
      userZaloOADeleted = await queryAffectedRows(
        connection,
        `
          DELETE FROM user_zaloOA
          WHERE user_id = ?
        `,
        [normalizedZid],
      );
    }

    const rewardStateDeleted = await queryAffectedRows(
      connection,
      `
        DELETE FROM miniapp_user_reward_state
        WHERE zid = ?
      `,
      [normalizedZid],
    );

    const userDeleted = await queryAffectedRows(
      connection,
      `
        DELETE FROM user
        WHERE zid = ?
      `,
      [normalizedZid],
    );

    await connection.commit();

    return {
      userDeleted,
      rewardStateDeleted,
      votesDeleted,
      checkinsDeleted: 0,
      customersDeleted,
      userZaloOADeleted,
      ordersUpdated,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
