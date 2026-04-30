-- ================================================================
-- GUARDTRACK PRO — SEED SQL — Zone de Douala
-- Généré le : 2026-04-30
-- ================================================================
-- MOT DE PASSE PAR DÉFAUT : "password123"
-- AVANT PRODUCTION : regénérer avec la commande :
--   php bin/console security:hash-password password123
-- puis : UPDATE `user` SET password = '<hash>' WHERE role = 'AGENT';
-- OU utiliser la fonctionnalité "Mot de passe oublié" par agent.
-- ================================================================
-- HORAIRES : JOUR = 07:00–19:00 | NUIT = 19:00–07:00
-- ================================================================

SET NAMES utf8mb4;
SET @pwd   = '$2y$13$rHCmAXUMn0Q2ioJG0hQ5Ves9XF3Kq/1BtT7W2Gz.NyPlHKe8dLJBO';
SET @now   = NOW();
SET @start = '2026-01-01';

START TRANSACTION;

-- ============================================================
-- 1. CLIENTS
-- ============================================================
INSERT INTO `client` (name, email, phone, address, billing_rate, is_active, created_at, updated_at) VALUES
-- id 1
('GSS SA',
 NULL, NULL,
 'Logpom, Douala, Cameroun',
 2500.00, 1, @now, @now),
-- id 2
('Crédit Communautaire d\'Afrique (CCA)',
 NULL, NULL,
 'Avenue de Gaulle, Bonanjo, Douala, Cameroun',
 2500.00, 1, @now, @now),
-- id 3
('Commercial Bank of Cameroon (CBC)',
 NULL, NULL,
 'Makepe, Douala, Cameroun',
 2500.00, 1, @now, @now),
-- id 4
('AFRIASSURE',
 NULL, NULL,
 'Akwa, Douala, Cameroun',
 2500.00, 1, @now, @now),
-- id 5
('AFRILIFE',
 NULL, NULL,
 'Bonapriso, Douala, Cameroun',
 2500.00, 1, @now, @now),
-- id 6
('Street Chicken',
 NULL, NULL,
 'Ange Raphael, Douala, Cameroun',
 2500.00, 1, @now, @now),
-- id 7
('LMC',
 NULL, NULL,
 'Zone Portuaire, Douala, Cameroun',
 2500.00, 1, @now, @now),
-- id 8
('Résidence NOE',
 NULL, NULL,
 'Bonapriso, Douala, Cameroun',
 2500.00, 1, @now, @now);

-- Références clients (pour lisibilité des INSERTs suivants)
SET @gss         = (SELECT id FROM `client` WHERE name = 'GSS SA');
SET @cca         = (SELECT id FROM `client` WHERE name LIKE 'Crédit Communautaire%');
SET @cbc         = (SELECT id FROM `client` WHERE name LIKE 'Commercial Bank%');
SET @afriassure  = (SELECT id FROM `client` WHERE name = 'AFRIASSURE');
SET @afrilife    = (SELECT id FROM `client` WHERE name = 'AFRILIFE');
SET @street      = (SELECT id FROM `client` WHERE name = 'Street Chicken');
SET @lmc         = (SELECT id FROM `client` WHERE name = 'LMC');
SET @noe         = (SELECT id FROM `client` WHERE name = 'Résidence NOE');

-- ============================================================
-- 2. SITES (26 sites — Zone 1 : 11 | Zone 2 : 15)
-- Coordonnées GPS laissées à NULL quand non disponibles en ligne.
-- ============================================================

