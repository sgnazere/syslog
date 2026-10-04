const { query, withTransaction } = require('../config/database');
const { HttpError } = require('../utils/httpError');
const wa     = require('../services/whatsapp.service');
const notify = require('../services/notifications.service');

const REQ_FIELDS = `
  dd.id, dd.employe_id, dd.commune_id, dd.date_deplacement,
  dd.heure_depart, dd.heure_retour, dd.objectif, dd.statut,
  dd.chauffeur_id, dd.vehicule_id, dd.date_creation, dd.date_modification,
  dd.km_depart, dd.km_retour, dd.date_retour_effective, dd.motif_refus,
  e.nom   AS employe_nom,   e.prenoms AS employe_prenoms,
  e.poste AS employe_poste, e.projet  AS employe_projet,
  c.nom   AS commune_nom,
  v.immatriculation, v.marque, v.modele, v.capacite AS vehicule_capacite,
  ch.nom AS chauffeur_nom, ch.prenoms AS chauffeur_prenoms, ch.telephone AS chauffeur_tel
`;

const REQ_JOINS = `
  FROM demande_deplacement dd
  JOIN employees  e  ON e.id  = dd.employe_id
  JOIN communes   c  ON c.id  = dd.commune_id
  LEFT JOIN vehicules  v  ON v.id  = dd.vehicule_id
  LEFT JOIN chauffeurs ch ON ch.id = dd.chauffeur_id
`;

// ── Contrôle d'accès ─────────────────────────────────────────
// Un « user » ne voit que les demandes dont il est l'initiateur ou un passager.
const visibilityClause = (user, params) => {
  if (user.role !== 'user') return '';
  params.push(user.employee_id || 0); // compte non lié à une fiche : aucune demande visible
  const n = params.length;
  return ` AND (dd.employe_id = $${n} OR EXISTS (
             SELECT 1 FROM demande_passagers dp WHERE dp.demande_id = dd.id AND dp.employe_id = $${n}))`;
};

// ── Enrichissement : passagers et communes de chaque demande ──
const enrich = async (rows) => {
  if (!rows.length) return [];
  const ids = rows.map(r => r.id);
  const [passagers, communes] = await Promise.all([
    query(
      `SELECT dp.demande_id, e.id, e.nom, e.prenoms, e.poste, e.projet,
              e.prenoms || ' ' || e.nom AS name
       FROM demande_passagers dp JOIN employees e ON e.id = dp.employe_id
       WHERE dp.demande_id = ANY($1::int[])`, [ids]),
    query(
      `SELECT dc.demande_id, c.id, c.nom
       FROM demande_communes dc JOIN communes c ON c.id = dc.commune_id
       WHERE dc.demande_id = ANY($1::int[])
       ORDER BY dc.ordre, c.nom`, [ids]),
  ]);
  return rows.map(r => {
    const reqCommunes = communes.rows.filter(c => c.demande_id === r.id).map(({ id, nom }) => ({ id, nom }));
    return {
      ...r,
      employe_name:   `${r.employe_prenoms} ${r.employe_nom}`,
      chauffeur_name: r.chauffeur_nom ? `${r.chauffeur_prenoms} ${r.chauffeur_nom}` : null,
      passagers:      passagers.rows.filter(p => p.demande_id === r.id),
      communes:       reqCommunes.length ? reqCommunes : [{ id: r.commune_id, nom: r.commune_nom }],
    };
  });
};

/** GET /api/requests */
const getAll = async (req, res, next) => {
  try {
    const { statut, commune_id, from, to, employe_id } = req.query;
    const params = [];
    let sql = `SELECT ${REQ_FIELDS} ${REQ_JOINS} WHERE 1=1`;
    sql += visibilityClause(req.user, params);

    if (employe_id) { params.push(employe_id); sql += ` AND dd.employe_id = $${params.length}`; }
    if (statut)     { params.push(statut);     sql += ` AND dd.statut = $${params.length}`; }
    if (commune_id) {
      params.push(commune_id);
      sql += ` AND EXISTS (SELECT 1 FROM demande_communes dc WHERE dc.demande_id = dd.id AND dc.commune_id = $${params.length})`;
    }
    if (from) { params.push(from); sql += ` AND dd.date_deplacement >= $${params.length}`; }
    if (to)   { params.push(to);   sql += ` AND dd.date_deplacement <= $${params.length}`; }
    sql += ' ORDER BY dd.date_creation DESC';

    const result = await query(sql, params);
    res.json({ data: await enrich(result.rows), total: result.rowCount });
  } catch (err) { next(err); }
};

