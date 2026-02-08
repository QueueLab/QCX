import { pgTable, text, timestamp, uuid, varchar, jsonb, boolean, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  credits: integer('credits').default(0).notNull(),
  tier: varchar('tier', { length: 50 }).default('free').notNull(),
});

// Chats Table
export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 256 }).notNull().default('Untitled Chat'),
  visibility: varchar('visibility', { length: 50 }).default('private'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  path: text('path'),
  sharePath: text('share_path'),
  shareableLinkId: uuid('shareable_link_id').unique().defaultRandom(),
});

// Chat Participants Table
export const chatParticipants = pgTable('chat_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('collaborator'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    uniqueChatUser: uniqueIndex('chat_participants_chat_id_user_id_key').on(table.chatId, table.userId),
  }
});

// Messages Table
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(), // e.g., 'user', 'assistant', 'system', 'tool'
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  // attachments: jsonb('attachments'),
  // toolName: varchar('tool_name', { length: 100 }),
  // toolCallId: varchar('tool_call_id', {length: 100}),
  // type: varchar('type', { length: 50 })
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  chats: many(chats),
  messages: many(messages),
  calendarNotes: many(calendarNotes),
  participation: many(chatParticipants),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
  calendarNotes: many(calendarNotes),
  participants: many(chatParticipants),
}));

export const chatParticipantsRelations = relations(chatParticipants, ({ one }) => ({
  chat: one(chats, {
    fields: [chatParticipants.chatId],
    references: [chats.id],
  }),
  user: one(users, {
    fields: [chatParticipants.userId],
    references: [users.id],
  }),
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