-- ── ZONE 1 ──────────────────────────────────────────────────
-- site id 1
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@gss,   'Base GSS Logpom',            'Logpom, Douala',                        4.08362,   9.77284,  'DLA-Z1-GSS-01',  'OFFICE',      100, 1, @now, @now);
-- site id 2
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA Logpom',                 'Logpom, Douala',                        4.08362,   9.77284,  'DLA-Z1-CCA-14',  'BANK',        100, 1, @now, @now);
-- site id 3
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA Bonamoussadi 1',         'Bonamoussadi, Douala',                  4.08645,   9.74366,  'DLA-Z1-CCA-03',  'BANK',        100, 1, @now, @now);
-- site id 4
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA Bonamoussadi 2',         'Carrefour Macon, Douala',               4.08600,   9.74400,  'DLA-Z1-CCA-08',  'BANK',        100, 1, @now, @now);
-- site id 5
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA Bepanda',                'Carrefour Tonerre, Bepanda, Douala',    NULL,      NULL,     'DLA-Z1-CCA-06',  'BANK',        100, 1, @now, @now);
-- site id 6
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA Deido',                  'Deido, Douala',                         4.05001,   9.76974,  'DLA-Z1-CCA-05',  'BANK',        100, 1, @now, @now);
-- site id 7
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA Bonaberi',               'Bonaberi, Douala',                      4.07769,   9.65084,  'DLA-Z1-CCA-04',  'BANK',        100, 1, @now, @now);
-- site id 8
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA Ndokotti',               'Face SNEC, Ndokotti, Douala',           NULL,      NULL,     'DLA-Z1-CCA-07',  'BANK',        100, 1, @now, @now);
-- site id 9
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA Mboppi',                 'Entrée Fripperie, Mboppi, Douala',      4.04833,   9.71960,  'DLA-Z1-CCA-10',  'BANK',        100, 1, @now, @now);
-- site id 10
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cbc,   'CBC Makepe',                 'Makepe, Douala',                        NULL,      NULL,     'DLA-Z1-CBC-04',  'BANK',        100, 1, @now, @now);
-- site id 11
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@street,'Street Chicken',             'Ange Raphael, Douala',                  NULL,      NULL,     'DLA-Z1-SCK-01',  'RESTAURANT',  100, 1, @now, @now);

-- ── ZONE 2 ──────────────────────────────────────────────────
-- site id 12
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA Siège Bonanjo',          'Avenue de Gaulle, Bonanjo, Douala',     4.04410,   9.69440,  'DLA-Z2-CCA-01A', 'BANK',        150, 1, @now, @now);
-- site id 13
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA Agence Bonanjo Échangeur','Échangeur Bonanjo, Douala',            4.04300,   9.69300,  'DLA-Z2-CCA-01B', 'BANK',        100, 1, @now, @now);
-- site id 14
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA Liberté',                'Akwa, Douala',                          4.04683,   9.69701,  'DLA-Z2-CCA-09',  'BANK',        100, 1, @now, @now);
-- site id 15
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@lmc,   'LMC Magasin Port',           'Zone Portuaire, Douala',                4.04080,   9.71060,  'DLA-Z2-LMC-01',  'STORAGE',     150, 1, @now, @now);
-- site id 16
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cbc,   'CBC Agence VIP',             'Bonapriso, Douala',                     4.04990,   9.69500,  'DLA-Z2-CBC-01',  'BANK',        100, 1, @now, @now);
-- site id 17
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@afriassure,'AFRIASSURE',             'Akwa, Douala',                          NULL,      NULL,     'DLA-Z2-AFI-01',  'OFFICE',      100, 1, @now, @now);
-- site id 18
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@noe,   'Résidence NOE',              'Bonapriso, Douala',                     NULL,      NULL,     'DLA-Z2-NOE-01',  'RESIDENCE',   80,  1, @now, @now);
-- site id 19
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA New Bell',               'Shell New Bell, Douala',                4.03528,   9.72139,  'DLA-Z2-CCA-13',  'BANK',        100, 1, @now, @now);
-- site id 20
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cbc,   'Résidence DGA CBC',          'Bonadiwoto, Douala',                    NULL,      NULL,     'DLA-Z2-CBC-02',  'RESIDENCE',   80,  1, @now, @now);
-- site id 21
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cbc,   'CBC Grand Mall',             'Bonadiwoto, Douala',                    NULL,      NULL,     'DLA-Z2-CBC-03',  'COMMERCIAL',  150, 1, @now, @now);
-- site id 22
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA Dakar',                  'Rond Point Dakar, Douala',              NULL,      NULL,     'DLA-Z2-CCA-02',  'BANK',        100, 1, @now, @now);
-- site id 23
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'Résidence DG CCA',           'Bonadiwoto, Douala',                    NULL,      NULL,     'DLA-Z2-CCA-15',  'RESIDENCE',   80,  1, @now, @now);
-- site id 24
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@afrilife,'Agence AFRILIFE',          'Bonapriso, Douala',                     NULL,      NULL,     'DLA-Z2-AFL-01',  'OFFICE',      100, 1, @now, @now);
-- site id 25
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@afrilife,'Résidence DGA AFRILIFE',   'Akwa, Douala',                          NULL,      NULL,     'DLA-Z2-AFL-02',  'RESIDENCE',   80,  1, @now, @now);
-- site id 26
INSERT INTO `site` (client_id, name, address, latitude, longitude, qr_code, type, geofencing_radius, is_active, created_at, updated_at) VALUES
(@cca,   'CCA Congo',                  'Marché Congo, Douala',                  4.04225,   9.70124,  'DLA-Z2-CCA-16',  'BANK',        100, 1, @now, @now);

