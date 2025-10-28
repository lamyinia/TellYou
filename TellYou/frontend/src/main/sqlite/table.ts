const add_tables = [
  "create table if not exists sessions(" +
    "   session_id text primary key," +
    "   contact_id text not null," +
    "   contact_type integer not null," +
    "   contact_name text," +
    "   contact_avatar text," +
    "   contact_signature text," +
    "   last_msg_content text," +
    "   last_msg_time datetime," +
    "   unread_count integer default 0," +
    "   is_pinned integer default 0," +
    "   is_muted integer default 0," +
    "   member_count integer," +
    "   max_members integer," +
    "   join_mode integer," +
    "   msg_mode integer," +
    "   group_card text," +
    "   group_notification text," +
    "   my_role integer," +
    "   join_time datetime," +
    "   last_active datetime," +
    "   status integer default 1" +
    ");",

  "create table if not exists messages(" +
    "   id integer primary key autoincrement," +
    "   session_id text not null," +
    "   msg_id text not null," +
    "   sequence_id text not null," +
    "   sender_id text not null," +
    "   sender_name text," +
    "   msg_type integer not null," +
    "   is_recalled integer default 0," +
    "   text text," +
    "   ext_data text," +
    "   send_time datetime not null," +
    "   is_read integer default 0," +
    "   unique(session_id, sequence_id)" +
    ");",

  "create table if not exists blacklist(" +
    "   id integer primary key autoincrement," +
    "   target_id text not null," +
    "   target_type integer not null," +
    "   create_time datetime" +
    ");",

  "create table if not exists contact_applications(" +
    "   apply_id text primary key," +
    "   apply_user_id text not null," +
    "   target_id text not null," +
    "   contact_type integer not null," +
    "   status integer," +
    "   apply_info text," +
    "   last_apply_time datetime" +
    ");",

  "create table if not exists user_setting (" +
    "   user_id varchar not null," +
    "   email varchar not null," +
    "   sys_setting varchar," +
    "   contact_no_read integer," +
    "   server_port integer," +
    "   primary key (user_id)" +
    ");",
];

const add_indexes = [
  "create index if not exists idx_sessions_contact_type_time on sessions(contact_type, last_msg_time desc);",
  "create index if not exists idx_sessions_contact on sessions(contact_id, contact_type);",
  "create index if not exists idx_sessions_unread on sessions(unread_count desc, last_msg_time desc);",

  "create index if not exists idx_messages_session_time on messages(session_id, send_time desc);",
  "create index if not exists idx_messages_sender on messages(sender_id);",

  "create index if not exists idx_blacklist_target on blacklist(target_id, target_type);",

  "create index if not exists idx_applications_user_target on contact_applications(apply_user_id, target_id, contact_type);",
  "create index if not exists idx_applications_status on contact_applications(status);",
];

export { add_tables, add_indexes };
