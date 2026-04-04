/** Supabase database types — mirrors the schema in scripts/supabase-schema.sql */

export type UserRole = "user" | "premium" | "admin" | "super_admin";
export type UserStatus = "active" | "inactive" | "suspended" | "banned";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";
export type IdentityProvider = "email" | "github" | "google";
export type AuditAction =
  | "login"
  | "logout"
  | "register"
  | "password_reset"
  | "profile_update"
  | "role_change"
  | "subscription_change"
  | "premium_access"
  | "account_suspended"
  | "account_reactivated";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          phone: string | null;
          primary_provider: IdentityProvider;
          role: UserRole;
          status: UserStatus;
          preferences: Json;
          provider_meta: Json;
          email_verified_at: string | null;
          last_sign_in_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          phone?: string | null;
          primary_provider?: IdentityProvider;
          role?: UserRole;
          status?: UserStatus;
          preferences?: Json;
          provider_meta?: Json;
          email_verified_at?: string | null;
          last_sign_in_at?: string | null;
        };
        Update: {
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          phone?: string | null;
          preferences?: Json;
        };
      };
      user_identities: {
        Row: {
          id: string;
          user_id: string;
          provider: IdentityProvider;
          provider_uid: string;
          provider_email: string | null;
          provider_data: Json;
          linked_at: string;
        };
        Insert: {
          user_id: string;
          provider: IdentityProvider;
          provider_uid: string;
          provider_email?: string | null;
          provider_data?: Json;
        };
        Update: {
          provider_email?: string | null;
          provider_data?: Json;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: SubscriptionStatus;
          gateway: string | null;
          gateway_subscription_id: string | null;
          gateway_customer_id: string | null;
          amount_cents: number | null;
          currency: string;
          interval: "month" | "year" | "lifetime";
          trial_starts_at: string | null;
          trial_ends_at: string | null;
          current_period_start: string;
          current_period_end: string | null;
          canceled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          plan_id?: string;
          status?: SubscriptionStatus;
          gateway?: string | null;
          gateway_subscription_id?: string | null;
          gateway_customer_id?: string | null;
          amount_cents?: number | null;
          currency?: string;
          interval?: "month" | "year" | "lifetime";
          trial_starts_at?: string | null;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
        };
        Update: {
          status?: SubscriptionStatus;
          gateway_subscription_id?: string | null;
          gateway_customer_id?: string | null;
          current_period_end?: string | null;
          canceled_at?: string | null;
        };
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: AuditAction;
          ip_address: string | null;
          user_agent: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          action: AuditAction;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json;
        };
        Update: never;
      };
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          price_cents: number;
          currency: string;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          slug: string;
          name: string;
          description?: string | null;
          price_cents: number;
          currency?: string;
          is_active?: boolean;
          metadata?: Json;
        };
        Update: {
          slug?: string;
          name?: string;
          description?: string | null;
          price_cents?: number;
          is_active?: boolean;
          metadata?: Json;
        };
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          product_id: string | null;
          subscription_id: string | null;
          gateway: string | null;
          gateway_order_id: string | null;
          gateway_payment_id: string | null;
          gateway_signature: string | null;
          amount_cents: number;
          currency: string;
          status: "pending" | "paid" | "failed" | "refunded";
          receipt_url: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          user_id: string;
          product_id?: string | null;
          subscription_id?: string | null;
          gateway?: string | null;
          gateway_order_id?: string | null;
          gateway_payment_id?: string | null;
          gateway_signature?: string | null;
          amount_cents: number;
          currency?: string;
          status?: "pending" | "paid" | "failed" | "refunded";
          receipt_url?: string | null;
          metadata?: Json;
        };
        Update: {
          gateway_payment_id?: string | null;
          gateway_signature?: string | null;
          status?: "pending" | "paid" | "failed" | "refunded";
          receipt_url?: string | null;
          metadata?: Json;
        };
      };
    };
    Functions: {
      has_premium_access: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      subscription_status: SubscriptionStatus;
      identity_provider: IdentityProvider;
      audit_action: AuditAction;
    };
  };
}