-- Références sites
SET @s_base_gss  = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z1-GSS-01');
SET @s_cca_lpom  = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z1-CCA-14');
SET @s_sadi1     = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z1-CCA-03');
SET @s_sadi2     = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z1-CCA-08');
SET @s_bepanda   = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z1-CCA-06');
SET @s_deido     = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z1-CCA-05');
SET @s_bonaberi  = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z1-CCA-04');
SET @s_ndokotti  = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z1-CCA-07');
SET @s_mboppi    = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z1-CCA-10');
SET @s_cbc_mke   = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z1-CBC-04');
SET @s_street    = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z1-SCK-01');
SET @s_siege     = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-CCA-01A');
SET @s_echang    = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-CCA-01B');
SET @s_liberte   = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-CCA-09');
SET @s_lmc       = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-LMC-01');
SET @s_cbc_vip   = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-CBC-01');
SET @s_afriassure= (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-AFI-01');
SET @s_noe       = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-NOE-01');
SET @s_newbell   = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-CCA-13');
SET @s_res_dgacbc= (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-CBC-02');
SET @s_grandmall = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-CBC-03');
SET @s_dakar     = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-CCA-02');
SET @s_res_dgcca = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-CCA-15');
SET @s_afrilife  = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-AFL-01');
SET @s_res_dgafl = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-AFL-02');
SET @s_congo     = (SELECT id FROM `site` WHERE qr_code = 'DLA-Z2-CCA-16');

-- ============================================================
-- 3. AGENTS  (90 agents — email format: prenom.nom@gss.cm)
--    role = 'AGENT' | is_active = 1 | hourly_rate = 1200.00
-- ============================================================
-- Colonnes: email, password, first_name, last_name, role, phone, hourly_rate, is_active, created_at, updated_at

-- ── ZONE 1 ── BASE GSS LOGPOM ─────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('ezekiel.djerada@gss.cm',             @pwd,'EZEKIEL',           'DJERADA',             'AGENT',NULL,    1200.00,1,@now,@now),
('crepin.bassas@gss.cm',               @pwd,'CREPIN ARSENE',     'BASSAS KOLDJOB',       'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 1 ── CCA BONAMOUSSADI 2 (SADI 2) ─────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('kare.netoke@gss.cm',                 @pwd,'KARE',              'NETOKE',               'AGENT',NULL,    1200.00,1,@now,@now),
('abel.dambissou@gss.cm',              @pwd,'ABEL',              'DAMBISSOU',            'AGENT',NULL,    1200.00,1,@now,@now),
('winamsou.bousouna@gss.cm',           @pwd,'WINAMSOU MARCEL',   'BOUSOUNA',             'AGENT',NULL,    1200.00,1,@now,@now),
('etienne.djaoro@gss.cm',             @pwd,'ETIENNE',           'DJAORO',               'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 1 ── CCA BONABERI ────────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('daikissam.wangba@gss.cm',            @pwd,'DAIKISSAM',         'WANGBA',               'AGENT',NULL,    1200.00,1,@now,@now),
('kimbe@gss.cm',                       @pwd,NULL,                'KIMBE',                'AGENT',NULL,    1200.00,1,@now,@now),
('golkomou@gss.cm',                    @pwd,NULL,                'GOLKOMOU',             'AGENT',NULL,    1200.00,1,@now,@now),
('jeremie.djelardje@gss.cm',           @pwd,'JEREMIE',           'DJELARDJE',            'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 1 ── CCA DEIDO ───────────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('wang.namou@gss.cm',                  @pwd,NULL,                'WANG-NAMOU',           'AGENT',NULL,    1200.00,1,@now,@now),
('zalina@gss.cm',                      @pwd,NULL,                'ZALINA',               'AGENT',NULL,    1200.00,1,@now,@now),
('dodeoda@gss.cm',                     @pwd,NULL,                'DODEODA',              'AGENT',NULL,    1200.00,1,@now,@now),
('christophe.teese@gss.cm',            @pwd,'CHRISTOPHE',        'TEESE AMIDISAYNI',     'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 1 ── CCA BEPANDA ─────────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('alihou.periekue@gss.cm',             @pwd,'ALIHOU',            'PERIEKUE MBEHOU',      'AGENT',NULL,    1200.00,1,@now,@now),
('eloi.tchenemou@gss.cm',              @pwd,'ELOI',              'TCHENEMOU',            'AGENT',NULL,    1200.00,1,@now,@now),
('elie.alaona@gss.cm',                 @pwd,'ELIE',              'ALAONA',               'AGENT',NULL,    1200.00,1,@now,@now),  -- K9
('philemon.derelebaye@gss.cm',         @pwd,'PHILEMON',          'DERELEBAYE',           'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 1 ── CCA NDOKOTTI ────────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('jocelyn.bolo@gss.cm',                @pwd,'JOCELYN',           'BOLO',                 'AGENT','697718726',1200.00,1,@now,@now),
('jackson.nadjil@gss.cm',              @pwd,'JACKSON',           'NADJIL',               'AGENT',NULL,    1200.00,1,@now,@now),
('felix.djob@gss.cm',                  @pwd,'FELIX',             'DJOB LINGODI',         'AGENT',NULL,    1200.00,1,@now,@now),
('david.bayangbe@gss.cm',              @pwd,'DAVID',             'BAYANGBE',             'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 1 ── CCA BONAMOUSSADI 1 (SADI 1) ─────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('tchakassou.boina@gss.cm',            @pwd,'TCHAKASSOU',        'BOINA',                'AGENT',NULL,    1200.00,1,@now,@now),
('ndjigaoutong@gss.cm',                @pwd,NULL,                'NDJIGAOUTONG',         'AGENT',NULL,    1200.00,1,@now,@now),
('richard.bialo@gss.cm',               @pwd,'RICHARD',           'BIALO',                'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 1 ── CCA MBOPPI ──────────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('linamou@gss.cm',                     @pwd,NULL,                'LINAMOU',              'AGENT',NULL,    1200.00,1,@now,@now),
('gamlona@gss.cm',                     @pwd,NULL,                'GAMLONA',              'AGENT',NULL,    1200.00,1,@now,@now),
('mitna.atangana@gss.cm',              @pwd,'MITNA',             'ATANGANA',             'AGENT',NULL,    1200.00,1,@now,@now),
('mitna.gouna@gss.cm',                 @pwd,'MITNA',             'GOUNA',                'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 1 ── CCA LOGPOM (LOGPONG) ───────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('joseph.ndje@gss.cm',                 @pwd,'JOSEPH',            'NDJE BALEMA',          'AGENT',NULL,    1200.00,1,@now,@now),
('gregoire.belka@gss.cm',              @pwd,'GREGOIRE',          'BELKA',                'AGENT',NULL,    1200.00,1,@now,@now),
('ndjintoloum@gss.cm',                 @pwd,NULL,                'NDJINTOLOUM',          'AGENT',NULL,    1200.00,1,@now,@now),
('eric.dikissia@gss.cm',               @pwd,'ERIC',              'DIKISSIA DJASON',      'AGENT',NULL,    1200.00,1,@now,@now),
('ngalle.eyaye@gss.cm',                @pwd,'NGALLE',            'EYAYE',                'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 1 ── CBC MAKEPE ──────────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('orkemnoudi@gss.cm',                  @pwd,NULL,                'ORKEMNOUDI',           'AGENT',NULL,    1200.00,1,@now,@now),
('bernard.touko@gss.cm',               @pwd,'BERNARD',           'TOUKO',                'AGENT',NULL,    1200.00,1,@now,@now),
('jacob.lawang@gss.cm',                @pwd,'JACOB',             'LAWANG',               'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 1 ── STREET CHICKEN ──────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('napoleon.oum@gss.cm',                @pwd,'NAPOLEON',          'OUM',                  'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 2 ── CCA SIÈGE BONANJO (Gardes + Accueil + Voituriers) ──
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('saidou.aldjanato@gss.cm',            @pwd,'SAIDOU',            'ALDJANATO MALOMA',     'AGENT',NULL,    1200.00,1,@now,@now),
('bikom.belinga@gss.cm',               @pwd,'BIKOM',             'BELINGA',              'AGENT',NULL,    1200.00,1,@now,@now),
('kowe.djongbe@gss.cm',                @pwd,'KOWE',              'DJONGBE',              'AGENT',NULL,    1200.00,1,@now,@now),
('watdou.kosga@gss.cm',                @pwd,'WATDOU',            'KOSGA',                'AGENT','690521562',1200.00,1,@now,@now),
('kampete@gss.cm',                     @pwd,NULL,                'KAMPETE',              'AGENT',NULL,    1200.00,1,@now,@now),
('jeremie.guibola@gss.cm',             @pwd,'JEREMIE',           'GUIBOLA',              'AGENT',NULL,    1200.00,1,@now,@now),
('valery.guerendebo@gss.cm',           @pwd,'VALERY',            'GUERENDEBO',           'AGENT',NULL,    1200.00,1,@now,@now),
('raymond.ngana@gss.cm',               @pwd,'RAYMOND',           'NGANA',                'AGENT','695875947',1200.00,1,@now,@now),
('emerong.gama@gss.cm',                @pwd,'EMERONG',           'GAMA',                 'AGENT',NULL,    1200.00,1,@now,@now),
('jean.taiga@gss.cm',                  @pwd,'JEAN MARCK',        'TAIGA NDOUMBELE',      'AGENT',NULL,    1200.00,1,@now,@now),
('andre.mve@gss.cm',                   @pwd,'ANDRE MARIE',       'MVE',                  'AGENT',NULL,    1200.00,1,@now,@now),
-- Agents d'accueil (Siège Bonanjo)
('deborah.soffo@gss.cm',               @pwd,'DEBORAH',           'SOFFO SOFFO',          'AGENT',NULL,    1200.00,1,@now,@now),
('hilary.ngute@gss.cm',                @pwd,'HILARY',            'NGUTE',                'AGENT',NULL,    1200.00,1,@now,@now),
('verdiane.bekou@gss.cm',              @pwd,'VERDIANE',          'BEKOU TADJEUTEU',      'AGENT',NULL,    1200.00,1,@now,@now),
('milliard.bendang@gss.cm',            @pwd,'MILLIARD',          'BENDANG',              'AGENT',NULL,    1200.00,1,@now,@now),
('iric.tsahgadik@gss.cm',              @pwd,'IRIC',              'TSAHGADIK MEZATIO',    'AGENT',NULL,    1200.00,1,@now,@now),
('antoine.bieme@gss.cm',               @pwd,'ANTOINE',           'BIEME',                'AGENT',NULL,    1200.00,1,@now,@now),
-- Voituriers (Siège Bonanjo)
('boris.foalen@gss.cm',                @pwd,'BORIS',             'FOALEN FOALENG',       'AGENT',NULL,    1200.00,1,@now,@now),
('yves.sangala@gss.cm',                @pwd,'YVES',              'SANGALA',              'AGENT',NULL,    1200.00,1,@now,@now),
('justin.tiyou@gss.cm',                @pwd,'JUSTIN',            'TIYOU',                'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 2 ── LMC PORT ────────────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('biassou.yalla@gss.cm',               @pwd,'BIASSOU',           'YALLA',                'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 2 ── CCA DAKAR ───────────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('dangmo.mahamat@gss.cm',              @pwd,'DANGMO',            'MAHAMAT AMED',         'AGENT',NULL,    1200.00,1,@now,@now),
('bertrand.beninga@gss.cm',            @pwd,'BERTRAND',          'BENINGA',              'AGENT',NULL,    1200.00,1,@now,@now),
('naptali.biana@gss.cm',               @pwd,'NAPTALI',           'BIANA FAYA',           'AGENT','697234116',1200.00,1,@now,@now),
('ndildom@gss.cm',                     @pwd,NULL,                'NDILDOM',              'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 2 ── CCA LIBERTÉ ────────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('tiemnou.xavier@gss.cm',              @pwd,'TIEMNOU',           'XAVIER TELL',          'AGENT',NULL,    1200.00,1,@now,@now),
('ezekiel.badawe@gss.cm',              @pwd,'EZEKIEL',           'BADAWE DJONGWE',       'AGENT',NULL,    1200.00,1,@now,@now),
('maxime.bilim@gss.cm',                @pwd,'MAXIME',            'BILIM',                'AGENT',NULL,    1200.00,1,@now,@now),
('papin.lougou@gss.cm',                @pwd,'PAPIN',             'LOUGOU JOEL',          'AGENT',NULL,    1200.00,1,@now,@now),
('wangso@gss.cm',                      @pwd,NULL,                'WANGSO',               'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 2 ── CCA NEW BELL ────────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('evouna.bana@gss.cm',                 @pwd,'EVOUNA',            'BANA',                 'AGENT',NULL,    1200.00,1,@now,@now),
('laurant.bekou@gss.cm',               @pwd,'LAURANT',           'BEKOU',                'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 2 ── CCA CONGO ───────────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('wibaa.anenbaa@gss.cm',               @pwd,'WIBAA',             'ANENBAA DOURWADA',     'AGENT',NULL,    1200.00,1,@now,@now),
('golo.ratouandi@gss.cm',              @pwd,'GOLO',              'RATOUANDI',            'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 2 ── AFRIASSURE ──────────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('eugene.wahoum@gss.cm',               @pwd,'EUGENE',            'WAHOUM',               'AGENT',NULL,    1200.00,1,@now,@now),
('albert.houli@gss.cm',                @pwd,'ALBERT',            'HOULI',                'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 2 ── RÉSIDENCE NOE ───────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('victor.bourdeokamla@gss.cm',         @pwd,'VICTOR',            'BOURDEOKAMLA',         'AGENT',NULL,    1200.00,1,@now,@now),
('emmanuel.tchopyang@gss.cm',          @pwd,'EMMANUEL',          'TCHOPYANG',            'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 2 ── RÉSIDENCE DGA CBC ───────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('palassy.njifon@gss.cm',              @pwd,'PALASSY',           'NJIFON MFONDOUN',      'AGENT',NULL,    1200.00,1,@now,@now),
('achille.boulmo@gss.cm',              @pwd,'ACHILLE',           'BOULMO',               'AGENT',NULL,    1200.00,1,@now,@now),
('gabriel.golsou@gss.cm',              @pwd,'GABRIEL',           'GOLSOU',               'AGENT','695994938',1200.00,1,@now,@now),
('omer.hinimzina@gss.cm',              @pwd,'OMER',              'HINIMZINA KAMPETE',    'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 2 ── CBC AGENCE VIP ──────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('azao.alao@gss.cm',                   @pwd,'AZAO',              'ALAO',                 'AGENT','697615424',1200.00,1,@now,@now);

-- ── ZONE 2 ── CBC GRAND MALL ──────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('wanghou.daawe@gss.cm',               @pwd,'WANGHOU',           'DAAWE',                'AGENT',NULL,    1200.00,1,@now,@now),
('dominique.moudina@gss.cm',           @pwd,'DOMINIQUE',         'MOUDINA',              'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 2 ── RÉSIDENCE DG CCA ────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('mamoudou@gss.cm',                    @pwd,NULL,                'MAMOUDOU',             'AGENT',NULL,    1200.00,1,@now,@now),
('michel.depute@gss.cm',               @pwd,'MICHEL',            'DEPUTE',               'AGENT',NULL,    1200.00,1,@now,@now),
('alphonse.noudissou@gss.cm',          @pwd,'ALPHONSE',          'NOUDISSOU',            'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 2 ── AGENCE AFRILIFE ─────────────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('eloi.taiwa@gss.cm',                  @pwd,'ELOI',              'TAIWA',                'AGENT',NULL,    1200.00,1,@now,@now),
('jean.annoora@gss.cm',                @pwd,'JEAN',              'ANNOORA',              'AGENT',NULL,    1200.00,1,@now,@now);

-- ── ZONE 2 ── RÉSIDENCE DGA AFRILIFE ─────────────────────
INSERT INTO `user` (email,password,first_name,last_name,role,phone,hourly_rate,is_active,created_at,updated_at) VALUES
('bingwe@gss.cm',                      @pwd,NULL,                'BINGWE',               'AGENT',NULL,    1200.00,1,@now,@now),
('germain.sounlaouna@gss.cm',          @pwd,'GERMAIN',           'SOUNLAOUNA BOILO',     'AGENT',NULL,    1200.00,1,@now,@now);

-- ============================================================
-- 4. AFFECTATIONS  (status = ACTIVE, permanent = pas de end_date)
--    Le champ "notes" indique le poste (JOUR/NUIT) pour référence.
-- ============================================================

-- Helper : récupérer les IDs agents par email
-- (on crée une procédure inline via des variables)

-- ── BASE GSS ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='ezekiel.djerada@gss.cm'),     @s_base_gss,  'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='crepin.bassas@gss.cm'),        @s_base_gss,  'ACTIVE', @start, NULL, @now, @now);

-- ── CCA BONAMOUSSADI 2 (SADI 2) ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='kare.netoke@gss.cm'),          @s_sadi2, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='abel.dambissou@gss.cm'),        @s_sadi2, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='winamsou.bousouna@gss.cm'),     @s_sadi2, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='etienne.djaoro@gss.cm'),        @s_sadi2, 'ACTIVE', @start, NULL, @now, @now);

-- ── CCA BONABERI ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='daikissam.wangba@gss.cm'),      @s_bonaberi, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='kimbe@gss.cm'),                 @s_bonaberi, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='golkomou@gss.cm'),              @s_bonaberi, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='jeremie.djelardje@gss.cm'),     @s_bonaberi, 'ACTIVE', @start, NULL, @now, @now);

-- ── CCA DEIDO ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='wang.namou@gss.cm'),            @s_deido, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='zalina@gss.cm'),                @s_deido, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='dodeoda@gss.cm'),               @s_deido, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='christophe.teese@gss.cm'),      @s_deido, 'ACTIVE', @start, NULL, @now, @now);

-- ── CCA BEPANDA ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='alihou.periekue@gss.cm'),       @s_bepanda, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='eloi.tchenemou@gss.cm'),        @s_bepanda, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='elie.alaona@gss.cm'),           @s_bepanda, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='philemon.derelebaye@gss.cm'),   @s_bepanda, 'ACTIVE', @start, NULL, @now, @now);

-- ── CCA NDOKOTTI ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='jocelyn.bolo@gss.cm'),          @s_ndokotti, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='jackson.nadjil@gss.cm'),        @s_ndokotti, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='felix.djob@gss.cm'),            @s_ndokotti, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='david.bayangbe@gss.cm'),        @s_ndokotti, 'ACTIVE', @start, NULL, @now, @now);

