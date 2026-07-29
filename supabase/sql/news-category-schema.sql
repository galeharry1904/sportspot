-- Run this once — adds a category column to the existing news table so
-- general news and transfer news can be queried separately.

alter table news
  add column if not exists category text not null default 'news';

-- select category, count(*) from news group by category;
