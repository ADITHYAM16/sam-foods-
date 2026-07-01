export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

<<<<<<< HEAD
export type OrderStatus = "Placed" | "Preparing" | "Ready" | "Out for delivery" | "Delivered" | "Cancelled";
          export type PaymentMethod = "cod" | "gpay";
          export type PaymentStatus = "pending" | "paid" | "failed";
=======
export type OrderStatus = "Placed" | "Preparing" | "Ready" | "Out for delivery" | "Delivered";
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
export type UserRole = "customer" | "admin" | "delivery";

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          role: UserRole
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          phone?: string | null
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          role?: UserRole
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          customer: string
          email: string | null
          room: string
          delivery_time: string
          items: Json
          subtotal: number
          delivery_fee: number
          gst: number
          total: number
          discount: number
          status: OrderStatus
<<<<<<< HEAD
          payment_method: "cod" | "gpay"
          payment_status: "pending" | "paid" | "failed"
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          cancelled_at: string | null
          delivery_agent_id: string | null
=======
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          customer: string
          email?: string | null
          room: string
          delivery_time: string
          items: Json
          subtotal: number
          delivery_fee: number
          gst: number
          total: number
          discount?: number
          status?: OrderStatus
<<<<<<< HEAD
          payment_method?: "cod" | "gpay"
          payment_status?: "pending" | "paid" | "failed"
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          cancelled_at?: string | null
          delivery_agent_id?: string | null
=======
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
          created_at?: string
        }
        Update: {
          status?: OrderStatus
<<<<<<< HEAD
          payment_method?: "cod" | "gpay"
          payment_status?: "pending" | "paid" | "failed"
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          cancelled_at?: string | null
          delivery_agent_id?: string | null
=======
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
        }
      }
      bulk_orders: {
        Row: {
          id: string
          name: string
          phone: string
          event: string
          people: number
          date: string
          location: string
          menu_request: string | null
          budget: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          event: string
          people: number
          date: string
          location: string
          menu_request?: string | null
          budget: string
          status?: string
          created_at?: string
        }
        Update: {
          status?: string
        }
      }
<<<<<<< HEAD
      delivery_agents: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          phone?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          email?: string
          phone?: string | null
          active?: boolean
        }
      }
=======
      menu_items: {
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
        Row: {
          id: string
          name: string
          description: string
          price: number
          rating: number
          category: string
          veg: boolean
          image: string
          badge: string | null
          available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          price: number
          rating?: number
          category: string
          veg?: boolean
          image: string
          badge?: string | null
          available?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          description?: string
          price?: number
          rating?: number
          category?: string
          veg?: boolean
          image?: string
          badge?: string | null
          available?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