-- ── CCA BONAMOUSSADI 1 (SADI 1) ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='tchakassou.boina@gss.cm'),      @s_sadi1, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='ndjigaoutong@gss.cm'),          @s_sadi1, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='richard.bialo@gss.cm'),         @s_sadi1, 'ACTIVE', @start, NULL, @now, @now);

-- ── CCA MBOPPI ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='linamou@gss.cm'),               @s_mboppi, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='gamlona@gss.cm'),               @s_mboppi, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='mitna.atangana@gss.cm'),        @s_mboppi, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='mitna.gouna@gss.cm'),           @s_mboppi, 'ACTIVE', @start, NULL, @now, @now);

-- ── CCA LOGPOM ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='joseph.ndje@gss.cm'),           @s_cca_lpom, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='gregoire.belka@gss.cm'),        @s_cca_lpom, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='ndjintoloum@gss.cm'),           @s_cca_lpom, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='eric.dikissia@gss.cm'),         @s_cca_lpom, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='ngalle.eyaye@gss.cm'),          @s_cca_lpom, 'ACTIVE', @start, NULL, @now, @now);

-- ── CBC MAKEPE ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='orkemnoudi@gss.cm'),            @s_cbc_mke, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='bernard.touko@gss.cm'),         @s_cbc_mke, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='jacob.lawang@gss.cm'),          @s_cbc_mke, 'ACTIVE', @start, NULL, @now, @now);

