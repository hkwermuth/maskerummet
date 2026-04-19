-- Fix Permin Bella yarn row to match Bella Color-style metadata.
-- Run in Supabase SQL Editor.
-- Context: Bella row was mistakenly imported with lace/25g/800m/100g.
-- This updates ONLY the single known Bella row id.

begin;

update public.yarns
set
  fiber_main = 'Kid mohair-blanding',
  thickness_category = 'bulky',
  ball_weight_g = 50,
  length_per_100g_m = 290,
  needle_min_mm = 3.5,
  needle_max_mm = 15,
  gauge_stitches_10cm = 14,
  gauge_rows_10cm = 22,
  gauge_needle_mm = 6,
  wash_care = 'handvask',
  status = 'i_produktion'
where id = 'c2e8f4a1-3d7b-4c91-b5e2-9f1a6d4e83c0';

commit;

