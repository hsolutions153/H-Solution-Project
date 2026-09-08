-- Default password for seed accounts: Abc123456@
update public.users
set password_hash = '$2b$12$94nlMRubrwvRX7alBzZ8Bec0LJxC5pypgG073PLmdwKT9pkkB7QUu'
where id in ('ADMIN0001', 'CUST000001', 'TECH000001', 'TECH000002')
  and (password_hash is null or password_hash = '');