-- ── STREET CHICKEN ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='napoleon.oum@gss.cm'),          @s_street, 'ACTIVE', @start, NULL, @now, @now);

-- ── CCA SIÈGE BONANJO ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='saidou.aldjanato@gss.cm'),      @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='bikom.belinga@gss.cm'),         @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='kowe.djongbe@gss.cm'),          @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='watdou.kosga@gss.cm'),          @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='kampete@gss.cm'),               @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='jeremie.guibola@gss.cm'),       @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='valery.guerendebo@gss.cm'),     @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='raymond.ngana@gss.cm'),         @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='emerong.gama@gss.cm'),          @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='jean.taiga@gss.cm'),            @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='andre.mve@gss.cm'),             @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='deborah.soffo@gss.cm'),         @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='hilary.ngute@gss.cm'),          @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='verdiane.bekou@gss.cm'),        @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='milliard.bendang@gss.cm'),      @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='iric.tsahgadik@gss.cm'),        @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='antoine.bieme@gss.cm'),         @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='boris.foalen@gss.cm'),          @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='yves.sangala@gss.cm'),          @s_siege, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='justin.tiyou@gss.cm'),          @s_siege, 'ACTIVE', @start, NULL, @now, @now);

-- ── LMC PORT ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='biassou.yalla@gss.cm'),         @s_lmc, 'ACTIVE', @start, NULL, @now, @now);

