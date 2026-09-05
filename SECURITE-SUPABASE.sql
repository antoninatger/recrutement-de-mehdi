-- =====================================================================
--  MARCHE À SUIVRE — cinq lignes, à lire avant de coller
--
--  1. Remplacez 'METTEZ-ICI-VOTRE-CODE' à la ligne 60 par le code animateur
--     que vous voulez (celui d'avant était 'mehdi2024' : changez-le, il a
--     été publié en clair sur GitHub pendant des mois).
--  2. Ouvrez le projet sur supabase.com → SQL Editor → New query, collez ce
--     fichier ENTIER, et cliquez sur « Run ». Il est fait pour être rejoué
--     sans dommage : le relancer deux fois ne casse rien.
--  3. Vérifiez : ouvrez index.html, « Espace animateur », tapez votre code.
--     La console doit s'ouvrir SANS le bandeau orange « non protégée ».
--     Tapez ensuite n'importe quoi d'autre : « Code incorrect. »
--  4. Vérifiez côté public : ouvrez participant.html, votez — le vote passe.
--     Puis solo.html?resultats : le code est demandé, et lui seul ouvre.
--  5. En cas de doute, la section « POUR TOUT DÉFAIRE » en bas remet la
--     base exactement dans l'état d'avant.
-- =====================================================================