/**
 * GET /api/requests/pending-actions — actions attendues d'un manager ou administrateur :
 * demandes à valider, et missions validées dont la date est arrivée, à clôturer.
 */
const pendingActions = async (req, res, next) => {
  try {
    const r = await query(`
      SELECT COUNT(*) FILTER (WHERE statut = 'en_attente')::int AS a_valider,
             COUNT(*) FILTER (WHERE statut = 'validee' AND date_deplacement <= CURRENT_DATE)::int AS a_cloturer
      FROM demande_deplacement`);
    const { a_valider, a_cloturer } = r.rows[0];
    res.json({ data: { a_valider, a_cloturer, total: a_valider + a_cloturer } });
  } catch (err) { next(err); }
};

/** GET /api/requests/:id */
const getById = async (req, res, next) => {
  try {
    const params = [req.params.id];
    const sql = `SELECT ${REQ_FIELDS} ${REQ_JOINS} WHERE dd.id = $1` + visibilityClause(req.user, params);
    const r = await query(sql, params);
    if (!r.rows[0]) return res.status(404).json({ error: 'Demande introuvable.' });
    const [data] = await enrich(r.rows);
    res.json({ data });
  } catch (err) { next(err); }
};

/** POST /api/requests — une demande peut viser plusieurs communes */
const create = async (req, res, next) => {
  try {
    const { date_deplacement, heure_depart, heure_retour } = req.body;
    const objectif = req.body.objectif.trim();
    const communeIds = [...new Set(req.body.commune_ids)];

    // Un utilisateur simple ne peut créer une demande que pour lui-même
    let employeId = req.body.employe_id;
    if (req.user.role === 'user') {
      if (!req.user.employee_id)
        return res.status(403).json({ error: 'Votre compte n\'est lié à aucune fiche employé. Contactez un administrateur.' });
      employeId = req.user.employee_id;
    }
    const passagerIds = [...new Set(req.body.passager_ids || [])].filter(id => id !== employeId);

    if (heure_retour <= heure_depart)
      return res.status(422).json({ error: 'L\'heure de retour doit être après l\'heure de départ.' });

    const newId = await withTransaction(async (client) => {
      const people = await client.query(
        `SELECT id FROM employees WHERE id = ANY($1::int[]) AND status = 'actif'`,
        [[employeId, ...passagerIds]]
      );
      if (people.rowCount !== 1 + passagerIds.length)
        throw new HttpError(422, 'L\'initiateur et les passagers doivent être des employés actifs.');

      const inserted = await client.query(
        `INSERT INTO demande_deplacement
           (employe_id, commune_id, date_deplacement, heure_depart, heure_retour, objectif)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [employeId, communeIds[0], date_deplacement, heure_depart, heure_retour, objectif]
      );
      const id = inserted.rows[0].id;
      await client.query(
        `INSERT INTO demande_communes (demande_id, commune_id, ordre)
         SELECT $1, c, o FROM unnest($2::int[]) WITH ORDINALITY AS t(c, o)`,
        [id, communeIds]
      );
      if (passagerIds.length) {
        await client.query(
          `INSERT INTO demande_passagers (demande_id, employe_id) SELECT $1, unnest($2::int[])`,
          [id, passagerIds]
        );
      }
      return id;
    });

    const totalPersonnes = 1 + passagerIds.length;

    // Suggestions de regroupement : même date, au moins une commune commune
    const similar = await query(
      `SELECT dd.id, e.prenoms || ' ' || e.nom AS employe_name, dd.heure_depart, dd.heure_retour,
              (SELECT COUNT(*) FROM demande_passagers WHERE demande_id = dd.id) + 1 AS total_personnes
       FROM demande_deplacement dd
       JOIN employees e ON e.id = dd.employe_id
       WHERE dd.date_deplacement = $1 AND dd.statut IN ('en_attente', 'validee') AND dd.id != $2
         AND EXISTS (SELECT 1 FROM demande_communes dc WHERE dc.demande_id = dd.id AND dc.commune_id = ANY($3::int[]))`,
      [date_deplacement, newId, communeIds]
    );

    let vehiculeSuggestion = null;
    if (similar.rows.length) {
      const totalGroupe = similar.rows.reduce((sum, r) => sum + parseInt(r.total_personnes, 10), totalPersonnes);
      const veh = await query(
        `SELECT id, marque, modele, immatriculation, capacite FROM vehicules
         WHERE statut = 'disponible' AND capacite >= $1 ORDER BY capacite ASC LIMIT 1`,
        [totalGroupe]
      );
      vehiculeSuggestion = veh.rows[0] || null;
    }

    notify.fireAndForget('nouvelle demande', async () => {
      await notify.notifyUsers(await notify.managerUserIds(), {
        title: 'Nouvelle demande de sortie',
        message: `${req.user.name} a soumis une demande pour le ${wa.formatDate(date_deplacement, {})}.`,
        requestId: newId,
      }, req.user.id);
    });

    res.status(201).json({
      data: { id: newId, total_personnes: totalPersonnes },
      message: 'Demande créée avec succès.',
      groupingSuggestions: similar.rows,
      vehiculeSuggestion,
    });
  } catch (err) { next(err); }
};

// Données nécessaires aux notifications d'une demande
const loadNotificationContext = async (demandeId) => {
  const [dem, pass, comm] = await Promise.all([
    query(
      `SELECT dd.id, dd.employe_id, dd.date_deplacement, dd.heure_depart,
              e.prenoms || ' ' || e.nom AS employe_name, e.telephone,
              v.marque || ' ' || v.modele || ' — ' || v.immatriculation AS vehicule_label,
              ch.prenoms || ' ' || ch.nom AS chauffeur_nom, ch.telephone AS chauffeur_tel
       FROM demande_deplacement dd
       JOIN employees e ON e.id = dd.employe_id
       LEFT JOIN vehicules v ON v.id = dd.vehicule_id
       LEFT JOIN chauffeurs ch ON ch.id = dd.chauffeur_id
       WHERE dd.id = $1`, [demandeId]),
    query(
      `SELECT e.id, e.prenoms || ' ' || e.nom AS name, e.telephone
       FROM demande_passagers dp JOIN employees e ON e.id = dp.employe_id
       WHERE dp.demande_id = $1`, [demandeId]),
    query(
      `SELECT c.nom FROM demande_communes dc JOIN communes c ON c.id = dc.commune_id
       WHERE dc.demande_id = $1 ORDER BY dc.ordre`, [demandeId]),
  ]);
  const d = dem.rows[0];
  const communes = comm.rows.map(r => r.nom);
  const userIds = await notify.userIdsForEmployees([d.employe_id, ...pass.rows.map(p => p.id)]);
  return { d, passagers: pass.rows, communes, userIds, dateLabel: wa.formatDate(d.date_deplacement, {}) };
};

/** PATCH /api/requests/:id/validate */
const validate = async (req, res, next) => {
  try {
    const vehiculeId  = req.body.vehicule_id  || null;
    const chauffeurId = req.body.chauffeur_id || null;

    const updated = await withTransaction(async (client) => {
      const cur = (await client.query(
        `SELECT id, statut, date_deplacement,
                (SELECT COUNT(*) FROM demande_passagers WHERE demande_id = $1) + 1 AS total
         FROM demande_deplacement WHERE id = $1 FOR UPDATE`, [req.params.id]
      )).rows[0];
      if (!cur) throw new HttpError(404, 'Demande introuvable.');
      if (cur.statut !== 'en_attente') throw new HttpError(409, 'Cette demande a déjà été traitée.');

      if (vehiculeId) {
        const v = (await client.query(`SELECT statut, capacite FROM vehicules WHERE id = $1 FOR UPDATE`, [vehiculeId])).rows[0];
        if (!v || v.statut !== 'disponible') throw new HttpError(409, 'Véhicule non disponible.');
        if (parseInt(cur.total, 10) > v.capacite)
          throw new HttpError(409, `Capacité insuffisante : ${cur.total} personnes pour ${v.capacite} places.`);
      }
      if (chauffeurId) {
        const ch = (await client.query(
          `SELECT statut, date_expiration_permis < $2::date AS permis_expire FROM chauffeurs WHERE id = $1 FOR UPDATE`,
          [chauffeurId, cur.date_deplacement]
        )).rows[0];
        if (!ch || ch.statut !== 'disponible') throw new HttpError(409, 'Chauffeur non disponible.');
        if (ch.permis_expire) throw new HttpError(409, 'Le permis de ce chauffeur sera expiré à la date de la mission.');
      }

      const r = await client.query(
        `UPDATE demande_deplacement SET statut = 'validee', vehicule_id = $1, chauffeur_id = $2
         WHERE id = $3 RETURNING *`,
        [vehiculeId, chauffeurId, req.params.id]
      );
      if (vehiculeId)  await client.query(`UPDATE vehicules  SET statut = 'en_mission' WHERE id = $1`, [vehiculeId]);
      if (chauffeurId) await client.query(`UPDATE chauffeurs SET statut = 'en_mission' WHERE id = $1`, [chauffeurId]);
      return r.rows[0];
    });

    notify.fireAndForget('validation', async () => {
      const ctx = await loadNotificationContext(updated.id);
      await notify.notifyUsers(ctx.userIds, {
        title: 'Demande validée',
        message: `Votre sortie du ${ctx.dateLabel} vers ${ctx.communes.join(', ')} est validée.`
          + (ctx.d.vehicule_label ? ` Véhicule : ${ctx.d.vehicule_label}.` : '')
          + (ctx.d.chauffeur_nom ? ` Chauffeur : ${ctx.d.chauffeur_nom}.` : ''),
        type: 'success', requestId: updated.id,
      });
      await wa.notifyDemandeValidee({
        employe_name: ctx.d.employe_name, telephone: ctx.d.telephone, communes: ctx.communes,
        date: ctx.d.date_deplacement, vehicule: ctx.d.vehicule_label,
        chauffeur: ctx.d.chauffeur_nom ? { nom: ctx.d.chauffeur_nom, telephone: ctx.d.chauffeur_tel } : null,
        passagers: ctx.passagers,
      });
      if (ctx.d.chauffeur_tel) {
        await wa.notifyChauffeurMission({
          chauffeur_nom: ctx.d.chauffeur_nom, telephone: ctx.d.chauffeur_tel, date: ctx.d.date_deplacement,
          communes: ctx.communes, heure_depart: ctx.d.heure_depart?.slice(0, 5), contact_initiateur: ctx.d.telephone,
        });
      }
    });

    res.json({ data: updated, message: 'Demande validée.' });
  } catch (err) { next(err); }
};

/** PATCH /api/requests/:id/reject — possible pour une demande en attente ou validée */
const reject = async (req, res, next) => {
  try {
    const reason = req.body.reason.trim();
    const updated = await withTransaction(async (client) => {
      const cur = (await client.query(
        `SELECT statut, vehicule_id, chauffeur_id FROM demande_deplacement WHERE id = $1 FOR UPDATE`,
        [req.params.id]
      )).rows[0];
      if (!cur) throw new HttpError(404, 'Demande introuvable.');
      if (!['en_attente', 'validee'].includes(cur.statut))
        throw new HttpError(409, cur.statut === 'refusee' ? 'Demande déjà refusée.' : 'Une mission terminée ne peut pas être refusée.');

      const r = await client.query(
        `UPDATE demande_deplacement SET statut = 'refusee', vehicule_id = NULL, chauffeur_id = NULL, motif_refus = $2
         WHERE id = $1 RETURNING *`, [req.params.id, reason]
      );
      if (cur.statut === 'validee') {
        if (cur.vehicule_id)  await client.query(`UPDATE vehicules  SET statut = 'disponible' WHERE id = $1 AND statut = 'en_mission'`, [cur.vehicule_id]);
        if (cur.chauffeur_id) await client.query(`UPDATE chauffeurs SET statut = 'disponible' WHERE id = $1 AND statut = 'en_mission'`, [cur.chauffeur_id]);
      }
      return r.rows[0];
    });

    notify.fireAndForget('refus', async () => {
      const ctx = await loadNotificationContext(updated.id);
      await notify.notifyUsers(ctx.userIds, {
        title: 'Demande refusée',
        message: `Votre sortie du ${ctx.dateLabel} vers ${ctx.communes.join(', ')} a été refusée. Motif : ${reason}`,
        type: 'error', requestId: updated.id,
      });
      await wa.notifyDemandeRefusee({
        employe_name: ctx.d.employe_name, telephone: ctx.d.telephone, communes: ctx.communes,
        date: ctx.d.date_deplacement, motif: reason,
      });
    });

    res.json({ data: updated, message: 'Demande refusée.' });
  } catch (err) { next(err); }
};

/** PATCH /api/requests/:id/complete — clôture avec kilométrage */
const complete = async (req, res, next) => {
  try {
    const kmDepart = req.body.km_depart ?? null;
    const kmRetour = req.body.km_retour ?? null;
    if (kmDepart !== null && kmRetour !== null && kmRetour < kmDepart)
      return res.status(422).json({ error: 'Le kilométrage de retour doit être supérieur au kilométrage de départ.' });

    const updated = await withTransaction(async (client) => {
      const dd = (await client.query(
        `SELECT dd.id, dd.statut, dd.vehicule_id, dd.chauffeur_id, v.kilometrage AS km_vehicule
         FROM demande_deplacement dd LEFT JOIN vehicules v ON v.id = dd.vehicule_id
         WHERE dd.id = $1 FOR UPDATE OF dd`, [req.params.id]
      )).rows[0];
      if (!dd) throw new HttpError(404, 'Demande introuvable.');
      if (dd.statut !== 'validee') throw new HttpError(409, 'Seules les demandes validées peuvent être clôturées.');
      if (kmRetour !== null && dd.km_vehicule !== null && kmRetour < dd.km_vehicule)
        throw new HttpError(422, `Le kilométrage de retour ne peut pas être inférieur au compteur actuel du véhicule (${dd.km_vehicule} km).`);

      const r = await client.query(
        `UPDATE demande_deplacement
         SET statut = 'terminee', km_depart = $1, km_retour = $2,
             date_retour_effective = CURRENT_DATE, heure_retour_reel = CURRENT_TIME
         WHERE id = $3 RETURNING *`,
        [kmDepart, kmRetour, req.params.id]
      );
      if (dd.vehicule_id) {
        await client.query(
          `UPDATE vehicules
           SET statut = CASE WHEN statut = 'en_mission' THEN 'disponible'::vehicule_statut ELSE statut END,
               kilometrage = COALESCE($1, kilometrage)
           WHERE id = $2`,
          [kmRetour, dd.vehicule_id]
        );
      }
      if (dd.chauffeur_id) {
        await client.query(`UPDATE chauffeurs SET statut = 'disponible' WHERE id = $1 AND statut = 'en_mission'`, [dd.chauffeur_id]);
      }
      return r.rows[0];
    });

    const distance = kmDepart !== null && kmRetour !== null ? kmRetour - kmDepart : null;

    notify.fireAndForget('clôture', async () => {
      const ctx = await loadNotificationContext(updated.id);
      await notify.notifyUsers(ctx.userIds, {
        title: 'Mission clôturée',
        message: `Votre mission du ${ctx.dateLabel} est clôturée${distance !== null ? ` (${distance} km)` : ''}.`,
        type: 'info', requestId: updated.id,
      });
      await wa.notifyMissionCloturee({
        employe_name: ctx.d.employe_name, telephone: ctx.d.telephone, communes: ctx.communes,
        date: ctx.d.date_deplacement, distance,
      });
    });

    res.json({ data: updated, distance, message: 'Mission clôturée avec succès.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, pendingActions, create, validate, reject, complete };
