import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra user hiện tại
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate dữ liệu
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ message: "Vui lòng nhập đầy đủ thông tin" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ message: "Mật khẩu mới và xác nhận mật khẩu không khớp" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" }, { status: 400 });
    }

    // Lấy thông tin user từ database
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user) {
      return NextResponse.json({ message: "Không tìm thấy tài khoản" }, { status: 404 });
    }

    // Xác thực mật khẩu hiện tại
    const isValidPassword = await verifyPassword(currentPassword, user.password);

    if (!isValidPassword) {
      return NextResponse.json({ message: "Mật khẩu hiện tại không đúng" }, { status: 400 });
    }

    // Hash mật khẩu mới
    const hashedPassword = await hashPassword(newPassword);

    // Cập nhật mật khẩu
    await prisma.user.update({
      where: { id: currentUser.userId },
      data: {
        password: hashedPassword,
        updated_by: currentUser.username,
      },
    });

    return NextResponse.json({ message: "Đổi mật khẩu thành công" }, { status: 200 });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json({ message: "Có lỗi xảy ra khi đổi mật khẩu", error: error.message }, { status: 500 });
  }
}
