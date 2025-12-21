import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/server/supabase-admin";
import { sendPasswordResetEmail } from "@/server/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if user exists
    const { data: user } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single();

    // For security, always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      return NextResponse.json(
        { success: true, message: "If the email exists, a reset link will be sent" },
        { status: 200 }
      );
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store the reset token
    const { error } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      console.error("Failed to create reset token:", error);
      return NextResponse.json(
        { error: "Failed to create reset token", details: error.message },
        { status: 500 }
      );
    }

    // Generate reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    // Send password reset email
    console.log(`[Password Reset] Attempting to send email to ${email}`);
    console.log(`[Password Reset] Reset URL: ${resetUrl}`);
    const emailResult = await sendPasswordResetEmail(email, resetUrl);

    if (!emailResult.success) {
      // Log the error but don't expose it to the user
      console.error("[Password Reset] Failed to send email:", emailResult.error);
      // Still return success to prevent email enumeration
    } else {
      console.log(`[Password Reset] Email sent successfully to ${email}`);
    }

    // For development, also log the URL to console
    if (process.env.NODE_ENV === "development") {
      console.log(`Password reset URL for ${email}: ${resetUrl}`);
    }

    return NextResponse.json(
      {
        success: true,
        message: "If the email exists, a reset link will be sent",
        // Only include this in development
        ...(process.env.NODE_ENV === "development" && { resetUrl })
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
