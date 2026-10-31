import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const users=sqliteTable('users',{id:text('id').primaryKey(),email:text('email').notNull().unique(),name:text('name').notNull(),password_hash:text('password_hash').notNull(),salt:text('salt').notNull(),state:text('state').notNull().default('{"cart":[],"favorites":[]}')});
export const sessions=sqliteTable('sessions',{token:text('token').primaryKey(),user_id:text('user_id').notNull().references(()=>users.id),expires:integer('expires').notNull()});
export const attempts=sqliteTable('attempts',{key:text('key').primaryKey(),count:integer('count').notNull(),reset:integer('reset').notNull()});
export const orders=sqliteTable('orders',{id:text('id').primaryKey(),user_id:text('user_id').notNull().references(()=>users.id),created:text('created').notNull(),items:text('items').notNull(),totals:text('totals').notNull()});
