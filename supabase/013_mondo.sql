-- "Il mondo": le pagine hanno un tipo (luogo, png, nota).
alter table public.pages add column tipo text not null default 'luogo' check (tipo in ('luogo', 'png', 'nota'));
update public.pages set tipo = 'nota' where titolo = 'Minacce dal foglio';
-- I due personaggi importanti di Oxenfurt diventano PNG.
insert into public.pages (tipo, titolo, testo) values
('png', 'Godfried', $t$Gestore della locanda di Oxenfurt. Conosce tutto di tutti: ogni informazione passa prima o poi per la sua locanda. Tutti si fidano di lui.$t$),
('png', 'Cassandra', $t$Erborista di Oxenfurt: sa ricavare pozioni e rimedi da ogni tipo di pianta.$t$);
