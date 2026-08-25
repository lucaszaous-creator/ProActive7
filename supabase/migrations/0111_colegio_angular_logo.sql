-- O Colegio Angular foi o unico cliente da carta que entrou sem logo: a arte
-- dele e VETORIAL na apresentacao (paths + texto, nao uma imagem embutida),
-- entao a extracao de imagens da 0104 nao a encontrou. Agora ela foi
-- rasterizada de um render em alta e vive em public/clientes.
--
-- Idempotente e seguro em qualquer ordem: se a 0104 ainda nao rodou, este
-- update nao encontra a linha e nao faz nada — a 0104 ja traz o caminho
-- correto quando rodar depois. O "logo_path is null" evita sobrescrever um
-- logo que a nutri tenha subido pela tela.
update public.site_clients
   set logo_path = '/clientes/colegio-angular.webp'
 where slug = 'colegio-angular'
   and logo_path is null;
