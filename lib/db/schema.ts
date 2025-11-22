import { pgTable, text, timestamp, uuid, varchar, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users Table (assuming Supabase Auth uses its own users table,
// but a local reference might be used or this could be a public profile table)
// For now, let's assume a simple users table if PR #533 implies one in schema.ts
// If PR #533 relies purely on Supabase Auth's user IDs without a separate 'users' table managed by Drizzle for chat context,
// then this table might be simpler or not needed. Given the PR title focuses on chat migration,
// we'll include a basic one that can be referenced by chats and messages.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(), // Assuming Supabase user IDs are UUIDs
  // email: text('email'), // Supabase handles this in auth.users
  // Other profile fields if necessary
});

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // References a user ID
  title: varchar('title', { length: 256 }).notNull().default('Untitled Chat'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  // RLS in Supabase will use policies, but marking public visibility can be a column
  visibility: varchar('visibility', { length: 50 }).default('private'), // e.g., 'private', 'public'
  // any other metadata for the chat
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // Who sent the message
  role: varchar('role', { length: 50 }).notNull(), // e.g., 'user', 'assistant', 'system', 'tool'
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  // attachments: jsonb('attachments'), // As per PR commit: "feat: remove updatedAt and add attachments field to messages"
  // toolName: varchar('tool_name', { length: 100 }), // If messages can be from tools
  // toolCallId: varchar('tool_call_id', {length: 100}), // if tracking specific tool calls
  // type: varchar('type', { length: 50 }) // As per app/actions.tsx AIMessage type
});

// Calendar Notes Table
export const calendarNotes = pgTable('calendar_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'cascade' }),
  date: timestamp('date', { withTimezone: true }).notNull(),
  content: text('content').notNull(),
  locationTags: jsonb('location_tags'),
  userTags: text('user_tags').array(),
  mapFeatureId: text('map_feature_id'),
  timezone: varchar('timezone', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  chats: many(chats),
  messages: many(messages),
  calendarNotes: many(calendarNotes),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
  calendarNotes: many(calendarNotes),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
}));

export const calendarNotesRelations = relations(calendarNotes, ({ one }) => ({
  user: one(users, {
    fields: [calendarNotes.userId],
    references: [users.id],
  }),
  chat: one(chats, {
    fields: [calendarNotes.chatId],
    references: [chats.id],
  }),
}));
