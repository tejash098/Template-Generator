-- Receipt template v2: the address splits into village/post/thana, the return
-- trip gets its own date, a second phone number is printed, and the name of
-- the staff member who issued the receipt is stored on the booking so every
-- device prints the same signer.
alter table public.bookings rename column place to village;
alter table public.bookings
  add column post text not null default '',
  add column thana text not null default '',
  add column return_date date,
  add column mobile2 text not null default '',
  add column issued_by_name text not null default '';
