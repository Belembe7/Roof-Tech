ALTER TABLE "properties"
  ADD CONSTRAINT "properties_monthly_rent_nonnegative_check" CHECK ("monthly_rent" >= 0),
  ADD CONSTRAINT "properties_deposit_nonnegative_check" CHECK ("deposit_amount" IS NULL OR "deposit_amount" >= 0),
  ADD CONSTRAINT "properties_visit_fee_nonnegative_check" CHECK ("visit_fee" IS NULL OR "visit_fee" >= 0),
  ADD CONSTRAINT "properties_other_initial_cost_nonnegative_check" CHECK ("other_initial_cost" IS NULL OR "other_initial_cost" >= 0),
  ADD CONSTRAINT "properties_bedrooms_nonnegative_check" CHECK ("bedrooms" >= 0),
  ADD CONSTRAINT "properties_bathrooms_nonnegative_check" CHECK ("bathrooms" >= 0),
  ADD CONSTRAINT "properties_parking_spaces_nonnegative_check" CHECK ("parking_spaces" >= 0),
  ADD CONSTRAINT "properties_area_nonnegative_check" CHECK ("area_m2" IS NULL OR "area_m2" >= 0);

ALTER TABLE "property_images"
  ADD CONSTRAINT "property_images_display_order_nonnegative_check" CHECK ("display_order" >= 0);
