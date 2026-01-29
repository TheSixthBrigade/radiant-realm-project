DROP POLICY IF EXISTS "Anyone can view whitelisted users" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "Anyone can insert whitelisted users" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "Anyone can update whitelisted users" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "Anyone can delete whitelisted users" ON bot_whitelisted_users;
DROP POLICY IF EXISTS "Allow all operations on bot_whitelisted_users" ON bot_whitelisted_users;

CREATE POLICY "Allow all operations on bot_whitelisted_users"
  ON bot_whitelisted_users
  FOR ALL
  USING (true)
  WITH CHECK (true);;
