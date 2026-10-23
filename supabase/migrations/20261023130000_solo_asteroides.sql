-- Los juegos simulados desaparecen del catálogo. Solo asteroides es jugable.
-- Ninguno tiene sesiones ni marcas (el servidor rechazaba abrir sesión).
delete from public.games where id <> 'asteroides';