-- =====================================================================
--  Recrutement de Mehdi — règles de sécurité Supabase
--
--  ── Ce que ce fichier répare ────────────────────────────────────────
--  Aujourd'hui, la clé publiée dans les pages donne à n'importe quel
--  visiteur le droit de TOUT faire sur les trois tables : lire les
--  commentaires libres des participants, réécrire l'état de la partie en
--  pleine séance, ou vider les votes. Le « code animateur » écrit dans
--  data.js n'y changeait rien : il vivait dans un fichier public.
--
--  ── Le principe ─────────────────────────────────────────────────────
--  Le rôle anonyme (celui de la clé publiée) obtient le strict minimum :
--    · lire game_kv et votes           — pour afficher la partie
--    · insérer dans votes              — pour voter
--    · insérer dans solo_feedback      — pour laisser un retour
--  et RIEN d'autre. Pas de lecture de solo_feedback, pas d'écriture de
--  game_kv, aucune suppression nulle part.
--
--  Ce qui reste à l'animateur passe par trois fonctions `security
--  definer` : elles s'exécutent avec les droits de leur propriétaire, mais
--  commencent par comparer le code reçu à une table privée. Le code ne
--  quitte jamais la base ; les pages ne le connaissent pas.
-- =====================================================================


-- ---------------------------------------------------------------------
--  1. La table privée qui garde le code
--
--  Aucune politique n'est créée dessus : avec RLS activé et zéro
--  politique, le rôle anonyme ne peut ni la lire ni l'écrire. Seules les
--  fonctions `security definer` ci-dessous la consultent.
-- ---------------------------------------------------------------------
create table if not exists public.admin_secret (
  id    int primary key default 1,
  code  text not null,
  constraint admin_secret_une_ligne check (id = 1)
);

alter table public.admin_secret enable row level security;
revoke all on public.admin_secret from anon, authenticated;

insert into public.admin_secret (id, code)
values (1, 'METTEZ-ICI-VOTRE-CODE')
on conflict (id) do update set code = excluded.code;


-- ---------------------------------------------------------------------
--  2. RLS activé sur les trois tables du jeu
--
--  À partir d'ici, tout est refusé par défaut : seules les politiques
--  écrites plus bas ouvrent une porte.
-- ---------------------------------------------------------------------
alter table public.game_kv       enable row level security;
alter table public.votes         enable row level security;
alter table public.solo_feedback enable row level security;


-- ---------------------------------------------------------------------
--  3. Ce que le public a le droit de faire
--
--  `drop policy if exists` avant chaque `create` : le fichier se rejoue
--  sans erreur.
-- ---------------------------------------------------------------------

-- 3.1 Lire l'état de la partie. Les trois écrans en dépendent pour se
--     synchroniser ; il n'y a là rien de personnel.
drop policy if exists "lecture publique de l'etat" on public.game_kv;
create policy "lecture publique de l'etat"
  on public.game_kv for select
  to anon, authenticated
  using (true);

-- 3.2 Lire les votes. L'écran de projection en fait un histogramme, et
--     un vote est anonyme : ni nom, ni identifiant, ni horodatage
--     rattachable à quelqu'un.
drop policy if exists "lecture publique des votes" on public.votes;
create policy "lecture publique des votes"
  on public.votes for select
  to anon, authenticated
  using (true);

-- 3.3 Voter. C'est le geste du participant, il doit rester libre.
--     Le contrôle porte sur la FORME, pas sur l'identité : six actes,
--     deux rôles, une note entière de 1 à 5. Une page trafiquée ne peut
--     pas insérer n'importe quoi.
drop policy if exists "insertion d'un vote" on public.votes;
create policy "insertion d'un vote"
  on public.votes for insert
  to anon, authenticated
  with check (
    step  between 0 and 5
    and team in ('c', 'r')
    and value between 1 and 5
  );

-- 3.4 Laisser un retour en mode solo. Insertion seule : personne ne peut
--     RELIRE les retours des autres — c'est justement ce que `?resultats`
--     donnait à qui devinait le mot.
drop policy if exists "depot d'un retour solo" on public.solo_feedback;
create policy "depot d'un retour solo"
  on public.solo_feedback for insert
  to anon, authenticated
  with check (true);

-- 3.5 Et rien d'autre : aucune politique d'UPDATE, de DELETE, ni de
--     SELECT sur solo_feedback. Ce qui n'est pas écrit ici est refusé.


-- ---------------------------------------------------------------------
--  4. Les trois gestes de l'animateur
--
--  `security definer` + `set search_path = public` : la fonction s'exécute
--  avec les droits de son propriétaire, et ne peut pas être détournée par
--  un search_path forgé.
--
--  Le code reçu est comparé en temps constant-ish avec `=` sur une seule
--  ligne : ce n'est pas un secret cryptographique, c'est un code de salle.
-- ---------------------------------------------------------------------

-- 4.1 Écrire l'état de la partie — avancer d'un acte, ouvrir le vote,
--     montrer les résultats, révéler le biais.
create or replace function public.admin_set_state(code text, new_value jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if code is null
     or not exists (select 1 from public.admin_secret s where s.code = admin_set_state.code) then
    raise exception 'code animateur invalide' using errcode = '28000';
  end if;

  insert into public.game_kv (key, value)
  values ('game_state', new_value)
  on conflict (key) do update set value = excluded.value;
end;
$$;

-- 4.2 Remettre la séance à zéro entre deux groupes.
create or replace function public.admin_reset(code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if code is null
     or not exists (select 1 from public.admin_secret s where s.code = admin_reset.code) then
    raise exception 'code animateur invalide' using errcode = '28000';
  end if;

  insert into public.game_kv (key, value)
  values ('game_state', '{"step":0,"voting":false,"results":false,"biais":false}'::jsonb)
  on conflict (key) do update set value = excluded.value;

  delete from public.votes where step >= 0;
end;
$$;

-- 4.3 Relire les retours du mode solo — c'est ce que sert
--     `solo.html?resultats`.
create or replace function public.admin_feedback(code text)
returns setof public.solo_feedback
language plpgsql
security definer
set search_path = public
as $$
begin
  if code is null
     or not exists (select 1 from public.admin_secret s where s.code = admin_feedback.code) then
    raise exception 'code animateur invalide' using errcode = '28000';
  end if;

  return query
    select * from public.solo_feedback order by created_at desc;
end;
$$;


-- ---------------------------------------------------------------------
--  5. Qui a le droit d'APPELER ces fonctions
--
--  Tout le monde peut les appeler — c'est nécessaire, l'animateur arrive
--  avec la même clé publique que les participants. Ce n'est pas l'appel
--  qui est protégé, c'est ce que la fonction fait de l'appel : sans le
--  bon code, elle lève une exception et n'écrit rien.
-- ---------------------------------------------------------------------
grant execute on function public.admin_set_state(text, jsonb) to anon, authenticated;
grant execute on function public.admin_reset(text)             to anon, authenticated;
grant execute on function public.admin_feedback(text)          to anon, authenticated;


-- ---------------------------------------------------------------------
--  6. Vérification — à exécuter après le reste, en une fois
--
--  Décommentez et lancez ces trois lignes pour voir l'effet.
-- ---------------------------------------------------------------------
-- select * from public.solo_feedback;                      -- doit renvoyer 0 ligne au rôle anon
-- select public.admin_reset('mauvais code');               -- doit lever « code animateur invalide »
-- select * from public.admin_feedback('VOTRE-CODE');       -- doit renvoyer les retours


-- =====================================================================
--  POUR TOUT DÉFAIRE
--
--  Remet la base dans l'état d'avant : tout redevient ouvert. À n'utiliser
--  que si quelque chose bloque une séance en cours.
--
--    alter table public.game_kv       disable row level security;
--    alter table public.votes         disable row level security;
--    alter table public.solo_feedback disable row level security;
--    drop function if exists public.admin_set_state(text, jsonb);
--    drop function if exists public.admin_reset(text);
--    drop function if exists public.admin_feedback(text);
--    drop table if exists public.admin_secret;
--
--  Les pages continuent de fonctionner dans les deux sens : quand les
--  fonctions n'existent pas, elles reprennent l'écriture directe et
--  affichent un bandeau orange qui le dit.
-- =====================================================================
