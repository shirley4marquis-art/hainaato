-- Seed initial brands and demo vehicle placeholders for SinoVanta

-- Brands (initial list)
insert into brands (name, slug, origin_region)
select * from (values
  ('BYD','byd','China'),
  ('Geely','geely','China'),
  ('Changan','changan','China'),
  ('Chery','chery','China'),
  ('GAC','gac','China'),
  ('Haval','haval','China'),
  ('Jetour','jetour','China'),
  ('MG','mg','China'),
  ('Dongfeng','dongfeng','China'),
  ('JAC','jac','China'),
  ('Great Wall','great-wall','China'),
  ('FAW','faw','China'),
  ('Zeekr','zeekr','China'),
  ('NIO','nio','China'),
  ('XPeng','xpeng','China'),
  ('Li Auto','li-auto','China'),

  ('Toyota','toyota','Japan'),
  ('Lexus','lexus','Japan'),
  ('Honda','honda','Japan'),
  ('Nissan','nissan','Japan'),
  ('Mazda','mazda','Japan'),
  ('Mitsubishi','mitsubishi','Japan'),
  ('Suzuki','suzuki','Japan'),
  ('Isuzu','isuzu','Japan'),
  ('Subaru','subaru','Japan'),

  ('Hyundai','hyundai','Korea'),
  ('Kia','kia','Korea'),
  ('Genesis','genesis','Korea'),

  ('Volkswagen','volkswagen','Europe'),
  ('BMW','bmw','Europe'),
  ('Mercedes-Benz','mercedes-benz','Europe'),
  ('Audi','audi','Europe'),
  ('Volvo','volvo','Europe'),
  ('Peugeot','peugeot','Europe'),
  ('Renault','renault','Europe'),
  ('Skoda','skoda','Europe'),
  ('Land Rover','land-rover','Europe'),
  ('Range Rover','range-rover','Europe'),
  ('Jaguar','jaguar','Europe'),

  ('Ford','ford','USA'),
  ('Chevrolet','chevrolet','USA'),
  ('Jeep','jeep','USA'),
  ('Tesla','tesla','USA'),
  ('Cadillac','cadillac','USA'),
  ('GMC','gmc','USA')
) as b(name, slug, origin_region)
where not exists (select 1 from brands where slug=b.slug);

-- Demo vehicle placeholders (no specs/prices invented)
-- Marked with demo=true and minimal fields. Admins should replace these with verified specs.

insert into vehicles (brand_name, model, title, demo, overview, availability)
select * from (values
  ('BYD','Seal','BYD Seal — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('BYD','Song Plus','BYD Song Plus — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('BYD','Atto 3','BYD Atto 3 — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Geely','Coolray','Geely Coolray — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Geely','Monjaro','Geely Monjaro — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Changan','CS55 Plus','Changan CS55 Plus — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Changan','CS75 Plus','Changan CS75 Plus — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Chery','Tiggo 7','Chery Tiggo 7 — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Chery','Tiggo 8','Chery Tiggo 8 — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('GAC','GS3','GAC GS3 — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Toyota','Corolla','Toyota Corolla — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Toyota','Camry','Toyota Camry — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Toyota','RAV4','Toyota RAV4 — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Toyota','Land Cruiser Prado','Toyota Land Cruiser Prado — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Toyota','Hilux','Toyota Hilux — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Hyundai','Elantra','Hyundai Elantra — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Hyundai','Tucson','Hyundai Tucson — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Hyundai','Santa Fe','Hyundai Santa Fe — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Kia','Sportage','Kia Sportage — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability'),
  ('Range Rover','Sport','Range Rover Sport — demo placeholder',true,'Development/demo placeholder — verified specs and prices not yet entered.','Request Availability')
) as v(brand_name, model, title, demo, overview, availability)
;