-- ── CCA DAKAR ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='dangmo.mahamat@gss.cm'),        @s_dakar, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='bertrand.beninga@gss.cm'),      @s_dakar, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='naptali.biana@gss.cm'),         @s_dakar, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='ndildom@gss.cm'),               @s_dakar, 'ACTIVE', @start, NULL, @now, @now);

-- ── CCA LIBERTÉ ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='tiemnou.xavier@gss.cm'),        @s_liberte, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='ezekiel.badawe@gss.cm'),        @s_liberte, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='maxime.bilim@gss.cm'),          @s_liberte, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='papin.lougou@gss.cm'),          @s_liberte, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='wangso@gss.cm'),                @s_liberte, 'ACTIVE', @start, NULL, @now, @now);

-- ── CCA NEW BELL ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='evouna.bana@gss.cm'),           @s_newbell, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='laurant.bekou@gss.cm'),         @s_newbell, 'ACTIVE', @start, NULL, @now, @now);

-- ── CCA CONGO ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='wibaa.anenbaa@gss.cm'),         @s_congo, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='golo.ratouandi@gss.cm'),        @s_congo, 'ACTIVE', @start, NULL, @now, @now);

-- ── AFRIASSURE ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='eugene.wahoum@gss.cm'),         @s_afriassure, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='albert.houli@gss.cm'),          @s_afriassure, 'ACTIVE', @start, NULL, @now, @now);

