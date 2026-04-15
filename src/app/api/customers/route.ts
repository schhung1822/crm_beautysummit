import { NextResponse } from "next/server";

import type { ResultSetHeader } from "mysql2/promise";

import { mapCustomerRow, type CustomerRow } from "@/lib/customers";
import { getDB } from "@/lib/db";
import { toDatabasePhone } from "@/lib/phone";

type CustomerPayload = {
  action?: string;
  customerId?: string;
  customerIds?: string[];
  name?: string;
  gender?: string;
  phone?: string;
  email?: string;
  career?: string;
};

type CustomerSourceRow = CustomerRow & {
  id: number;
  created_by: string | null;
  updated_by: string | null;
  nc_order: string | number | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

function toNullableString(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function createDuplicateCustomerId(customerId: string) {
  const seed = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${customerId || "KH"}-COPY-${Date.now().toString().slice(-6)}-${seed}`;
}

async function findCustomerById(customerId: string) {
  const db = getDB();
  const [rows] = await db.query<CustomerSourceRow[]>(
    `
      SELECT
        id,
        created_at,
        updated_at,
        created_by,
        updated_by,
        nc_order,
        customer_id AS customer_ID,
        name,
        gender,
        phone,
        email,
        career,
        user_ip,
        user_agent,
        fbp,
        fbc,
        create_time
      FROM customer
      WHERE customer_id = ?
      LIMIT 1
    `,
    [customerId],
  );

  return rows.length > 0 ? rows[0] : null;
}

async function duplicateCustomer(customerId: string) {
  const sourceCustomer = await findCustomerById(customerId);
  if (!sourceCustomer) {
    return null;
  }

  const nextCustomerId = createDuplicateCustomerId(customerId);
  const db = getDB();
  await db.query<ResultSetHeader>(
    `
      INSERT INTO customer (
        created_at,
        updated_at,
        created_by,
        updated_by,
        nc_order,
        customer_id,
        name,
        gender,
        phone,
        email,
        career,
        user_ip,
        user_agent,
        fbp,
        fbc,
        create_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      sourceCustomer.created_at,
      sourceCustomer.updated_at,
      sourceCustomer.created_by,
      sourceCustomer.updated_by,
      sourceCustomer.nc_order,
      nextCustomerId,
      sourceCustomer.name,
      sourceCustomer.gender,
      sourceCustomer.phone,
      sourceCustomer.email,
      sourceCustomer.career,
      sourceCustomer.user_ip,
      sourceCustomer.user_agent,
      sourceCustomer.fbp,
      sourceCustomer.fbc,
      sourceCustomer.create_time,
    ],
  );

  return findCustomerById(nextCustomerId);
}

async function syncOrdersFromCustomer(customerId: string, payload: Record<string, string | null>) {
  const db = getDB();
  await db.query(
    `
      UPDATE orders
      SET
        name = ?,
        gender = ?,
        phone = ?,
        email = ?,
        career = ?,
        updated_at = NOW()
      WHERE customer_id = ?
    `,
    [payload.name, payload.gender, payload.phone, payload.email, payload.career, customerId],
  );
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as CustomerPayload;
    const customerId = String(body.customerId ?? "").trim();
    if (!customerId) {
      return NextResponse.json({ message: "customerId is required" }, { status: 400 });
    }

    const payload = {
      name: toNullableString(body.name),
      gender: toNullableString(body.gender),
      phone: toDatabasePhone(body.phone),
      email: toNullableString(body.email),
      career: toNullableString(body.career),
    };

    const db = getDB();
    await db.query(
      `
        UPDATE customer
        SET
          name = ?,
          gender = ?,
          phone = ?,
          email = ?,
          career = ?,
          updated_at = NOW()
        WHERE customer_id = ?
        LIMIT 1
      `,
      [payload.name, payload.gender, payload.phone, payload.email, payload.career, customerId],
    );

    await syncOrdersFromCustomer(customerId, payload);

    const updatedCustomer = await findCustomerById(customerId);
    if (!updatedCustomer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ data: mapCustomerRow(updatedCustomer) });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to update customer" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CustomerPayload;
    const action = String(body.action ?? "")
      .trim()
      .toLowerCase();
    const customerId = String(body.customerId ?? "").trim();

    if (action !== "duplicate" || !customerId) {
      return NextResponse.json({ message: "Invalid duplicate request" }, { status: 400 });
    }

    const duplicatedCustomer = await duplicateCustomer(customerId);
    if (!duplicatedCustomer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ data: mapCustomerRow(duplicatedCustomer) });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to duplicate customer" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as CustomerPayload;
    const customerIds = [
      ...new Set(
        [
          ...(Array.isArray(body.customerIds) ? body.customerIds : []).map((value) => String(value ?? "").trim()),
          String(body.customerId ?? "").trim(),
        ].filter(Boolean),
      ),
    ];

    if (!customerIds.length) {
      return NextResponse.json({ message: "customerId is required" }, { status: 400 });
    }

    const db = getDB();
    const placeholders = customerIds.map(() => "?").join(", ");
    await db.query(
      `
        UPDATE orders
        SET customer_id = NULL, updated_at = NOW()
        WHERE customer_id IN (${placeholders})
      `,
      customerIds,
    );

    const [result] = await db.query<ResultSetHeader>(
      `
        DELETE FROM customer
        WHERE customer_id IN (${placeholders})
      `,
      customerIds,
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: result.affectedRows });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to delete customer" },
      { status: 400 },
    );
  }
}
