import { pgTable, text, timestamp, uuid, jsonb, customType, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Custom type for PostGIS geometry
const geometry = customType<{ data: string }>({
  dataType() {
    return 'geometry(GEOMETRY, 4326)';
  },
});

/**
 * Custom type for vector embeddings.
 * Currently assumed to use text-embedding-ada-002 => 1536 dimensions.
 * Switching to models like text-embedding-3-large (3072) requires a migration.
 */
const vector = customType<{ data: number[] }>({
  dataType() {
    return 'vector(1536)';
  },
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique(), // Enforced unique for user identity
  role: text('role').default('viewer'),
  selectedModel: text('selected_model'),
  systemPrompt: text('system_prompt'),
});

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Untitled Chat'),
  visibility: text('visibility').default('private'),
  path: text('path'),
  sharePath: text('share_path'),
  shareableLinkId: uuid('shareable_link_id').defaultRandom().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    userIdCreatedAtIdx: index('chats_user_id_created_at_idx').on(table.userId, table.createdAt),
  }
});

export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'cascade' }),
  geojson: jsonb('geojson').notNull(),
  geometry: geometry('geometry'),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding'),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    chatIdCreatedAtIdx: index('messages_chat_id_created_at_idx').on(table.chatId, table.createdAt),
  }
});

export const chatParticipants = pgTable('chat_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('collaborator'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // Prevent duplicate participants in the same chat
  chatUserUnique: unique('chat_participants_chat_user_unique').on(t.chatId, t.userId),
}));

export const systemPrompts = pgTable('system_prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  prompt: text('prompt').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const visualizations = pgTable('visualizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('map_layer'),
  data: jsonb('data').notNull(),
  geometry: geometry('geometry'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

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
}, (table) => {
  return {
    userIdDateIdx: index('calendar_notes_user_id_date_idx').on(table.userId, table.date),
  }
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  chats: many(chats),
  messages: many(messages),
  calendarNotes: many(calendarNotes),
  chatParticipants: many(chatParticipants),
  systemPrompts: many(systemPrompts),
  locations: many(locations),
  visualizations: many(visualizations),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
  calendarNotes: many(calendarNotes),
  participants: many(chatParticipants),
  locations: many(locations),
  visualizations: many(visualizations),
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
  location: one(locations, {
    fields: [messages.locationId],
    references: [locations.id],
  }),
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

export const systemPromptsRelations = relations(systemPrompts, ({ one }) => ({
  user: one(users, {
    fields: [systemPrompts.userId],
    references: [users.id],
  }),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  user: one(users, {
    fields: [locations.userId],
    references: [users.id],
  }),
  chat: one(chats, {
    fields: [locations.chatId],
    references: [chats.id],
  }),
  messages: many(messages),
}));

export const visualizationsRelations = relations(visualizations, ({ one }) => ({
  user: one(users, {
    fields: [visualizations.userId],
    references: [users.id],
  }),
  chat: one(chats, {
    fields: [visualizations.chatId],
    references: [chats.id],
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