-- ── RÉSIDENCE NOE ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='victor.bourdeokamla@gss.cm'),   @s_noe, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='emmanuel.tchopyang@gss.cm'),    @s_noe, 'ACTIVE', @start, NULL, @now, @now);

-- ── RÉSIDENCE DGA CBC ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='palassy.njifon@gss.cm'),        @s_res_dgacbc, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='achille.boulmo@gss.cm'),        @s_res_dgacbc, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='gabriel.golsou@gss.cm'),        @s_res_dgacbc, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='omer.hinimzina@gss.cm'),        @s_res_dgacbc, 'ACTIVE', @start, NULL, @now, @now);

-- ── CBC VIP ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='azao.alao@gss.cm'),             @s_cbc_vip, 'ACTIVE', @start, NULL, @now, @now);

-- ── CBC GRAND MALL ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='wanghou.daawe@gss.cm'),         @s_grandmall, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='dominique.moudina@gss.cm'),     @s_grandmall, 'ACTIVE', @start, NULL, @now, @now);

-- ── RÉSIDENCE DG CCA ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='mamoudou@gss.cm'),              @s_res_dgcca, 'ACTIVE', '2026-03-30', NULL, @now, @now),
((SELECT id FROM `user` WHERE email='michel.depute@gss.cm'),         @s_res_dgcca, 'ACTIVE', '2026-03-30', NULL, @now, @now),
((SELECT id FROM `user` WHERE email='alphonse.noudissou@gss.cm'),    @s_res_dgcca, 'ACTIVE', '2026-03-30', NULL, @now, @now);

