const add_tables = [
  'create table if not exists sessions(' +
    '   session_id text primary key,' +
    '   session_type integer not null,' + // 1:单聊 2:群聊 3:系统
    '   contact_id text not null,' + // 联系人ID（用户ID或群组ID）
    '   contact_type integer not null,' + // 1:用户 2:群组
    '   contact_name text,' + // 联系人名称
    '   contact_avatar text,' + // 联系人头像
    '   contact_signature text,' + // 个性签名（仅用户）
    '   last_msg_content text,' +
    '   last_msg_time datetime,' +
    '   unread_count integer default 0,' +
    '   is_pinned integer default 0,' +
    '   is_muted integer default 0,' + // 0:正常 1:静音
    '   created_at datetime,' +
    '   updated_at datetime,' +
    '   member_count integer,' + // 群组特有字段
    '   max_members integer,' +
    '   join_mode integer,' + // 1:自由加入 2:需审核 3:邀请加入
    '   msg_mode integer,' + // 1:所有人可发言 2:仅管理员
    '   group_card text,' + // 群名片
    '   group_notification text,' + // 群公告
    '   my_role integer,' + // 1:成员 2:管理员 3:群主
    '   join_time datetime,' +
    '   last_active datetime,' +
    '   status integer' +
    ');',

  'create table if not exists messages(' +
    '   id integer primary key autoincrement,' +
    '   session_id text not null,' +
    '   msg_id text not null,' +
    '   sequence_id text not null,' +
    '   sender_id text not null,' +
    '   sender_name text,' +
    '   msg_type integer not null,' + // 1:文本 2:图片 3:语音 4:视频 5:文件 6:红包
    '   is_recalled integer default 0,' +
    '   text text,' +
    '   ext_data text,' +
    '   send_time datetime not null,' +
    '   is_read integer default 0,' +
    '   unique(session_id, sequence_id)' +
    ');',

  'create table if not exists blacklist(' +
    '   id integer primary key autoincrement,' +
    '   target_id text not null,' +
    '   target_type integer not null,' + // 1:用户 2:群组
    '   create_time datetime' +
    ');',

  'create table if not exists contact_applications(' +
    '   id integer primary key autoincrement,' +
    '   apply_user_id text not null,' +
    '   target_id text not null,' +
    '   contact_type integer not null,' + // 0:好友 1:群组
    '   status integer,' + // 0:待处理 1:已同意 2:已拒绝 3:已拉黑
    '   apply_info text,' +
    '   last_apply_time datetime' +
    ');',

  'create table if not exists user_setting (' +
    '   user_id varchar not null,' +
    '   email varchar not null,' +
    '   sys_setting varchar,' +
    '   contact_no_read integer,' +
    '   server_port integer,' +
    '   primary key (user_id)' +
    ');'
]

const add_indexes = [
  'create index if not exists idx_sessions_type_time on sessions(session_type, last_msg_time desc);',
  'create index if not exists idx_sessions_contact on sessions(contact_id, contact_type);',
  'create index if not exists idx_sessions_unread on sessions(unread_count desc, last_msg_time desc);',

  'create index if not exists idx_messages_session_time on messages(session_id, send_time desc);',
  'create index if not exists idx_messages_sender on messages(sender_id);',

  'create index if not exists idx_blacklist_target on blacklist(target_id, target_type);',

  'create index if not exists idx_applications_user_target on contact_applications(apply_user_id, target_id, contact_type);',
  'create index if not exists idx_applications_status on contact_applications(status);'
]

export { add_tables, add_indexes }
