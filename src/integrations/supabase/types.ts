export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string | null
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          criteria_type?: string
          criteria_value?: number
          description?: string
          icon?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          course_id: string
          id: string
          issued_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          issued_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          issued_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      content_progress: {
        Row: {
          completed_at: string
          content_id: string
          id: string
          is_completed: boolean
          unit_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          content_id: string
          id?: string
          is_completed?: boolean
          unit_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          content_id?: string
          id?: string
          is_completed?: boolean
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "unit_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_progress_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      course_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string | null
          category_id: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          discount: number
          duration_text: string | null
          id: string
          instructor_id: string | null
          is_published: boolean | null
          level: string | null
          order_index: number
          price: number
          short_description: string | null
          sub_level: string | null
          target_students: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          discount?: number
          duration_text?: string | null
          id?: string
          instructor_id?: string | null
          is_published?: boolean | null
          level?: string | null
          order_index?: number
          price?: number
          short_description?: string | null
          sub_level?: string | null
          target_students?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          discount?: number
          duration_text?: string | null
          id?: string
          instructor_id?: string | null
          is_published?: boolean | null
          level?: string | null
          order_index?: number
          price?: number
          short_description?: string | null
          sub_level?: string | null
          target_students?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string | null
          enrolled_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          enrolled_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_attempts: {
        Row: {
          answers: Json
          content_id: string
          created_at: string
          id: string
          max_score: number
          needs_review: boolean
          percentage: number
          results: Json
          score: number
          teacher_note: string | null
          unit_id: string
          user_id: string
        }
        Insert: {
          answers?: Json
          content_id: string
          created_at?: string
          id?: string
          max_score?: number
          needs_review?: boolean
          percentage?: number
          results?: Json
          score?: number
          teacher_note?: string | null
          unit_id: string
          user_id: string
        }
        Update: {
          answers?: Json
          content_id?: string
          created_at?: string
          id?: string
          max_score?: number
          needs_review?: boolean
          percentage?: number
          results?: Json
          score?: number
          teacher_note?: string | null
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_attempts_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "unit_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_attempts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_recordings: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_published: boolean
          live_session_id: string | null
          recorded_at: string
          section_id: string | null
          status: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean
          live_session_id?: string | null
          recorded_at?: string
          section_id?: string | null
          status?: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean
          live_session_id?: string | null
          recorded_at?: string
          section_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lecture_recordings_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_recordings_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          course_id: string | null
          created_at: string | null
          id: string
          is_free: boolean | null
          is_published: boolean
          lesson_type: string | null
          order_index: number
          title: string
          unit_id: string | null
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_free?: boolean | null
          is_published?: boolean
          lesson_type?: string | null
          order_index: number
          title: string
          unit_id?: string | null
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_free?: boolean | null
          is_published?: boolean
          lesson_type?: string | null
          order_index?: number
          title?: string
          unit_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_live: boolean
          meeting_url: string
          platform: string
          section_id: string | null
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_live?: boolean
          meeting_url: string
          platform?: string
          section_id?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_live?: boolean
          meeting_url?: string
          platform?: string
          section_id?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          scheduled_for: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          scheduled_for?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          scheduled_for?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount: number
          course_id: string | null
          created_at: string | null
          decided_at: string | null
          decision_note: string | null
          id: string
          payment_method: string | null
          plan_name: string | null
          screenshot_url: string
          sender_phone: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          course_id?: string | null
          created_at?: string | null
          decided_at?: string | null
          decision_note?: string | null
          id?: string
          payment_method?: string | null
          plan_name?: string | null
          screenshot_url: string
          sender_phone: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          course_id?: string | null
          created_at?: string | null
          decided_at?: string | null
          decision_note?: string | null
          id?: string
          payment_method?: string | null
          plan_name?: string | null
          screenshot_url?: string
          sender_phone?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      placement_test_results: {
        Row: {
          category_scores: Json | null
          created_at: string
          id: string
          level: string
          score: number
          strengths: Json | null
          user_id: string
          weaknesses: Json | null
        }
        Insert: {
          category_scores?: Json | null
          created_at?: string
          id?: string
          level: string
          score: number
          strengths?: Json | null
          user_id: string
          weaknesses?: Json | null
        }
        Update: {
          category_scores?: Json | null
          created_at?: string
          id?: string
          level?: string
          score?: number
          strengths?: Json | null
          user_id?: string
          weaknesses?: Json | null
        }
        Relationships: []
      }
      placement_tests: {
        Row: {
          audio_url: string | null
          category: string
          correct_answer: string
          created_at: string
          difficulty_weight: number | null
          id: string
          options: Json
          question: string
          reading_passage: string | null
        }
        Insert: {
          audio_url?: string | null
          category: string
          correct_answer: string
          created_at?: string
          difficulty_weight?: number | null
          id?: string
          options: Json
          question: string
          reading_passage?: string | null
        }
        Update: {
          audio_url?: string | null
          category?: string
          correct_answer?: string
          created_at?: string
          difficulty_weight?: number | null
          id?: string
          options?: Json
          question?: string
          reading_passage?: string | null
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          id: string
          last_practiced: string | null
          mastery_level: number | null
          user_id: string | null
          vocabulary_id: string | null
        }
        Insert: {
          id?: string
          last_practiced?: string | null
          mastery_level?: number | null
          user_id?: string | null
          vocabulary_id?: string | null
        }
        Update: {
          id?: string
          last_practiced?: string | null
          mastery_level?: number | null
          user_id?: string | null
          vocabulary_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_vocabulary_id_fkey"
            columns: ["vocabulary_id"]
            isOneToOne: false
            referencedRelation: "vocabulary"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_note: string | null
          approval_status: string
          approved_at: string | null
          avatar_url: string | null
          created_at: string | null
          daily_goal_lessons: number | null
          daily_goal_xp: number | null
          full_name: string | null
          grade: string | null
          id: string
          is_blocked: boolean
          level: string | null
          phone: string | null
          role: string | null
          section_id: string | null
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          approval_note?: string | null
          approval_status?: string
          approved_at?: string | null
          avatar_url?: string | null
          created_at?: string | null
          daily_goal_lessons?: number | null
          daily_goal_xp?: number | null
          full_name?: string | null
          grade?: string | null
          id: string
          is_blocked?: boolean
          level?: string | null
          phone?: string | null
          role?: string | null
          section_id?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_note?: string | null
          approval_status?: string
          approved_at?: string | null
          avatar_url?: string | null
          created_at?: string | null
          daily_goal_lessons?: number | null
          daily_goal_xp?: number | null
          full_name?: string | null
          grade?: string | null
          id?: string
          is_blocked?: boolean
          level?: string | null
          phone?: string | null
          role?: string | null
          section_id?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      pronunciation_attempts: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          score: number
          spoken_text: string | null
          target_text: string
          user_id: string
          word_id: string | null
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          score: number
          spoken_text?: string | null
          target_text: string
          user_id: string
          word_id?: string | null
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          score?: number
          spoken_text?: string | null
          target_text?: string
          user_id?: string
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pronunciation_attempts_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocabulary"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer: string
          id: string
          options: Json | null
          order_index: number
          question_text: string
          question_type: string | null
          quiz_id: string | null
        }
        Insert: {
          correct_answer: string
          id?: string
          options?: Json | null
          order_index: number
          question_text: string
          question_type?: string | null
          quiz_id?: string | null
        }
        Update: {
          correct_answer?: string
          id?: string
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: string | null
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          id: string
          quiz_id: string | null
          score: number
          total_questions: number
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          quiz_id?: string | null
          score: number
          total_questions: number
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          quiz_id?: string | null
          score?: number
          total_questions?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          lesson_id: string | null
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          lesson_id: string | null
          title: string
          type: string
          updated_at: string | null
          url: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lesson_id?: string | null
          title: string
          type: string
          updated_at?: string | null
          url: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lesson_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_locked: boolean
          is_visible: boolean
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_locked?: boolean
          is_visible?: boolean
          name: string
          order_index?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_locked?: boolean
          is_visible?: boolean
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          currency: string | null
          expires_at: string | null
          id: string
          invoice_url: string | null
          plan_name: string
          starts_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          invoice_url?: string | null
          plan_name: string
          starts_at?: string | null
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          invoice_url?: string | null
          plan_name?: string
          starts_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      translation_cache: {
        Row: {
          created_at: string
          entry: Json | null
          example: string | null
          phonetic: string | null
          translation: string
          word: string
        }
        Insert: {
          created_at?: string
          entry?: Json | null
          example?: string | null
          phonetic?: string | null
          translation: string
          word: string
        }
        Update: {
          created_at?: string
          entry?: Json | null
          example?: string | null
          phonetic?: string | null
          translation?: string
          word?: string
        }
        Relationships: []
      }
      tts_cache: {
        Row: {
          created_at: string
          id: string
          path: string
          text: string
          voice: string
        }
        Insert: {
          created_at?: string
          id: string
          path: string
          text: string
          voice?: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          text?: string
          voice?: string
        }
        Relationships: []
      }
      unit_contents: {
        Row: {
          body: string | null
          content_type: string
          created_at: string
          data: Json
          id: string
          is_published: boolean
          media_url: string | null
          order_index: number
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          content_type?: string
          created_at?: string
          data?: Json
          id?: string
          is_published?: boolean
          media_url?: string | null
          order_index?: number
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          content_type?: string
          created_at?: string
          data?: Json
          id?: string
          is_published?: boolean
          media_url?: string | null
          order_index?: number
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_contents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          is_published: boolean
          order_index: number
          section_id: string | null
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          order_index?: number
          section_id?: string | null
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          order_index?: number
          section_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          activity_date: string
          activity_type: string
          id: string
          user_id: string
          xp_gained: number | null
        }
        Insert: {
          activity_date?: string
          activity_type: string
          id?: string
          user_id: string
          xp_gained?: number | null
        }
        Update: {
          activity_date?: string
          activity_type?: string
          id?: string
          user_id?: string
          xp_gained?: number | null
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          course_id: string | null
          id: string
          is_completed: boolean | null
          last_accessed_at: string | null
          last_viewed_at: string | null
          lesson_id: string | null
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          id?: string
          is_completed?: boolean | null
          last_accessed_at?: string | null
          last_viewed_at?: string | null
          lesson_id?: string | null
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          id?: string
          is_completed?: boolean | null
          last_accessed_at?: string | null
          last_viewed_at?: string | null
          lesson_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          current_streak: number | null
          last_active_at: string | null
          last_activity_at: string | null
          level: number | null
          streak_count: number | null
          streak_freeze_count: number | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          current_streak?: number | null
          last_active_at?: string | null
          last_activity_at?: string | null
          level?: number | null
          streak_count?: number | null
          streak_freeze_count?: number | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          current_streak?: number | null
          last_active_at?: string | null
          last_activity_at?: string | null
          level?: number | null
          streak_count?: number | null
          streak_freeze_count?: number | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      user_vocabulary: {
        Row: {
          created_at: string
          example: string | null
          example_ar: string | null
          id: string
          mastered: boolean
          notes: string | null
          part_of_speech: string | null
          phonetic: string | null
          starred: boolean
          translation: string | null
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string
          example?: string | null
          example_ar?: string | null
          id?: string
          mastered?: boolean
          notes?: string | null
          part_of_speech?: string | null
          phonetic?: string | null
          starred?: boolean
          translation?: string | null
          user_id: string
          word: string
        }
        Update: {
          created_at?: string
          example?: string | null
          example_ar?: string | null
          id?: string
          mastered?: boolean
          notes?: string | null
          part_of_speech?: string | null
          phonetic?: string | null
          starred?: boolean
          translation?: string | null
          user_id?: string
          word?: string
        }
        Relationships: []
      }
      vocab_progress: {
        Row: {
          content_id: string
          id: string
          learned: boolean
          unit_id: string
          updated_at: string
          user_id: string
          word: string
        }
        Insert: {
          content_id: string
          id?: string
          learned?: boolean
          unit_id: string
          updated_at?: string
          user_id: string
          word: string
        }
        Update: {
          content_id?: string
          id?: string
          learned?: boolean
          unit_id?: string
          updated_at?: string
          user_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocab_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "unit_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_progress_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary: {
        Row: {
          audio_url: string | null
          audio_url_uk: string | null
          category: string | null
          created_at: string | null
          example_ar: string | null
          id: string
          is_premium: boolean | null
          phonetic: string | null
          phonetic_uk: string | null
          phonetic_us: string | null
          translation: string
          word: string
        }
        Insert: {
          audio_url?: string | null
          audio_url_uk?: string | null
          category?: string | null
          created_at?: string | null
          example_ar?: string | null
          id?: string
          is_premium?: boolean | null
          phonetic?: string | null
          phonetic_uk?: string | null
          phonetic_us?: string | null
          translation: string
          word: string
        }
        Update: {
          audio_url?: string | null
          audio_url_uk?: string | null
          category?: string | null
          created_at?: string | null
          example_ar?: string | null
          id?: string
          is_premium?: boolean | null
          phonetic?: string | null
          phonetic_uk?: string | null
          phonetic_us?: string | null
          translation?: string
          word?: string
        }
        Relationships: []
      }
      xp_logs: {
        Row: {
          action_type: string
          amount: number
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          amount: number
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          amount?: number
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_xp:
        | { Args: { _amount: number; _user_id: string }; Returns: undefined }
        | {
            Args: { _action: string; _amount: number; _user_id: string }
            Returns: undefined
          }
      can_read_content_object: { Args: { _path: string }; Returns: boolean }
      check_permission: {
        Args: { _permission_name: string; _user_id: string }
        Returns: boolean
      }
      get_quiz_questions: {
        Args: { _quiz_id: string }
        Returns: {
          id: string
          options: Json
          order_index: number
          question_text: string
          question_type: string
          quiz_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_active: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_enrolled: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      issue_certificate: { Args: { _course_id: string }; Returns: string }
      quiz_course_id: { Args: { _quiz_id: string }; Returns: string }
      submit_quiz_attempt: {
        Args: { _answers: Json; _quiz_id: string }
        Returns: {
          score: number
          total_questions: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "instructor"
        | "student"
        | "super_admin"
        | "editor"
        | "teacher"
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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "instructor",
        "student",
        "super_admin",
        "editor",
        "teacher",
      ],
    },
  },
} as const