-- ── AGENCE AFRILIFE ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='eloi.taiwa@gss.cm'),            @s_afrilife, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='jean.annoora@gss.cm'),          @s_afrilife, 'ACTIVE', @start, NULL, @now, @now);

-- ── RÉSIDENCE DGA AFRILIFE ──
INSERT INTO `assignment` (agent_id, site_id, status, start_date, end_date, created_at, updated_at) VALUES
((SELECT id FROM `user` WHERE email='bingwe@gss.cm'),                @s_res_dgafl, 'ACTIVE', @start, NULL, @now, @now),
((SELECT id FROM `user` WHERE email='germain.sounlaouna@gss.cm'),    @s_res_dgafl, 'ACTIVE', @start, NULL, @now, @now);

-- ============================================================
-- NOTE: Le site "CCA Agence Bonanjo Échangeur" (id: @s_echang)
-- est créé mais sans agents affectés pour l'instant — les agents
-- du Siège sont à répartir manuellement entre les deux sites.
-- ============================================================

COMMIT;

-- ================================================================
-- RÉSUMÉ
-- ================================================================
-- Clients   :  8
-- Sites     : 26  (Zone 1: 11 | Zone 2: 15)
-- Agents    : 90  (Zone 1: 38 | Zone 2: 52)
-- Affectations: 90 (toutes ACTIVE, permanentes)
-- ================================================================
-- APRÈS IMPORT — ACTIONS REQUISES :
--   1. Générer un vrai hash de mot de passe :
--      php bin/console security:hash-password password123
--      UPDATE `user` SET password = '<hash>' WHERE role = 'AGENT';
--   2. Renseigner les coordonnées GPS manquantes via l'interface admin.
--   3. Répartir les agents du Siège CCA entre les 2 sites Bonanjo.
--   4. Vérifier les emails (format prenom.nom@gss.cm = provisoire).
--   5. Ajouter le SIRET/numéro de contrat de chaque client.
-- ================================================================
