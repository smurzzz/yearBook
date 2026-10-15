insert into public.categories (name, sort_order) values
  ('Sports',1),('Academics',2),('Candid',3),('Graduation',4),('Clubs',5),('Culture',6),('Other',7)
on conflict (name) do nothing;
insert into public.clubs (name, sort_order) values
  ('Drama Club',1),('Robotics Club',2),('Photography Club',3)
on conflict (name) do nothing;
-- insert into public.admin_emails (email) values ('committee.head@school.edu');   -- fill with real admins (lowercase)
