// Generado desde Supabase staging (tblitemxzgeolktuieph) con el MCP generate_typescript_types.
// Regenerar tras cada migración (MCP o `pnpm db:types` con Supabase local). No editar a mano.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string;
          created_at: string;
          floor_apt: string | null;
          id: string;
          is_default: boolean;
          label: string | null;
          notes: string | null;
          number: string;
          phone: string | null;
          postal_code: string;
          province: string;
          recipient: string;
          street: string;
          user_id: string;
        };
        Insert: {
          city: string;
          created_at?: string;
          floor_apt?: string | null;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          notes?: string | null;
          number: string;
          phone?: string | null;
          postal_code: string;
          province: string;
          recipient: string;
          street: string;
          user_id: string;
        };
        Update: {
          city?: string;
          created_at?: string;
          floor_apt?: string | null;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          notes?: string | null;
          number?: string;
          phone?: string | null;
          postal_code?: string;
          province?: string;
          recipient?: string;
          street?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor: string | null;
          created_at: string;
          diff: Json | null;
          entity: string;
          entity_id: string | null;
          id: number;
        };
        Insert: {
          action: string;
          actor?: string | null;
          created_at?: string;
          diff?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: never;
        };
        Update: {
          action?: string;
          actor?: string | null;
          created_at?: string;
          diff?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: never;
        };
        Relationships: [];
      };
      banners: {
        Row: {
          desktop_path: string;
          ends_at: string | null;
          href: string | null;
          id: string;
          is_active: boolean;
          mobile_path: string;
          sort_order: number;
          starts_at: string | null;
          title: string | null;
        };
        Insert: {
          desktop_path: string;
          ends_at?: string | null;
          href?: string | null;
          id?: string;
          is_active?: boolean;
          mobile_path: string;
          sort_order?: number;
          starts_at?: string | null;
          title?: string | null;
        };
        Update: {
          desktop_path?: string;
          ends_at?: string | null;
          href?: string | null;
          id?: string;
          is_active?: boolean;
          mobile_path?: string;
          sort_order?: number;
          starts_at?: string | null;
          title?: string | null;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          logo_path: string | null;
          name: string;
          slug: string;
        };
        Insert: {
          id?: string;
          logo_path?: string | null;
          name: string;
          slug: string;
        };
        Update: {
          id?: string;
          logo_path?: string | null;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          cart_id: string;
          product_id: string;
          quantity: number;
        };
        Insert: {
          cart_id: string;
          product_id: string;
          quantity: number;
        };
        Update: {
          cart_id?: string;
          product_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: {
          coupon_code: string | null;
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          coupon_code?: string | null;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          coupon_code?: string | null;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          description: string | null;
          id: string;
          image_path: string | null;
          is_visible: boolean;
          name: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
        };
        Insert: {
          description?: string | null;
          id?: string;
          image_path?: string | null;
          is_visible?: boolean;
          name: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
        };
        Update: {
          description?: string | null;
          id?: string;
          image_path?: string | null;
          is_visible?: boolean;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      concerns: {
        Row: {
          description: string | null;
          icon: string | null;
          id: string;
          is_visible: boolean;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_visible?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_visible?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          kind: string;
          message: string;
          name: string | null;
          phone: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          kind?: string;
          message: string;
          name?: string | null;
          phone?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          kind?: string;
          message?: string;
          name?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          amount: number | null;
          code: string;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          max_uses: number | null;
          min_amount: number;
          percent: number | null;
          starts_at: string | null;
          used_count: number;
        };
        Insert: {
          amount?: number | null;
          code: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          min_amount?: number;
          percent?: number | null;
          starts_at?: string | null;
          used_count?: number;
        };
        Update: {
          amount?: number | null;
          code?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          min_amount?: number;
          percent?: number | null;
          starts_at?: string | null;
          used_count?: number;
        };
        Relationships: [];
      };
      faqs: {
        Row: {
          answer: string;
          id: string;
          is_visible: boolean;
          question: string;
          sort_order: number;
        };
        Insert: {
          answer: string;
          id?: string;
          is_visible?: boolean;
          question: string;
          sort_order?: number;
        };
        Update: {
          answer?: string;
          id?: string;
          is_visible?: boolean;
          question?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      ingredients: {
        Row: {
          description: string | null;
          id: string;
          name: string;
          slug: string;
          summary: string | null;
        };
        Insert: {
          description?: string | null;
          id?: string;
          name: string;
          slug: string;
          summary?: string | null;
        };
        Update: {
          description?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          summary?: string | null;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          line_total: number;
          name: string;
          order_id: string;
          product_id: string | null;
          quantity: number;
          sku: string;
          unit_price: number;
        };
        Insert: {
          id?: string;
          line_total: number;
          name: string;
          order_id: string;
          product_id?: string | null;
          quantity: number;
          sku: string;
          unit_price: number;
        };
        Update: {
          id?: string;
          line_total?: number;
          name?: string;
          order_id?: string;
          product_id?: string | null;
          quantity?: number;
          sku?: string;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          admin_note: string | null;
          coupon_id: string | null;
          created_at: string;
          customer_note: string | null;
          discount_total: number;
          dni: string | null;
          email: string;
          full_name: string;
          id: string;
          number: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          phone: string | null;
          promotion_ids: string[];
          reserved_until: string | null;
          shipping_address: Json | null;
          shipping_method: Database["public"]["Enums"]["shipping_method"];
          shipping_quote: Json | null;
          shipping_total: number;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          updated_at: string;
          user_id: string | null;
          client_ip_hash: string | null;
        };
        Insert: {
          admin_note?: string | null;
          coupon_id?: string | null;
          created_at?: string;
          customer_note?: string | null;
          discount_total?: number;
          dni?: string | null;
          email: string;
          full_name: string;
          id?: string;
          number?: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          phone?: string | null;
          promotion_ids?: string[];
          reserved_until?: string | null;
          shipping_address?: Json | null;
          shipping_method: Database["public"]["Enums"]["shipping_method"];
          shipping_quote?: Json | null;
          shipping_total?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          admin_note?: string | null;
          coupon_id?: string | null;
          created_at?: string;
          customer_note?: string | null;
          discount_total?: number;
          dni?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          number?: number;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          phone?: string | null;
          promotion_ids?: string[];
          reserved_until?: string | null;
          shipping_address?: Json | null;
          shipping_method?: Database["public"]["Enums"]["shipping_method"];
          shipping_quote?: Json | null;
          shipping_total?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pages: {
        Row: {
          body: string;
          seo_description: string | null;
          slug: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          seo_description?: string | null;
          slug: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          seo_description?: string | null;
          slug?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          installments: number | null;
          order_id: string;
          provider: string;
          provider_payment_id: string | null;
          raw: Json | null;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          installments?: number | null;
          order_id: string;
          provider: string;
          provider_payment_id?: string | null;
          raw?: Json | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          installments?: number | null;
          order_id?: string;
          provider?: string;
          provider_payment_id?: string | null;
          raw?: Json | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      pickup_branches: {
        Row: {
          address: string | null;
          carrier: string;
          city: string | null;
          code: string;
          hours: string | null;
          lat: number | null;
          lng: number | null;
          name: string;
          postal_code: number | null;
          province: string | null;
          refreshed_at: string;
        };
        Insert: {
          address?: string | null;
          carrier: string;
          city?: string | null;
          code: string;
          hours?: string | null;
          lat?: number | null;
          lng?: number | null;
          name: string;
          postal_code?: number | null;
          province?: string | null;
          refreshed_at?: string;
        };
        Update: {
          address?: string | null;
          carrier?: string;
          city?: string | null;
          code?: string;
          hours?: string | null;
          lat?: number | null;
          lng?: number | null;
          name?: string;
          postal_code?: number | null;
          province?: string | null;
          refreshed_at?: string;
        };
        Relationships: [];
      };
      price_lists: {
        Row: {
          code: string;
          id: string;
          min_order_amount: number;
          name: string;
        };
        Insert: {
          code: string;
          id?: string;
          min_order_amount?: number;
          name: string;
        };
        Update: {
          code?: string;
          id?: string;
          min_order_amount?: number;
          name?: string;
        };
        Relationships: [];
      };
      product_categories: {
        Row: {
          category_id: string;
          product_id: string;
        };
        Insert: {
          category_id: string;
          product_id: string;
        };
        Update: {
          category_id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_categories_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_concerns: {
        Row: {
          concern_id: string;
          is_primary: boolean;
          product_id: string;
        };
        Insert: {
          concern_id: string;
          is_primary?: boolean;
          product_id: string;
        };
        Update: {
          concern_id?: string;
          is_primary?: boolean;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_concerns_concern_id_fkey";
            columns: ["concern_id"];
            isOneToOne: false;
            referencedRelation: "concerns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_concerns_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          alt: string | null;
          height: number | null;
          id: string;
          product_id: string;
          sort_order: number;
          storage_path: string;
          width: number | null;
        };
        Insert: {
          alt?: string | null;
          height?: number | null;
          id?: string;
          product_id: string;
          sort_order?: number;
          storage_path: string;
          width?: number | null;
        };
        Update: {
          alt?: string | null;
          height?: number | null;
          id?: string;
          product_id?: string;
          sort_order?: number;
          storage_path?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_ingredients: {
        Row: {
          concentration: string | null;
          ingredient_id: string;
          is_key: boolean;
          product_id: string;
          sort_order: number;
        };
        Insert: {
          concentration?: string | null;
          ingredient_id: string;
          is_key?: boolean;
          product_id: string;
          sort_order?: number;
        };
        Update: {
          concentration?: string | null;
          ingredient_id?: string;
          is_key?: boolean;
          product_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_ingredients_ingredient_id_fkey";
            columns: ["ingredient_id"];
            isOneToOne: false;
            referencedRelation: "ingredients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_ingredients_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_prices: {
        Row: {
          price: number;
          price_list_id: string;
          product_id: string;
        };
        Insert: {
          price: number;
          price_list_id: string;
          product_id: string;
        };
        Update: {
          price?: number;
          price_list_id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_prices_price_list_id_fkey";
            columns: ["price_list_id"];
            isOneToOne: false;
            referencedRelation: "price_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_prices_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          brand_id: string | null;
          compare_at_price: number | null;
          created_at: string;
          description: string | null;
          height_cm: number | null;
          how_to_use: string | null;
          id: string;
          is_featured: boolean;
          legacy_wp_id: number | null;
          length_cm: number | null;
          low_stock_threshold: number;
          name: string;
          price: number;
          price_without_national_taxes: number | null;
          requires_prescription: boolean;
          reserved_stock: number;
          routine_step: Database["public"]["Enums"]["routine_step"] | null;
          search: unknown;
          seo_description: string | null;
          seo_title: string | null;
          short_description: string | null;
          skin_types: string[];
          sku: string;
          slug: string;
          status: Database["public"]["Enums"]["product_status"];
          stock: number;
          tagline: string | null;
          time_of_use: Database["public"]["Enums"]["time_of_use"] | null;
          track_stock: boolean;
          updated_at: string;
          weight_g: number | null;
          width_cm: number | null;
        };
        Insert: {
          brand_id?: string | null;
          compare_at_price?: number | null;
          created_at?: string;
          description?: string | null;
          height_cm?: number | null;
          how_to_use?: string | null;
          id?: string;
          is_featured?: boolean;
          legacy_wp_id?: number | null;
          length_cm?: number | null;
          low_stock_threshold?: number;
          name: string;
          price: number;
          price_without_national_taxes?: number | null;
          requires_prescription?: boolean;
          reserved_stock?: number;
          routine_step?: Database["public"]["Enums"]["routine_step"] | null;
          search?: unknown;
          seo_description?: string | null;
          seo_title?: string | null;
          short_description?: string | null;
          skin_types?: string[];
          sku?: string;
          slug: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock?: number;
          tagline?: string | null;
          time_of_use?: Database["public"]["Enums"]["time_of_use"] | null;
          track_stock?: boolean;
          updated_at?: string;
          weight_g?: number | null;
          width_cm?: number | null;
        };
        Update: {
          brand_id?: string | null;
          compare_at_price?: number | null;
          created_at?: string;
          description?: string | null;
          height_cm?: number | null;
          how_to_use?: string | null;
          id?: string;
          is_featured?: boolean;
          legacy_wp_id?: number | null;
          length_cm?: number | null;
          low_stock_threshold?: number;
          name?: string;
          price?: number;
          price_without_national_taxes?: number | null;
          requires_prescription?: boolean;
          reserved_stock?: number;
          routine_step?: Database["public"]["Enums"]["routine_step"] | null;
          search?: unknown;
          seo_description?: string | null;
          seo_title?: string | null;
          short_description?: string | null;
          skin_types?: string[];
          sku?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock?: number;
          tagline?: string | null;
          time_of_use?: Database["public"]["Enums"]["time_of_use"] | null;
          track_stock?: boolean;
          updated_at?: string;
          weight_g?: number | null;
          width_cm?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          dni: string | null;
          full_name: string | null;
          id: string;
          marketing_opt_in: boolean;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
          wholesale_approved_at: string | null;
        };
        Insert: {
          created_at?: string;
          dni?: string | null;
          full_name?: string | null;
          id: string;
          marketing_opt_in?: boolean;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
          wholesale_approved_at?: string | null;
        };
        Update: {
          created_at?: string;
          dni?: string | null;
          full_name?: string | null;
          id?: string;
          marketing_opt_in?: boolean;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
          wholesale_approved_at?: string | null;
        };
        Relationships: [];
      };
      promotions: {
        Row: {
          badge_text: string | null;
          ends_at: string | null;
          id: string;
          installments: number | null;
          is_active: boolean;
          kind: string;
          min_amount: number;
          payment_method: Database["public"]["Enums"]["payment_method"] | null;
          percent: number | null;
          starts_at: string | null;
          title: string;
        };
        Insert: {
          badge_text?: string | null;
          ends_at?: string | null;
          id?: string;
          installments?: number | null;
          is_active?: boolean;
          kind: string;
          min_amount?: number;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          percent?: number | null;
          starts_at?: string | null;
          title: string;
        };
        Update: {
          badge_text?: string | null;
          ends_at?: string | null;
          id?: string;
          installments?: number | null;
          is_active?: boolean;
          kind?: string;
          min_amount?: number;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          percent?: number | null;
          starts_at?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      related_products: {
        Row: {
          product_id: string;
          related_id: string;
        };
        Insert: {
          product_id: string;
          related_id: string;
        };
        Update: {
          product_id?: string;
          related_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "related_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "related_products_related_id_fkey";
            columns: ["related_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      shipments: {
        Row: {
          carrier: string;
          delivered_at: string | null;
          id: string;
          label_path: string | null;
          order_id: string;
          shipped_at: string | null;
          status: string | null;
          tracking_code: string | null;
          tracking_url: string | null;
          updated_at: string;
        };
        Insert: {
          carrier: string;
          delivered_at?: string | null;
          id?: string;
          label_path?: string | null;
          order_id: string;
          shipped_at?: string | null;
          status?: string | null;
          tracking_code?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
        };
        Update: {
          carrier?: string;
          delivered_at?: string | null;
          id?: string;
          label_path?: string | null;
          order_id?: string;
          shipped_at?: string | null;
          status?: string | null;
          tracking_code?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      shipping_rate_matrix: {
        Row: {
          carrier: string;
          eta_days: string | null;
          postal_code: number;
          price: number;
          refreshed_at: string;
          service: string;
          size_bucket: string;
          weight_bucket_g: number;
        };
        Insert: {
          carrier: string;
          eta_days?: string | null;
          postal_code: number;
          price: number;
          refreshed_at?: string;
          service: string;
          size_bucket?: string;
          weight_bucket_g: number;
        };
        Update: {
          carrier?: string;
          eta_days?: string | null;
          postal_code?: number;
          price?: number;
          refreshed_at?: string;
          service?: string;
          size_bucket?: string;
          weight_bucket_g?: number;
        };
        Relationships: [];
      };
      shipping_rates: {
        Row: {
          carrier: string | null;
          eta_days: string | null;
          free_from: number | null;
          id: string;
          is_active: boolean;
          method: Database["public"]["Enums"]["shipping_method"];
          postal_code_from: number | null;
          postal_code_to: number | null;
          price: number;
          zone: string;
        };
        Insert: {
          carrier?: string | null;
          eta_days?: string | null;
          free_from?: number | null;
          id?: string;
          is_active?: boolean;
          method: Database["public"]["Enums"]["shipping_method"];
          postal_code_from?: number | null;
          postal_code_to?: number | null;
          price: number;
          zone: string;
        };
        Update: {
          carrier?: string | null;
          eta_days?: string | null;
          free_from?: number | null;
          id?: string;
          is_active?: boolean;
          method?: Database["public"]["Enums"]["shipping_method"];
          postal_code_from?: number | null;
          postal_code_to?: number | null;
          price?: number;
          zone?: string;
        };
        Relationships: [];
      };
      store_settings: {
        Row: {
          is_public: boolean;
          key: string;
          value: Json;
        };
        Insert: {
          is_public?: boolean;
          key: string;
          value: Json;
        };
        Update: {
          is_public?: boolean;
          key?: string;
          value?: Json;
        };
        Relationships: [];
      };
      withdrawal_requests: {
        Row: {
          code: string;
          created_at: string;
          email: string;
          full_name: string;
          handled_at: string | null;
          id: string;
          order_number: number | null;
          reason: string | null;
        };
        Insert: {
          code?: string;
          created_at?: string;
          email: string;
          full_name: string;
          handled_at?: string | null;
          id?: string;
          order_number?: number | null;
          reason?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          email?: string;
          full_name?: string;
          handled_at?: string | null;
          id?: string;
          order_number?: number | null;
          reason?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      confirm_payment: {
        Args: {
          p_amount: number;
          p_installments?: number;
          p_order_id: string;
          p_provider: string;
          p_provider_payment_id: string;
          p_raw?: Json;
          p_status: Database["public"]["Enums"]["payment_status"];
        };
        Returns: Json;
      };
      admin_order_action: {
        Args: {
          p_action: string;
          p_carrier?: string;
          p_note?: string;
          p_order_id: string;
          p_tracking_code?: string;
        };
        Returns: Json;
      };
      admin_create_product: { Args: { p_name: string }; Returns: string };
      admin_integration_status: { Args: never; Returns: Json };
      admin_save_product: {
        Args: {
          p_category_ids?: string[];
          p_concern_ids?: string[];
          p_data: Json;
          p_id: string;
          p_primary_concern?: string;
        };
        Returns: Json;
      };
      admin_set_integration_secret: { Args: { p_name: string; p_value: string }; Returns: Json };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      get_integration_secrets: { Args: { p_server_key: string }; Returns: Json };
      get_order_summary: { Args: { p_order_id: string }; Returns: Json };
      is_admin: { Args: never; Returns: boolean };
      place_order: { Args: { p_checkout: Json; p_server_key: string }; Returns: Json };
      release_expired_reservations: { Args: never; Returns: number };
      search_products: {
        Args: { max_results?: number; q: string };
        Returns: {
          id: string;
          name: string;
          price: number;
          rank: number;
          slug: string;
          tagline: string;
        }[];
      };
      slugify: { Args: { p: string }; Returns: string };
      unaccent_immutable: { Args: { "": string }; Returns: string };
    };
    Enums: {
      order_status:
        | "pending_payment"
        | "paid"
        | "preparing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded";
      payment_method: "card" | "bank_transfer" | "qr" | "cash_pickup";
      payment_status: "pending" | "approved" | "rejected" | "cancelled" | "refunded" | "in_process";
      product_status: "draft" | "active" | "archived";
      routine_step: "cleanse" | "treat" | "hydrate" | "protect" | "supplement" | "accessory";
      shipping_method: "home_delivery" | "branch_pickup" | "store_pickup";
      time_of_use: "am" | "pm" | "am_pm";
      user_role: "customer" | "wholesale" | "admin" | "staff";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
